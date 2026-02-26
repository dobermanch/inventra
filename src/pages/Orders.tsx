import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Autocomplete,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import {
  IconPlus as Add,
  IconTrash as Delete,
  IconCircleCheck as CheckCircle,
  IconTruck as LocalShipping,
  IconCircleX as Cancel,
  IconArrowBackUp as Undo,
  IconEdit as Edit,
  IconSearch as Search,
  IconCloudUpload as CloudUpload,
  IconDownload as Download,
  IconX as Close,
  IconFileImport as FileImport,
  IconFileDownload as FileDownload,
} from "@tabler/icons-react";
import { useLanguage } from "../context/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import ExcelImportDialog from "../components/ExcelImportDialog";
import {
  OrderStatus,
  ORDER_STATUSES,
  STATUS_TRANSLATION_KEY,
  getStatusColor,
} from "../types/orderStatus";

export default function Orders() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = () => {
    const a = document.createElement("a");
    a.href = "/api/export/orders";
    a.download = "orders.xlsx";
    a.click();
  };

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [groupBy, setGroupBy] = useState<
    "none" | "year" | "monthYear" | "status"
  >("none");

  const [newOrder, setNewOrder] = useState({
    id: null as number | null,
    customer_details: { name: "", phone: "", email: "", address: "" },
    status: OrderStatus.Active,
    discount: 0,
    notes: "",
    items: [] as any[],
  });

  const [formErrors, setFormErrors] = useState({
    name: false,
    phone: false,
    address: false,
  });
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; name: string }[]
  >([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [existingAttachmentErrors, setExistingAttachmentErrors] = useState<
    Set<number>
  >(new Set());
  const [selectedFileErrors, setSelectedFileErrors] = useState<Set<number>>(
    new Set(),
  );

  const formatAttachmentName = (
    orderId: number | null,
    customerName: string,
    attName: string,
  ) => {
    return `${orderId}-${customerName}-${attName}`.replace(/\s+/g, "-");
  };

  const fetchOrders = () => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data));
  };

  const fetchInventory = () => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setInventory(data));
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({ file, name: file.name })),
    ]);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (window.confirm(t("areYouSureDelete"))) {
      await fetch(`/api/orders/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      setExistingAttachments((prev) =>
        prev.filter((att) => att.id !== attachmentId),
      );
      fetchOrders();
    }
  };

  const handleCreateOrder = async () => {
    const errors = {
      name: !newOrder.customer_details.name.trim(),
      phone: !newOrder.customer_details.phone.trim(),
      address: !newOrder.customer_details.address.trim(),
    };
    setFormErrors(errors);
    if (errors.name || errors.phone || errors.address) return;

    const badExisting = new Set(
      existingAttachments
        .map((att, i) => (!att.name.trim() ? i : -1))
        .filter((i) => i !== -1),
    );
    const badSelected = new Set(
      selectedFiles
        .map((sf, i) => (!sf.name.trim() ? i : -1))
        .filter((i) => i !== -1),
    );
    if (badExisting.size > 0 || badSelected.size > 0) {
      setExistingAttachmentErrors(badExisting);
      setSelectedFileErrors(badSelected);
      return;
    }

    const total = Math.max(
      0,
      newOrder.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      ) - newOrder.discount,
    );

    const formData = new FormData();
    formData.append("status", newOrder.status);
    formData.append(
      "customer_details",
      JSON.stringify(newOrder.customer_details),
    );
    formData.append("discount", newOrder.discount.toString());
    formData.append("total_amount", total.toString());
    formData.append("items", JSON.stringify(newOrder.items));
    formData.append("notes", newOrder.notes);
    selectedFiles.forEach((sf) => formData.append("attachments", sf.file));
    formData.append(
      "attachmentNames",
      JSON.stringify(selectedFiles.map((sf) => sf.name)),
    );
    formData.append("existingAttachments", JSON.stringify(existingAttachments));

    const url = newOrder.id ? `/api/orders/${newOrder.id}` : "/api/orders";
    const method = newOrder.id ? "PUT" : "POST";

    await fetch(url, { method, body: formData });
    setOpen(false);
    resetForm();
    fetchOrders();
    fetchInventory();
  };

  const resetForm = () => {
    setNewOrder({
      id: null,
      customer_details: { name: "", phone: "", email: "", address: "" },
      status: OrderStatus.Active,
      discount: 0,
      notes: "",
      items: [] as any[],
    });
    setFormErrors({ name: false, phone: false, address: false });
    setSelectedFiles([]);
    setExistingAttachments([]);
    setExistingAttachmentErrors(new Set());
    setSelectedFileErrors(new Set());
  };

  const handleEditClick = (order: any) => {
    const customer = JSON.parse(order.customer_details);
    setNewOrder({
      id: order.id,
      customer_details: {
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
      },
      status: order.status,
      discount: order.discount,
      notes: order.notes || "",
      items: order.items.map((item: any) => ({
        variant_id: item.variant_id || item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    });
    setExistingAttachments(order.attachments || []);
    setOpen(true);
  };

  const updateStatus = async (id: number, status: OrderStatus) => {
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
    fetchInventory();
  };

  // Flatten inventory for autocomplete
  const allVariants = inventory.flatMap((item) =>
    item.variants.map((v: any) => ({
      ...v,
      itemName: item.name,
      itemPrice: item.price || 0,
      label: `${item.name} - ${v.size} (${v.stock_count} in stock)`,
    })),
  );

  // Filtering
  const lowerSearch = searchText.toLowerCase();
  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (searchText.trim()) {
      const customer = JSON.parse(order.customer_details);
      const haystack = [
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        order.notes || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(lowerSearch)) return false;
    }
    return true;
  });

  // Grouping
  const getGroupKey = (order: any): string => {
    switch (groupBy) {
      case "year":
        return new Date(order.created_at).getFullYear().toString();
      case "monthYear": {
        const d = new Date(order.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      case "status":
        return order.status;
      default:
        return "";
    }
  };

  const formatGroupLabel = (key: string): string => {
    if (groupBy === "monthYear") {
      const [year, month] = key.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        undefined,
        { month: "long", year: "numeric" },
      );
    }
    if (groupBy === "status") {
      return t(STATUS_TRANSLATION_KEY[key as OrderStatus]);
    }
    return key;
  };

  const groupedOrders =
    groupBy !== "none"
      ? filteredOrders.reduce(
          (acc, curr) => {
            const key = getGroupKey(curr);
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
          },
          {} as Record<string, any[]>,
        )
      : null;

  const sortedGroupKeys = groupedOrders
    ? Object.keys(groupedOrders).sort((a, b) =>
        groupBy === "year" || groupBy === "monthYear"
          ? b.localeCompare(a)
          : a.localeCompare(b),
      )
    : [];

  const renderTableRows = (items: any[]) =>
    items.map((order) => (
      <TableRow key={order.id}>
        <TableCell>#{order.id}</TableCell>
        <TableCell>
          {JSON.parse(order.customer_details).name}
          <br />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", md: "block" } }}
          >
            {JSON.parse(order.customer_details).phone}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", md: "block" } }}
          >
            {JSON.parse(order.customer_details).email}
          </Typography>
          <Box sx={{ display: { xs: "block", md: "none" }, mt: 0.5 }}>
            <Chip
              label={t(STATUS_TRANSLATION_KEY[order.status as OrderStatus])}
              size="small"
              color={getStatusColor(order.status) as any}
            />
          </Box>
        </TableCell>
        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
          {order.items.map((item: any) => (
            <Typography key={item.id} variant="body2">
              {item.name} ({item.size}) x{item.quantity}
            </Typography>
          ))}
          {order.notes && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
            >
              {order.notes}
            </Typography>
          )}
        </TableCell>
        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
          <Chip
            label={t(STATUS_TRANSLATION_KEY[order.status as OrderStatus])}
            size="small"
            color={getStatusColor(order.status) as any}
          />
        </TableCell>
        <TableCell align="right">
          <Tooltip title={t("editOrder")}>
            <IconButton size="small" onClick={() => handleEditClick(order)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {order.status === OrderStatus.Active && (
            <Tooltip title={t("markAsShipped")}>
              <IconButton
                size="small"
                color="info"
                onClick={() => updateStatus(order.id, OrderStatus.Shipped)}
              >
                <LocalShipping />
              </IconButton>
            </Tooltip>
          )}
          {order.status === OrderStatus.Shipped && (
            <Tooltip title={t("markAsDelivered")}>
              <IconButton
                size="small"
                color="success"
                onClick={() => updateStatus(order.id, OrderStatus.Delivered)}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          {(order.status === OrderStatus.Active ||
            order.status === OrderStatus.Shipped) && (
            <Tooltip title={t("markAsCanceled")}>
              <IconButton
                size="small"
                color="error"
                onClick={() => updateStatus(order.id, OrderStatus.Canceled)}
              >
                <Cancel />
              </IconButton>
            </Tooltip>
          )}
          {order.status === OrderStatus.Delivered && (
            <Tooltip title={t("markAsReturned")}>
              <IconButton
                size="small"
                color="warning"
                onClick={() => updateStatus(order.id, OrderStatus.Returned)}
              >
                <Undo />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    ));

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 4,
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Typography variant="h5">{t("orderManagement")}</Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          useFlexGap
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            placeholder={t("searchOrders")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 240 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 170 } }}>
            <InputLabel>{t("filterByStatus")}</InputLabel>
            <Select
              value={filterStatus}
              label={t("filterByStatus")}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">{t("allStatuses")}</MenuItem>
              {ORDER_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {t(STATUS_TRANSLATION_KEY[s])}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
            <InputLabel>{t("groupBy")}</InputLabel>
            <Select
              value={groupBy}
              label={t("groupBy")}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            >
              <MenuItem value="none">{t("noGrouping")}</MenuItem>
              <MenuItem value="year">{t("byYear")}</MenuItem>
              <MenuItem value="monthYear">{t("byMonthYear")}</MenuItem>
              <MenuItem value="status">{t("byStatus")}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<FileImport size={18} />}
            fullWidth={isMobile}
            onClick={() => setImportOpen(true)}
          >
            {t("import")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload size={18} />}
            fullWidth={isMobile}
            onClick={handleExport}
          >
            {t("export")}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            fullWidth={isMobile}
            onClick={() => setOpen(true)}
          >
            {t("newOrder")}
          </Button>
        </Stack>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("orderId")}</TableCell>
              <TableCell>{t("customerName")}</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                {t("items")}
              </TableCell>
              <TableCell>{t("total")}</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                {t("status")}
              </TableCell>
              <TableCell align="right">{t("actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedOrders
              ? sortedGroupKeys.map((key) => {
                  const groupItems = groupedOrders[key] as any[];
                  const groupTotal = groupItems.reduce(
                    (sum, o) => sum + o.total_amount,
                    0,
                  );
                  return (
                    <React.Fragment key={key}>
                      <TableRow sx={{ bgcolor: "action.hover" }}>
                        <TableCell colSpan={isNarrow ? 2 : 3}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                          >
                            {formatGroupLabel(key)}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              ({groupItems.length})
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, color: "primary.main" }}
                          >
                            {formatCurrency(groupTotal)}
                          </Typography>
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                      {renderTableRows(groupItems)}
                    </React.Fragment>
                  );
                })
              : renderTableRows(filteredOrders)}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {newOrder.id
            ? `${t("editOrderPrefix")}${newOrder.id}`
            : t("createNewOrder")}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t("customerDetails")}
            </Typography>
            <TextField
              label={t("name")}
              fullWidth
              required
              error={formErrors.name}
              helperText={formErrors.name ? t("nameRequired") : ""}
              value={newOrder.customer_details.name}
              onChange={(e) => {
                setFormErrors((prev) => ({ ...prev, name: false }));
                setNewOrder({
                  ...newOrder,
                  customer_details: {
                    ...newOrder.customer_details,
                    name: e.target.value,
                  },
                });
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("phone")}
                fullWidth
                required
                error={formErrors.phone}
                helperText={formErrors.phone ? t("phoneRequired") : ""}
                value={newOrder.customer_details.phone}
                onChange={(e) => {
                  setFormErrors((prev) => ({ ...prev, phone: false }));
                  setNewOrder({
                    ...newOrder,
                    customer_details: {
                      ...newOrder.customer_details,
                      phone: e.target.value,
                    },
                  });
                }}
              />

              <TextField
                label={t("email")}
                fullWidth
                value={newOrder.customer_details.email}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    customer_details: {
                      ...newOrder.customer_details,
                      email: e.target.value,
                    },
                  })
                }
              />
            </Stack>
            <TextField
              label={t("address")}
              fullWidth
              required
              error={formErrors.address}
              helperText={formErrors.address ? t("addressRequired") : ""}
              multiline
              rows={5}
              value={newOrder.customer_details.address}
              onChange={(e) => {
                setFormErrors((prev) => ({ ...prev, address: false }));
                setNewOrder({
                  ...newOrder,
                  customer_details: {
                    ...newOrder.customer_details,
                    address: e.target.value,
                  },
                });
              }}
            />
            <TextField
              label={t("notes")}
              fullWidth
              multiline
              rows={5}
              value={newOrder.notes}
              onChange={(e) =>
                setNewOrder({ ...newOrder, notes: e.target.value })
              }
            />
            {newOrder.id && (
              <TextField
                select
                label={t("status")}
                fullWidth
                value={newOrder.status}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    status: e.target.value as OrderStatus,
                  })
                }
              >
                {ORDER_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {t(STATUS_TRANSLATION_KEY[s])}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Divider sx={{ my: 2 }} />
          </Stack>

          {/* Attachments */}
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ pt: 1 }}>
              {t("uploadedInvoices")}
            </Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: "2px dashed",
                borderColor: isDragActive ? "primary.main" : "divider",
                borderRadius: 1,
                p: 2,
                cursor: "pointer",
                bgcolor: isDragActive ? "action.hover" : "transparent",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload
                size={32}
                style={{
                  marginBottom: 4,
                  color: isDragActive
                    ? theme.palette.primary.main
                    : theme.palette.action.active,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {t("dragAndDrop")}
              </Typography>
            </Box>

            {existingAttachments.length > 0 && (
              <List
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {existingAttachments.map((att, idx) => (
                  <ListItem
                    key={att.id}
                    divider={idx < existingAttachments.length - 1}
                  >
                    <TextField
                      size="small"
                      fullWidth
                      error={existingAttachmentErrors.has(idx)}
                      value={att.name}
                      onChange={(e) => {
                        const updated = [...existingAttachments];
                        updated[idx].name = e.target.value;
                        setExistingAttachments(updated);
                        if (e.target.value.trim()) {
                          setExistingAttachmentErrors((prev) => {
                            const next = new Set(prev);
                            next.delete(idx);
                            return next;
                          });
                        }
                      }}
                      sx={{ mr: 6 }}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title={t("downloadInvoice")}>
                        <IconButton
                          size="small"
                          component="a"
                          href={att.url}
                          download={formatAttachmentName(
                            newOrder.id,
                            newOrder.customer_details.name,
                            att.name,
                          )}
                          target="_blank"
                        >
                          <Download size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("delete")}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteAttachment(att.id)}
                        >
                          <Delete size={16} />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {selectedFiles.length > 0 && (
              <List
                size="small"
                sx={{
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {selectedFiles.map((sf, idx) => (
                  <ListItem key={idx} divider={idx < selectedFiles.length - 1}>
                    <TextField
                      size="small"
                      fullWidth
                      error={selectedFileErrors.has(idx)}
                      value={sf.name}
                      onChange={(e) => {
                        const updated = [...selectedFiles];
                        updated[idx].name = e.target.value;
                        setSelectedFiles(updated);
                        if (e.target.value.trim()) {
                          setSelectedFileErrors((prev) => {
                            const next = new Set(prev);
                            next.delete(idx);
                            return next;
                          });
                        }
                      }}
                      sx={{ mr: 4 }}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title={t("delete")}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            setSelectedFiles((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <Close size={16} />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            <Divider sx={{ my: 2 }} />
          </Stack>

          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t("addItems")}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Autocomplete
                options={allVariants}
                fullWidth
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField {...params} label={t("searchItem")} />
                )}
                onChange={(e, value) => {
                  if (value) {
                    setNewOrder({
                      ...newOrder,
                      items: [
                        ...newOrder.items,
                        {
                          variant_id: value.id,
                          name: value.itemName,
                          size: value.size,
                          quantity: 1,
                          unit_price: value.itemPrice,
                        },
                      ],
                    });
                  }
                }}
              />
              <TextField
                label={t("discount")}
                type="number"
                fullWidth
                value={newOrder.discount}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    discount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Stack>

            <List sx={{ mt: 2, maxHeight: 200, overflow: "auto" }}>
              {newOrder.items.map((item, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemText primary={`${item.name} (${item.size})`} />
                  <TextField
                    label={t("qty")}
                    type="number"
                    sx={{ width: 70, mr: 1 }}
                    value={item.quantity}
                    onChange={(e) => {
                      const items = [...newOrder.items];
                      items[i].quantity = parseInt(e.target.value) || 0;
                      setNewOrder({ ...newOrder, items });
                    }}
                  />
                  <TextField
                    label={t("price")}
                    type="number"
                    sx={{ width: 100, mr: 1 }}
                    value={item.unit_price}
                    onChange={(e) => {
                      const items = [...newOrder.items];
                      items[i].unit_price = parseFloat(e.target.value) || 0;
                      setNewOrder({ ...newOrder, items });
                    }}
                  />
                  <Tooltip title={t("removeItem")}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const items = newOrder.items.filter(
                          (_, index) => index !== i,
                        );
                        setNewOrder({ ...newOrder, items });
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>

            {newOrder.items.length > 0 && (
              <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t("subtotal")}
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(
                      newOrder.items.reduce(
                        (sum, item) => sum + item.unit_price * item.quantity,
                        0,
                      ),
                    )}
                  </Typography>
                </Stack>
                {newOrder.discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {t("discount")}
                    </Typography>
                    <Typography variant="body2" color="error">
                      -{formatCurrency(newOrder.discount)}
                    </Typography>
                  </Stack>
                )}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mt: 0.5 }}
                >
                  <Typography variant="subtitle2">{t("total")}</Typography>
                  <Typography variant="subtitle2" color="primary">
                    {formatCurrency(
                      Math.max(
                        0,
                        newOrder.items.reduce(
                          (sum, item) => sum + item.unit_price * item.quantity,
                          0,
                        ) - newOrder.discount,
                      ),
                    )}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={newOrder.items.length === 0}
          >
            {newOrder.id ? t("saveChanges") : t("createOrder")}
          </Button>
        </DialogActions>
      </Dialog>

      <ExcelImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={fetchOrders}
        entity="orders"
        title={t("import")}
      />
    </Box>
  );
}

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
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Delete,
  CheckCircle,
  LocalShipping,
  Cancel,
  Undo,
  Edit,
  Search,
} from "@mui/icons-material";
import { useLanguage } from "../context/LanguageContext";
import {
  OrderStatus,
  ORDER_STATUSES,
  STATUS_TRANSLATION_KEY,
  getStatusColor,
} from "../types/orderStatus";

export default function Orders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

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

  const handleCreateOrder = async () => {
    const errors = {
      name: !newOrder.customer_details.name.trim(),
      phone: !newOrder.customer_details.phone.trim(),
      address: !newOrder.customer_details.address.trim(),
    };
    setFormErrors(errors);
    if (errors.name || errors.phone || errors.address) return;

    const total =
      newOrder.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      ) - newOrder.discount;
    const url = newOrder.id ? `/api/orders/${newOrder.id}` : "/api/orders";
    const method = newOrder.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newOrder, total_amount: total }),
    });
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
            sx={{ display: "block" }}
          >
            {JSON.parse(order.customer_details).phone}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {JSON.parse(order.customer_details).email}
          </Typography>
        </TableCell>
        <TableCell>
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
        <TableCell>${order.total_amount.toLocaleString()}</TableCell>
        <TableCell>
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
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h5">{t("orderManagement")}</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder={t("searchOrders")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 170 }}>
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
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
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpen(true)}
          >
            {t("newOrder")}
          </Button>
        </Stack>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>{t("customerName")}</TableCell>
              <TableCell>{t("items")}</TableCell>
              <TableCell>{t("total")}</TableCell>
              <TableCell>{t("status")}</TableCell>
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
                        <TableCell colSpan={3}>
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
                            ${groupTotal.toLocaleString()}
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
          {newOrder.id ? `Edit Order #${newOrder.id}` : "Create New Order"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Customer Details
            </Typography>
            <TextField
              label="Name"
              fullWidth
              required
              error={formErrors.name}
              helperText={formErrors.name ? "Name is required" : ""}
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
            <Stack direction="row" spacing={2}>
              <TextField
                label="Phone"
                fullWidth
                required
                error={formErrors.phone}
                helperText={formErrors.phone ? "Phone is required" : ""}
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
                label="Email"
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
              label="Address"
              fullWidth
              required
              error={formErrors.address}
              helperText={formErrors.address ? "Address is required" : ""}
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
              label="Notes"
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
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Add Items
            </Typography>
            <Stack direction="row" spacing={2}>
              <Autocomplete
                options={allVariants}
                fullWidth
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField {...params} label="Search Item" />
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
                label="Discount"
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
                    label="Qty"
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
                    label="Price"
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
                    Subtotal
                  </Typography>
                  <Typography variant="body2">
                    $
                    {newOrder.items
                      .reduce(
                        (sum, item) => sum + item.unit_price * item.quantity,
                        0,
                      )
                      .toFixed(2)}
                  </Typography>
                </Stack>
                {newOrder.discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Discount
                    </Typography>
                    <Typography variant="body2" color="error">
                      -${newOrder.discount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mt: 0.5 }}
                >
                  <Typography variant="subtitle2">Total</Typography>
                  <Typography variant="subtitle2" color="primary">
                    $
                    {Math.max(
                      0,
                      newOrder.items.reduce(
                        (sum, item) => sum + item.unit_price * item.quantity,
                        0,
                      ) - newOrder.discount,
                    ).toFixed(2)}
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
    </Box>
  );
}

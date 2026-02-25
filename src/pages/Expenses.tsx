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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Menu,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  CloudUpload,
  Download,
  Close,
  Search,
} from "@mui/icons-material";
import {
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemSecondaryAction,
  InputAdornment,
} from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { useDropzone } from "react-dropzone";

export default function Expenses() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; name: string }[]
  >([]);
  const [existingInvoices, setExistingInvoices] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [groupBy, setGroupBy] = useState<
    "none" | "year" | "monthYear" | "subcategory" | "category"
  >("none");
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [existingInvoiceErrors, setExistingInvoiceErrors] = useState<
    Set<number>
  >(new Set());
  const [selectedFileErrors, setSelectedFileErrors] = useState<Set<number>>(
    new Set(),
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [invoiceMenu, setInvoiceMenu] = useState<{
    el: HTMLElement | null;
    invoices: any[];
    expenseName: string;
  }>({ el: null, invoices: [], expenseName: "" });

  const formatDownloadName = (expenseName: string, invoiceName: string) =>
    `${expenseName}-${invoiceName}`.replace(/\s+/g, "-");

  const handleOpenInvoiceMenu = (
    event: React.MouseEvent<HTMLElement>,
    invoices: any[],
    expenseName: string,
  ) => {
    setInvoiceMenu({ el: event.currentTarget, invoices, expenseName });
  };

  const handleCloseInvoiceMenu = () => {
    setInvoiceMenu({ el: null, invoices: [], expenseName: "" });
  };

  const handleDownloadAll = () => {
    invoiceMenu.invoices.forEach((inv) => {
      const a = document.createElement("a");
      a.href = inv.url;
      a.download = formatDownloadName(invoiceMenu.expenseName, inv.name);
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    handleCloseInvoiceMenu();
  };

  const [newExpense, setNewExpense] = useState({
    id: null as number | null,
    name: "",
    details: "",
    category: "",
    subcategory: "",
    amount: 0,
    quantity: 1,
    total_amount: 0,
    date: new Date().toISOString().split("T")[0],
  });

  const fetchExpenses = () => {
    fetch("/api/expenses")
      .then((res) => res.json())
      .then((data) => setExpenses(data));
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSaveExpense = async () => {
    if (!newExpense.name.trim()) setNameError(true);
    if (!newExpense.category.trim()) setCategoryError(true);
    if (!newExpense.name.trim() || !newExpense.category.trim()) return;
    const badExisting = new Set(
      existingInvoices
        .map((inv, i) => (!inv.name.trim() ? i : -1))
        .filter((i) => i !== -1),
    );
    const badSelected = new Set(
      selectedFiles
        .map((sf, i) => (!sf.name.trim() ? i : -1))
        .filter((i) => i !== -1),
    );
    if (badExisting.size > 0 || badSelected.size > 0) {
      setExistingInvoiceErrors(badExisting);
      setSelectedFileErrors(badSelected);
      return;
    }
    const formData = new FormData();
    formData.append("name", newExpense.name);
    formData.append("details", newExpense.details);
    formData.append("category", newExpense.category);
    formData.append("subcategory", newExpense.subcategory);
    formData.append("amount", newExpense.amount.toString());
    formData.append("quantity", newExpense.quantity.toString());
    formData.append(
      "total_amount",
      (newExpense.amount * newExpense.quantity).toString(),
    );
    formData.append("date", newExpense.date);

    // Add new files
    selectedFiles.forEach((sf) => {
      formData.append("invoices", sf.file);
    });
    formData.append(
      "invoiceNames",
      JSON.stringify(selectedFiles.map((sf) => sf.name)),
    );

    // Add existing invoices (for name updates)
    formData.append("existingInvoices", JSON.stringify(existingInvoices));

    const url = newExpense.id
      ? `/api/expenses/${newExpense.id}`
      : "/api/expenses";
    const method = newExpense.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      body: formData,
    });

    setOpen(false);
    resetForm();
    fetchExpenses();
  };

  const resetForm = () => {
    setNewExpense({
      id: null,
      name: "",
      details: "",
      category: "",
      subcategory: "",
      amount: 0,
      quantity: 1,
      total_amount: 0,
      date: new Date().toISOString().split("T")[0],
    });
    setSelectedFiles([]);
    setExistingInvoices([]);
    setNameError(false);
    setCategoryError(false);
    setExistingInvoiceErrors(new Set());
    setSelectedFileErrors(new Set());
  };

  const handleEditClick = (expense: any) => {
    setNewExpense({
      id: expense.id,
      name: expense.name,
      details: expense.details,
      category: expense.category || "",
      subcategory: expense.subcategory || "",
      amount: expense.amount,
      quantity: expense.quantity || 1,
      total_amount: expense.total_amount || expense.amount,
      date: expense.date,
    });
    setExistingInvoices(expense.invoices || []);
    setOpen(true);
  };

  const handleDeleteExpense = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteExpense = async () => {
    if (deleteConfirmId !== null) {
      await fetch(`/api/expenses/${deleteConfirmId}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      fetchExpenses();
    }
  };

  const uniqueCategories = Array.from(
    new Set(expenses.map((e) => e.category).filter(Boolean)),
  );
  const uniqueSubcategories = Array.from(
    new Set(expenses.map((e) => e.subcategory).filter(Boolean)),
  );

  const filteredExpenses = expenses.filter((e) => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      const haystack = [e.name, e.details || ""].join(" ").toLowerCase();
      if (!haystack.includes(lower)) return false;
    }
    return true;
  });

  const getGroupKey = (expense: any): string => {
    const date = new Date(expense.date);
    switch (groupBy) {
      case "year":
        return date.getFullYear().toString();
      case "monthYear":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      case "subcategory":
        return expense.subcategory || t("uncategorized");
      case "category":
        return expense.category || t("uncategorized");
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
    return key;
  };

  const groupedExpenses =
    groupBy !== "none"
      ? filteredExpenses.reduce(
          (acc, curr) => {
            const key = getGroupKey(curr);
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
          },
          {} as Record<string, any[]>,
        )
      : null;

  const sortedGroupKeys = groupedExpenses
    ? Object.keys(groupedExpenses).sort((a, b) =>
        groupBy === "year" || groupBy === "monthYear"
          ? b.localeCompare(a)
          : a.localeCompare(b),
      )
    : [];

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (window.confirm(t("areYouSureDelete"))) {
      await fetch(`/api/expenses/invoices/${invoiceId}`, { method: "DELETE" });
      setExistingInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      fetchExpenses();
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      name: file.name,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const renderTableBody = (items: any[]) =>
    items.map((expense) => (
      <TableRow key={expense.id}>
        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
        <TableCell>
          <Typography variant="body1">{expense.name}</Typography>
          <Stack direction="row" spacing={0.5}>
            {expense.category && (
              <Chip label={expense.category} size="small" variant="outlined" />
            )}
            {expense.subcategory && (
              <Chip
                label={expense.subcategory}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Stack>
        </TableCell>
        <TableCell>{expense.details}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, color: "error.main" }}>
          ${(expense.total_amount || expense.amount).toLocaleString()}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {(expense.invoices || []).length > 0 && (
              <Tooltip title={t("downloadInvoice")}>
                <IconButton
                  size="small"
                  onClick={(e: React.MouseEvent<HTMLElement>) =>
                    handleOpenInvoiceMenu(e, expense.invoices, expense.name)
                  }
                >
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t("editExpense")}>
              <IconButton size="small" onClick={() => handleEditClick(expense)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("deleteExpense")}>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteExpense(expense.id)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
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
        }}
      >
        <Typography variant="h5">{t("expenses")}</Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            placeholder={t("searchExpenses")}
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t("filterByCategory")}</InputLabel>
            <Select
              value={filterCategory}
              label={t("filterByCategory")}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="all">{t("allCategories")}</MenuItem>
              {uniqueCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>{t("groupBy")}</InputLabel>
            <Select
              value={groupBy}
              label={t("groupBy")}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            >
              <MenuItem value="none">{t("noGrouping")}</MenuItem>
              <MenuItem value="year">{t("byYear")}</MenuItem>
              <MenuItem value="monthYear">{t("byMonthYear")}</MenuItem>
              <MenuItem value="subcategory">{t("bySubcategory")}</MenuItem>
              <MenuItem value="category">{t("byCategory")}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpen(true)}
          >
            {t("addExpense")}
          </Button>
        </Stack>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("date")}</TableCell>
              <TableCell>{t("expenseName")}</TableCell>
              <TableCell>{t("details")}</TableCell>
              <TableCell align="right">{t("amount")}</TableCell>
              <TableCell align="right">{t("actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedExpenses
              ? sortedGroupKeys.map((key) => {
                  const items = groupedExpenses[key] as any[];
                  const groupTotal = items.reduce(
                    (sum, e) => sum + (e.total_amount || e.amount),
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
                              ({items.length})
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, color: "error.main" }}
                          >
                            -${groupTotal.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      {renderTableBody(items)}
                    </React.Fragment>
                  );
                })
              : renderTableBody(filteredExpenses)}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={invoiceMenu.el}
        open={Boolean(invoiceMenu.el)}
        onClose={handleCloseInvoiceMenu}
      >
        {invoiceMenu.invoices.map((inv: any) => (
          <MenuItem
            key={inv.id}
            component="a"
            href={inv.url}
            download={formatDownloadName(invoiceMenu.expenseName, inv.name)}
            target="_blank"
            onClick={handleCloseInvoiceMenu}
          >
            <Download fontSize="small" sx={{ mr: 1 }} />
            {inv.name}
          </MenuItem>
        ))}
        {invoiceMenu.invoices.length > 1 && [
          <Divider key="divider" />,
          <MenuItem key="all" onClick={handleDownloadAll}>
            <Download fontSize="small" sx={{ mr: 1 }} />
            {t("downloadAll")}
          </MenuItem>,
        ]}
      </Menu>

      <Dialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("confirmDelete")}</DialogTitle>
        <DialogContent>
          <Typography>{t("areYouSureDelete")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>{t("cancel")}</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteExpense}>
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{newExpense.id ? t("edit") : t("addExpense")}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("expenseName")}
              fullWidth
              required
              error={nameError}
              helperText={nameError ? t("nameRequired") : undefined}
              value={newExpense.name}
              onChange={(e) => {
                setNameError(false);
                setNewExpense({ ...newExpense, name: e.target.value });
              }}
            />

            <Stack direction="row" spacing={2}>
              <Autocomplete
                freeSolo
                fullWidth
                options={uniqueCategories}
                value={newExpense.category}
                onChange={(_, newValue) => {
                  setCategoryError(false);
                  setNewExpense({ ...newExpense, category: newValue || "" });
                }}
                onInputChange={(_, newInputValue) => {
                  setCategoryError(false);
                  setNewExpense({ ...newExpense, category: newInputValue });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("category")}
                    required
                    error={categoryError}
                    helperText={categoryError ? t("categoryRequired") : ""}
                  />
                )}
              />

              <Autocomplete
                freeSolo
                fullWidth
                options={uniqueSubcategories}
                value={newExpense.subcategory}
                onChange={(_, newValue) =>
                  setNewExpense({ ...newExpense, subcategory: newValue || "" })
                }
                onInputChange={(_, newInputValue) =>
                  setNewExpense({ ...newExpense, subcategory: newInputValue })
                }
                renderInput={(params) => (
                  <TextField {...params} label={t("subcategory")} />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label={t("quantity")}
                type="number"
                fullWidth
                value={newExpense.quantity}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    quantity: parseFloat(e.target.value) || 1,
                  })
                }
                inputProps={{ step: "0.01" }}
              />
              <TextField
                label={t("amount")}
                type="number"
                fullWidth
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <TextField
                label={t("totalPrice")}
                fullWidth
                value={
                  "$" +
                  (newExpense.amount * newExpense.quantity).toLocaleString()
                }
                disabled
              />
            </Stack>

            <TextField
              label={t("details")}
              fullWidth
              multiline
              rows={5}
              value={newExpense.details}
              onChange={(e) =>
                setNewExpense({ ...newExpense, details: e.target.value })
              }
            />
            <TextField
              label={t("date")}
              type="date"
              fullWidth
              value={newExpense.date}
              onChange={(e) =>
                setNewExpense({ ...newExpense, date: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("uploadedInvoices")}
              </Typography>
              <Stack spacing={1}>
                {/* Drag and Drop Area */}
                <Box
                  {...getRootProps()}
                  sx={{
                    border: "2px dashed",
                    borderColor: isDragActive ? "primary.main" : "divider",
                    borderRadius: 1,
                    p: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: isDragActive ? "action.hover" : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <input {...getInputProps()} />
                  <CloudUpload
                    sx={{ fontSize: 32, color: "text.secondary", mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t("dragAndDrop")}
                  </Typography>
                </Box>

                {/* List of existing invoices */}
                {existingInvoices.length > 0 && (
                  <List
                    size="small"
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {existingInvoices.map((inv, idx) => (
                      <ListItem
                        key={inv.id}
                        divider={idx < existingInvoices.length - 1}
                      >
                        <TextField
                          size="small"
                          fullWidth
                          error={existingInvoiceErrors.has(idx)}
                          value={inv.name}
                          onChange={(e) => {
                            const updated = [...existingInvoices];
                            updated[idx].name = e.target.value;
                            setExistingInvoices(updated);
                            if (e.target.value.trim()) {
                              setExistingInvoiceErrors((prev) => {
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
                              href={inv.url}
                              download
                              target="_blank"
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("delete")}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteInvoice(inv.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* List of new files to be uploaded */}
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
                      <ListItem
                        key={idx}
                        divider={idx < selectedFiles.length - 1}
                      >
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
                              <Close fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Stack>
            </Box>
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
          <Button variant="contained" onClick={handleSaveExpense}>
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

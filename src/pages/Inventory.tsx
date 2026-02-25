import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
} from "@mui/material";
import {
  Add,
  MoreVert,
  LocalShipping,
  Edit,
  CloudUpload,
  Delete,
} from "@mui/icons-material";
import { useLanguage } from "../context/LanguageContext";

export default function Inventory() {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [restockQty, setRestockQty] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  const [newItem, setNewItem] = useState<any>({
    id: null,
    name: "",
    description: "",
    category_name: "",
    picture_url: "",
    price: 0,
    low_stock_threshold: 5,
    variants: [{ size: "", stock_count: 0 }],
  });

  const fetchInventory = () => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setItems(data));
  };

  const fetchCategories = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data));
  };

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, []);

  const handleSaveItem = async () => {
    if (!newItem.name.trim()) setNameError(true);
    if (!newItem.category_name.trim()) setCategoryError(true);
    if (!newItem.name.trim() || !newItem.category_name.trim()) return;

    const catName = newItem.category_name.trim();
    const catRes = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName }),
    });
    const cat = await catRes.json();
    fetchCategories();

    const formData = new FormData();
    formData.append("name", newItem.name);
    formData.append("description", newItem.description);
    formData.append("category_id", cat.id.toString());
    formData.append("price", newItem.price.toString());
    formData.append(
      "low_stock_threshold",
      newItem.low_stock_threshold.toString(),
    );
    formData.append("variants", JSON.stringify(newItem.variants));

    if (selectedFile) {
      formData.append("image", selectedFile);
    } else {
      formData.append("picture_url", newItem.picture_url);
    }

    const url = newItem.id ? `/api/inventory/${newItem.id}` : "/api/inventory";
    const method = newItem.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      body: formData,
    });

    resetDialog();
    setOpen(false);
    fetchInventory();
  };

  const handleEditClick = (item: any) => {
    setNewItem({
      id: item.id,
      name: item.name,
      description: item.description,
      category_name: item.category_name || "",
      picture_url: item.picture_url,
      price: item.price,
      low_stock_threshold: item.low_stock_threshold,
      variants: item.variants,
    });
    setPreviewUrl(item.picture_url || null);
    setOpen(true);
  };

  const handleDeleteItem = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteItem = async () => {
    if (deleteConfirmId !== null) {
      await fetch(`/api/inventory/${deleteConfirmId}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      fetchInventory();
    }
  };

  const resetDialog = () => {
    setNameError(false);
    setCategoryError(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setNewItem({
      id: null,
      name: "",
      description: "",
      category_name: "",
      picture_url: "",
      price: 0,
      low_stock_threshold: 5,
      variants: [{ size: "", stock_count: 0 }],
    });
  };

  const handleRestock = async () => {
    await fetch("/api/inventory/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant_id: selectedVariant.id,
        quantity: restockQty,
        cost_per_unit: 0, // Could add this to UI
      }),
    });
    setRestockOpen(false);
    fetchInventory();
  };

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
        <Typography variant="h5">{t("inventoryManagement")}</Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t("filterByCategory")}</InputLabel>
            <Select
              value={categoryFilter ?? "all"}
              label={t("filterByCategory")}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value === "all" ? null : e.target.value as string,
                )
              }
            >
              <MenuItem value="all">{t("allCategories")}</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetDialog();
              setOpen(true);
            }}
          >
            {t("addInventory")}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {items.filter((item) => categoryFilter === null || item.category_name === categoryFilter).map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardMedia
                component="img"
                sx={{ height: 200, objectFit: "contain" }}
                image={
                  item.picture_url ||
                  "https://picsum.photos/seed/inventory/400/200"
                }
                alt={item.name}
              />
              <CardContent
                sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Box sx={{ flex: 1, mr: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        lineHeight: 1.2,
                        mb: 0.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        height: "2.4em",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.category_name} • ${item.price?.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(item)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mt: "auto" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t("stockBySize")}:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {item.variants.map((v: any) => (
                      <Chip
                        key={v.id}
                        label={`${v.size}: ${v.stock_count}`}
                        size="small"
                        color={
                          v.stock_count <= item.low_stock_threshold
                            ? "error"
                            : "default"
                        }
                        onClick={() => {
                          setSelectedVariant(v);
                          setRestockOpen(true);
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Delete Confirmation Dialog */}
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
          <Button variant="contained" color="error" onClick={confirmDeleteItem}>
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          resetDialog();
          setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {newItem.id ? "Edit Inventory Item" : "Add New Inventory Item"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Item Name"
              fullWidth
              required
              error={nameError}
              helperText={nameError ? "Item name is required" : ""}
              value={newItem.name}
              onChange={(e) => {
                setNameError(false);
                setNewItem({ ...newItem, name: e.target.value });
              }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={5}
              value={newItem.description}
              onChange={(e) =>
                setNewItem({ ...newItem, description: e.target.value })
              }
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Autocomplete
                freeSolo
                fullWidth
                options={categories.map((c) => c.name)}
                value={newItem.category_name}
                onChange={(_, newValue) => {
                  setCategoryError(false);
                  setNewItem({ ...newItem, category_name: newValue || "" });
                }}
                onInputChange={(_, newInputValue) => {
                  setCategoryError(false);
                  setNewItem({ ...newItem, category_name: newInputValue });
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
              <TextField
                label="Price"
                fullWidth
                type="number"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <TextField
                label={t("lowStockThreshold")}
                fullWidth
                type="number"
                value={newItem.low_stock_threshold}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    low_stock_threshold: parseInt(e.target.value) || 0,
                  })
                }
                inputProps={{ min: 0 }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Product Image
              </Typography>
              {previewUrl && (
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Product preview"
                  sx={{
                    width: "100%",
                    height: 180,
                    objectFit: "contain",
                    borderRadius: 1,
                    mb: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "grey.100",
                  }}
                />
              )}
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                fullWidth
              >
                {selectedFile ? selectedFile.name : "Upload Image"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setPreviewUrl(
                      file
                        ? URL.createObjectURL(file)
                        : newItem.picture_url || null,
                    );
                  }}
                />
              </Button>
              <TextField
                label="Or Image URL"
                fullWidth
                hidden
                size="small"
                sx={{ mt: 1 }}
                value={newItem.picture_url}
                onChange={(e) => {
                  setNewItem({ ...newItem, picture_url: e.target.value });
                  if (!selectedFile) setPreviewUrl(e.target.value || null);
                }}
              />
            </Box>

            <Typography variant="subtitle2">
              Variants (Sizes & Initial Stock)
            </Typography>
            {newItem.variants.map((v, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Size"
                  size="small"
                  fullWidth
                  value={v.size}
                  onChange={(e) => {
                    const v2 = [...newItem.variants];
                    v2[i].size = e.target.value;
                    setNewItem({ ...newItem, variants: v2 });
                  }}
                />
                <TextField
                  label="Stock"
                  size="small"
                  fullWidth
                  type="number"
                  value={v.stock_count}
                  onChange={(e) => {
                    const v2 = [...newItem.variants];
                    v2[i].stock_count = parseInt(e.target.value) || 0;
                    setNewItem({ ...newItem, variants: v2 });
                  }}
                />
              </Box>
            ))}
            <Button
              size="small"
              onClick={() =>
                setNewItem({
                  ...newItem,
                  variants: [...newItem.variants, { size: "", stock_count: 0 }],
                })
              }
            >
              Add Variant
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              resetDialog();
              setOpen(false);
            }}
          >
            {t("cancel")}
          </Button>
          <Button variant="contained" onClick={handleSaveItem}>
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={restockOpen} onClose={() => setRestockOpen(false)}>
        <DialogTitle>Restock Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Adding stock for size: <strong>{selectedVariant?.size}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Quantity to Add"
            type="number"
            fullWidth
            value={restockQty}
            onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestockOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRestock}>
            Add Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

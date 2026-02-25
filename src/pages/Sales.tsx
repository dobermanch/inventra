import { Fragment, useEffect, useState } from "react";
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { IconSearch as Search } from "@tabler/icons-react";
import { useLanguage } from "../context/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import {
  OrderStatus,
  ORDER_STATUSES,
  STATUS_TRANSLATION_KEY,
  getStatusColor,
} from "../types/orderStatus";

export default function Sales() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const [orders, setOrders] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [groupBy, setGroupBy] = useState<
    "none" | "year" | "monthYear" | "status"
  >("none");
  const [viewOrder, setViewOrder] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data));
  }, []);

  const lowerSearch = searchText.toLowerCase();
  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (searchText.trim()) {
      const customer = JSON.parse(order.customer_details);
      const haystack = [
        customer.name,
        customer.phone,
        customer.email,
        order.notes || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(lowerSearch)) return false;
    }
    return true;
  });

  const totalRevenue = filteredOrders
    .filter(
      (o) =>
        o.status !== OrderStatus.Canceled && o.status !== OrderStatus.Returned,
    )
    .reduce((sum, o) => sum + o.total_amount, 0);

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
    items.map((order) => {
      const customer = JSON.parse(order.customer_details);
      return (
        <TableRow
          key={order.id}
          hover
          sx={{ cursor: "pointer" }}
          onClick={() => setViewOrder(order)}
        >
          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
            {new Date(order.created_at).toLocaleDateString()}
          </TableCell>
          <TableCell>#{order.id}</TableCell>
          <TableCell>
            {customer.name}
            <br />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {customer.phone}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {customer.email}
            </Typography>
            <Box sx={{ display: { xs: "block", md: "none" }, mt: 0.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                {new Date(order.created_at).toLocaleDateString()}
              </Typography>
              <Chip
                label={t(STATUS_TRANSLATION_KEY[order.status as OrderStatus])}
                size="small"
                variant="outlined"
                color={getStatusColor(order.status) as any}
              />
            </Box>
          </TableCell>
          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
            {order.items.map((item: any) => (
              <Typography key={item.id} variant="caption" display="block">
                {item.name} ({item.size}) x{item.quantity}
              </Typography>
            ))}
          </TableCell>
          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
            <Chip
              label={t(STATUS_TRANSLATION_KEY[order.status as OrderStatus])}
              size="small"
              variant="outlined"
              color={getStatusColor(order.status) as any}
            />
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 600 }}>
            {formatCurrency(order.total_amount)}
          </TableCell>
        </TableRow>
      );
    });

  const viewCustomer = viewOrder
    ? JSON.parse(viewOrder.customer_details)
    : null;

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
        <Typography variant="h5">{t("salesHistory")}</Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          useFlexGap
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            placeholder={t("searchSales")}
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
              <MenuItem value="all">{t("allOrders")}</MenuItem>
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
          <Paper sx={{ px: 2, py: 1, bgcolor: "primary.main", color: "white" }}>
            <Typography variant="caption">{t("totalRevenue")}</Typography>
            <Typography variant="h6">{formatCurrency(totalRevenue)}</Typography>
          </Paper>
        </Stack>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                {t("date")}
              </TableCell>
              <TableCell>{t("orderId")}</TableCell>
              <TableCell>{t("customerName")}</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                {t("items")}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                {t("status")}
              </TableCell>
              <TableCell align="right">{t("amount")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedOrders
              ? sortedGroupKeys.map((key) => {
                  const groupItems = groupedOrders[key] as any[];
                  const groupTotal = groupItems
                    .filter(
                      (o) =>
                        o.status !== OrderStatus.Canceled &&
                        o.status !== OrderStatus.Returned,
                    )
                    .reduce((sum, o) => sum + o.total_amount, 0);
                  return (
                    <Fragment key={key}>
                      <TableRow sx={{ bgcolor: "action.hover" }}>
                        <TableCell colSpan={isNarrow ? 2 : 5}>
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
                        <TableCell align="right">
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, color: "primary.main" }}
                          >
                            {formatCurrency(groupTotal)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {renderTableRows(groupItems)}
                    </Fragment>
                  );
                })
              : renderTableRows(filteredOrders)}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Order Detail Dialog (read-only) */}
      <Dialog
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        fullWidth
        maxWidth="md"
      >
        {viewOrder && viewCustomer && (
          <>
            <DialogTitle>
              {t("orderDetails")} #{viewOrder.id}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography variant="subtitle2">
                  {t("customerDetails")}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t("name")}
                    </Typography>
                    <Typography>{viewCustomer.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t("phone")}
                    </Typography>
                    <Typography>{viewCustomer.phone}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t("email")}
                    </Typography>
                    <Typography>{viewCustomer.email || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t("address")}
                    </Typography>
                    <Typography>{viewCustomer.address}</Typography>
                  </Grid>
                </Grid>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t("status")}:
                  </Typography>
                  <Chip
                    label={t(
                      STATUS_TRANSLATION_KEY[viewOrder.status as OrderStatus],
                    )}
                    size="small"
                    color={getStatusColor(viewOrder.status) as any}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  {t("date")}:{" "}
                  {new Date(viewOrder.created_at).toLocaleDateString()}
                </Typography>

                {viewOrder.notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("notes")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", mt: 0.5 }}
                    >
                      {viewOrder.notes}
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Typography variant="subtitle2">{t("items")}</Typography>
                {viewOrder.items.map((item: any) => (
                  <Stack
                    key={item.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2">
                      {item.name} ({item.size}) x{item.quantity}
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </Typography>
                  </Stack>
                ))}

                <Divider />

                {viewOrder.discount > 0 && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t("subtotal")}
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(
                          viewOrder.items.reduce(
                            (sum: number, item: any) =>
                              sum + item.unit_price * item.quantity,
                            0,
                          ),
                        )}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t("discount")}
                      </Typography>
                      <Typography variant="body2" color="error">
                        -{formatCurrency(viewOrder.discount)}
                      </Typography>
                    </Stack>
                  </>
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2">{t("total")}</Typography>
                  <Typography variant="subtitle2" color="primary">
                    {formatCurrency(viewOrder.total_amount)}
                  </Typography>
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewOrder(null)}>{t("close")}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

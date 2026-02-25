import React from "react";
import { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
} from "@mui/material";
import {
  TrendingUp,
  Assignment,
  Warning,
  Receipt,
  CalendarMonth,
  LocalShipping,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "../context/LanguageContext";

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "primary";
    case "shipped":
      return "info";
    default:
      return "default";
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setStats(data));
  }, []);

  if (!stats) return <Typography>Loading...</Typography>;

  const summaryCards = [
    {
      title: t("totalSales"),
      value: `$${(stats.totalSales || 0).toLocaleString()}`,
      icon: <TrendingUp color="primary" />,
      color: "#e3f2fd",
    },
    {
      title: t("currentMonthSales"),
      value: `$${(stats.currentMonthSales || 0).toLocaleString()}`,
      icon: <CalendarMonth color="success" />,
      color: "#e8f5e9",
    },
    {
      title: t("activeOrders"),
      value: stats.activeOrders || 0,
      icon: <Assignment color="secondary" />,
      color: "#fff3e0",
    },
    {
      title: t("shippedOrders"),
      value: stats.shippedOrders || 0,
      icon: <LocalShipping color="success" />,
      color: "#e8f5e9",
    },
    {
      title: t("lowStockItems"),
      value: (stats.lowStockItems || []).length,
      icon: <Warning color="error" />,
      color: "#ffebee",
    },
    {
      title: t("recentExpenses"),
      value: (stats.recentExpenses || []).length,
      icon: <Receipt color="info" />,
      color: "#f3e5f5",
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
        {t("dashboardOverview")}
      </Typography>

      <Grid container spacing={3}>
        {summaryCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 2 }} key={index}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: card.color,
                  display: "flex",
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {card.title}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t("salesTrends")}
            </Typography>
            {stats.salesTrends && stats.salesTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={stats.salesTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f5f5f5" }}
                    formatter={(value: any) => [
                      `$${Number(value).toLocaleString()}`,
                      "Sales",
                    ]}
                  />
                  <Bar
                    dataKey="sales"
                    fill="#1a1a1a"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "80%",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No sales data yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("recentActiveOrders")}
            </Typography>
            {!stats.recentActiveOrders ||
            stats.recentActiveOrders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("noActiveOrders")}
              </Typography>
            ) : (
              <List disablePadding>
                {stats.recentActiveOrders.map((order: any, i: number) => {
                  const customer = JSON.parse(order.customer_details);
                  return (
                    <React.Fragment key={order.id}>
                      <ListItem sx={{ px: 0 }} alignItems="flex-start">
                        <ListItemText
                          primary={
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                #{order.id}
                              </Typography>
                              <Typography variant="body2">
                                {customer.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {customer.phone}
                              </Typography>
                            </Stack>
                          }
                          secondary={order.items
                            .map(
                              (item: any) =>
                                `${item.name} (${item.size}) x${item.quantity}`,
                            )
                            .join(", ")}
                        />
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ ml: 2, flexShrink: 0 }}
                        >
                          <Chip
                            label={order.status}
                            size="small"
                            variant="outlined"
                            color={getStatusColor(order.status) as any}
                            sx={{ minWidth: 80, justifyContent: "center" }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            ${order.total_amount.toLocaleString()}
                          </Typography>
                        </Stack>
                      </ListItem>
                      {i < stats.recentActiveOrders.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("recentExpenses")}
            </Typography>
            {!stats.recentExpenses || stats.recentExpenses.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("noRecentExpenses")}
              </Typography>
            ) : (
              <List disablePadding>
                {stats.recentExpenses.map((expense: any, i: number) => (
                  <React.Fragment key={expense.id}>
                    <ListItem sx={{ px: 0 }} alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2">
                              {expense.name}
                            </Typography>
                            {expense.category && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {expense.category}
                                {expense.subcategory
                                  ? ` / ${expense.subcategory}`
                                  : ""}
                              </Typography>
                            )}
                          </Stack>
                        }
                        secondary={new Date(expense.date).toLocaleDateString()}
                      />
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ ml: 2, flexShrink: 0 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "error.main" }}
                        >
                          -$
                          {(
                            expense.total_amount || expense.amount
                          ).toLocaleString()}
                        </Typography>
                      </Stack>
                    </ListItem>
                    {i < stats.recentExpenses.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400, overflow: "auto" }}>
            <Typography variant="h6" gutterBottom>
              {t("lowStockAlerts")}
            </Typography>
            <List>
              {!stats.lowStockItems || stats.lowStockItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("allStocked")}
                </Typography>
              ) : (
                stats.lowStockItems.map((item: any, i: number) => (
                  <React.Fragment key={i}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={item.name}
                        secondary={`Size: ${item.size || "N/A"}`}
                      />
                      <Chip
                        label={`${item.stock_count} left`}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ minWidth: 80, justifyContent: "center" }}
                      />
                    </ListItem>
                    {i < stats.lowStockItems.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

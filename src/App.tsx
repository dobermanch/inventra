import React from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Link,
} from "@mui/material";
import { version } from "../package.json";
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as OrdersIcon,
  ReceiptLong as ExpensesIcon,
  TrendingUp as SalesIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Expenses from "./pages/Expenses";
import Sales from "./pages/Sales";
import Settings from "./pages/Settings";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    primary: {
      main: "#2563EB",
    },
    secondary: {
      main: "#10B981",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        },
      },
    },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const menuItems = [
    { text: t("dashboard"), icon: <DashboardIcon />, path: "/" },
    { text: t("inventory"), icon: <InventoryIcon />, path: "/inventory" },
    { text: t("orders"), icon: <OrdersIcon />, path: "/orders" },
    { text: t("sales"), icon: <SalesIcon />, path: "/sales" },
    { text: t("expenses"), icon: <ExpensesIcon />, path: "/expenses" },
    { text: t("settings"), icon: <SettingsIcon />, path: "/settings" },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "white",
          color: "text.primary",
          boxShadow: "none",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Toolbar>
          <Box>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              STOKLY <span style={{ color: "#f27d26" }}>OMS</span>
            </Typography>
            <Typography
              variant="body2"
              noWrap
              component="div"
              sx={{ fontWeight: 500, color: "primary.secondary" }}
            >
              {t("appMotto")}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #e0e0e0",
          },
        }}
      >
        <Toolbar />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "auto",
          }}
        >
          <Box sx={{ flexGrow: 1, mt: 2 }}>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      mb: 0.5,
                      "&.Mui-selected": {
                        bgcolor: "secondary.main",
                        color: "white",
                        "& .MuiListItemIcon-root": { color: "white" },
                        "&:hover": { bgcolor: "secondary.dark" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      slotProps={{
                        primary: { fontSize: "0.9rem", fontWeight: 500 },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
          <Box sx={{ textAlign: "center", pb: 2, px: 2 }}>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              v{version}
            </Typography>
            <Link
              href="https://github.com/dobermanch/stokly"
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              underline="hover"
              color="text.secondary"
            >
              GitHub
            </Link>
          </Box>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <LanguageProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

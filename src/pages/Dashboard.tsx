import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, List, ListItem, ListItemText, ListItemIcon, Divider, Chip } from '@mui/material';
import { 
  TrendingUp, 
  Assignment, 
  Warning, 
  Receipt,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <Typography>Loading...</Typography>;

  const summaryCards = [
    { title: t('totalSales'), value: `$${(stats.totalSales || 0).toLocaleString()}`, icon: <TrendingUp color="primary" />, color: '#e3f2fd' },
    { title: t('activeOrders'), value: stats.activeOrders || 0, icon: <Assignment color="secondary" />, color: '#fff3e0' },
    { title: t('lowStockItems'), value: (stats.lowStockItems || []).length, icon: <Warning color="error" />, color: '#ffebee' },
    { title: t('recentExpenses'), value: (stats.recentExpenses || []).length, icon: <Receipt color="info" />, color: '#f3e5f5' },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
        {t('dashboardOverview')}
      </Typography>

      <Grid container spacing={3}>
        {summaryCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: card.color, display: 'flex' }}>
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

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>{t('salesTrends')}</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={[{ name: 'Jan', sales: 4000 }, { name: 'Feb', sales: 3000 }, { name: 'Mar', sales: stats.totalSales }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f5f5f5' }} />
                <Bar dataKey="sales" fill="#1a1a1a" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>{t('lowStockAlerts')}</Typography>
            <List>
              {(!stats.lowStockItems || stats.lowStockItems.length === 0) ? (
                <Typography variant="body2" color="text.secondary">{t('allStocked')}</Typography>
              ) : (
                stats.lowStockItems.map((item: any, i: number) => (
                  <React.Fragment key={i}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary={item.name} 
                        secondary={`Size: ${item.size || 'N/A'}`} 
                      />
                      <Chip 
                        label={`${item.stock_count} left`} 
                        size="small" 
                        color="error" 
                        variant="outlined" 
                      />
                    </ListItem>
                    {i < stats.lowStockItems.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{t('recentExpenses')}</Typography>
            <List>
              {(stats.recentExpenses || []).map((expense: any, i: number) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemText 
                    primary={expense.name} 
                    secondary={new Date(expense.date).toLocaleDateString()} 
                  />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                    -${(expense.total_amount || expense.amount).toLocaleString()}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

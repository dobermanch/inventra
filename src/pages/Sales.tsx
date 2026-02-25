import React, { useEffect, useState } from 'react';
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
  TextField,
  MenuItem,
  Stack,
  Chip
} from '@mui/material';

export default function Sales() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data));
  }, []);

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const totalRevenue = filteredOrders
    .filter(o => o.status !== 'canceled' && o.status !== 'returned')
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h5">Sales History</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Paper sx={{ px: 2, py: 1, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="caption">Total Revenue</Typography>
            <Typography variant="h6">${totalRevenue.toLocaleString()}</Typography>
          </Paper>
          <TextField 
            select 
            label="Filter Status" 
            size="small" 
            sx={{ width: 150 }} 
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <MenuItem value="all">All Orders</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
            <MenuItem value="returned">Returned</MenuItem>
          </TextField>
        </Stack>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>#{order.id}</TableCell>
                <TableCell>{JSON.parse(order.customer_details).name}</TableCell>
                <TableCell>
                  {order.items.map((item: any) => (
                    <Typography key={item.id} variant="caption" display="block">
                      {item.name} ({item.size}) x{item.quantity}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={order.status} 
                    size="small" 
                    variant="outlined"
                    color={
                      order.status === 'delivered' ? 'success' : 
                      order.status === 'canceled' ? 'error' : 
                      order.status === 'returned' ? 'warning' : 'primary'
                    }
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  ${order.total_amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

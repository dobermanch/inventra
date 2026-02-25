import React, { useEffect, useState } from 'react';
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid
} from '@mui/material';
import { Add, Delete, CheckCircle, LocalShipping, Cancel, Undo, Edit } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';

export default function Orders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  
  const [newOrder, setNewOrder] = useState({
    id: null as number | null,
    customer_details: { name: '', phone: '', email: '', address: '' },
    status: 'active',
    discount: 0,
    items: [] as any[]
  });

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data));
  };

  const fetchInventory = () => {
    fetch('/api/inventory')
      .then(res => res.json())
      .then(data => setInventory(data));
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  const handleCreateOrder = async () => {
    const total = newOrder.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) - newOrder.discount;
    const url = newOrder.id ? `/api/orders/${newOrder.id}` : '/api/orders';
    const method = newOrder.id ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newOrder, total_amount: total })
    });
    setOpen(false);
    resetForm();
    fetchOrders();
    fetchInventory();
  };

  const resetForm = () => {
    setNewOrder({
      id: null,
      customer_details: { name: '', phone: '', email: '', address: '' },
      status: 'active',
      discount: 0,
      items: [] as any[]
    });
  };

  const handleEditClick = (order: any) => {
    const customer = JSON.parse(order.customer_details);
    setNewOrder({
      id: order.id,
      customer_details: {
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      },
      status: order.status,
      discount: order.discount,
      items: order.items.map((item: any) => ({
        variant_id: item.variant_id || item.id, // Handle potential mapping differences
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    });
    setOpen(true);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchOrders();
    fetchInventory();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'primary';
      case 'shipped': return 'info';
      case 'delivered': return 'success';
      case 'canceled': return 'error';
      case 'returned': return 'warning';
      default: return 'default';
    }
  };

  // Flatten inventory for autocomplete
  const allVariants = inventory.flatMap(item => 
    item.variants.map((v: any) => ({
      ...v,
      itemName: item.name,
      label: `${item.name} - ${v.size} (${v.stock_count} in stock)`
    }))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h5">{t('orderManagement')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          {t('newOrder')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>{t('customerName')}</TableCell>
              <TableCell>{t('items')}</TableCell>
              <TableCell>{t('total')}</TableCell>
              <TableCell>{t('status')}</TableCell>
              <TableCell align="right">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>#{order.id}</TableCell>
                <TableCell>
                  {JSON.parse(order.customer_details).name}<br/>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
                </TableCell>
                <TableCell>${order.total_amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip label={order.status} size="small" color={getStatusColor(order.status) as any} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEditClick(order)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  {order.status === 'active' && (
                    <IconButton size="small" color="info" onClick={() => updateStatus(order.id, 'shipped')}>
                      <LocalShipping />
                    </IconButton>
                  )}
                  {order.status === 'shipped' && (
                    <IconButton size="small" color="success" onClick={() => updateStatus(order.id, 'delivered')}>
                      <CheckCircle />
                    </IconButton>
                  )}
                  {(order.status === 'active' || order.status === 'shipped') && (
                    <IconButton size="small" color="error" onClick={() => updateStatus(order.id, 'canceled')}>
                      <Cancel />
                    </IconButton>
                  )}
                  {order.status === 'delivered' && (
                    <IconButton size="small" color="warning" onClick={() => updateStatus(order.id, 'returned')}>
                      <Undo />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} fullWidth maxWidth="md">
        <DialogTitle>{newOrder.id ? `Edit Order #${newOrder.id}` : 'Create New Order'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Customer Details</Typography>
              <TextField 
                label="Name" 
                fullWidth 
                size="small" 
                sx={{ mb: 2 }} 
                value={newOrder.customer_details.name}
                onChange={e => setNewOrder({...newOrder, customer_details: {...newOrder.customer_details, name: e.target.value}})}
              />
              <TextField 
                label="Phone" 
                fullWidth 
                size="small" 
                sx={{ mb: 2 }}
                value={newOrder.customer_details.phone}
                onChange={e => setNewOrder({...newOrder, customer_details: {...newOrder.customer_details, phone: e.target.value}})}
              />
              <TextField 
                label="Email" 
                fullWidth 
                size="small" 
                sx={{ mb: 2 }}
                value={newOrder.customer_details.email}
                onChange={e => setNewOrder({...newOrder, customer_details: {...newOrder.customer_details, email: e.target.value}})}
              />
              <TextField 
                label="Address" 
                fullWidth 
                size="small" 
                sx={{ mb: 2 }}
                multiline 
                rows={2}
                value={newOrder.customer_details.address}
                onChange={e => setNewOrder({...newOrder, customer_details: {...newOrder.customer_details, address: e.target.value}})}
              />
              {newOrder.id && (
                <TextField
                  select
                  label="Status"
                  fullWidth
                  size="small"
                  value={newOrder.status}
                  onChange={e => setNewOrder({...newOrder, status: e.target.value})}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="canceled">Canceled</MenuItem>
                  <MenuItem value="returned">Returned</MenuItem>
                </TextField>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Add Items</Typography>
              <Autocomplete
                options={allVariants}
                getOptionLabel={(option) => option.label}
                renderInput={(params) => <TextField {...params} label="Search Item" size="small" />}
                onChange={(e, value) => {
                  if (value) {
                    setNewOrder({
                      ...newOrder,
                      items: [...newOrder.items, { variant_id: value.id, name: value.itemName, size: value.size, quantity: 1, unit_price: 0 }]
                    });
                  }
                }}
              />
              
              <List sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                {newOrder.items.map((item, i) => (
                  <ListItem key={i} sx={{ px: 0 }}>
                    <ListItemText primary={`${item.name} (${item.size})`} />
                    <TextField 
                      label="Qty" 
                      type="number" 
                      size="small" 
                      sx={{ width: 70, mr: 1 }} 
                      value={item.quantity}
                      onChange={e => {
                        const items = [...newOrder.items];
                        items[i].quantity = parseInt(e.target.value) || 0;
                        setNewOrder({...newOrder, items});
                      }}
                    />
                    <TextField 
                      label="Price" 
                      type="number" 
                      size="small" 
                      sx={{ width: 100, mr: 1 }}
                      value={item.unit_price}
                      onChange={e => {
                        const items = [...newOrder.items];
                        items[i].unit_price = parseFloat(e.target.value) || 0;
                        setNewOrder({...newOrder, items});
                      }}
                    />
                    <IconButton size="small" onClick={() => {
                      const items = newOrder.items.filter((_, index) => index !== i);
                      setNewOrder({...newOrder, items});
                    }}>
                      <Delete />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              <TextField 
                label="Discount" 
                type="number" 
                size="small" 
                fullWidth 
                value={newOrder.discount}
                onChange={e => setNewOrder({...newOrder, discount: parseFloat(e.target.value) || 0})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); resetForm(); }}>{t('cancel')}</Button>
          <Button variant="contained" onClick={handleCreateOrder} disabled={newOrder.items.length === 0}>
            {newOrder.id ? t('saveChanges') : t('createOrder')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

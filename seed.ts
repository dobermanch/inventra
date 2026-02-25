import Database from 'better-sqlite3';

const db = new Database('inventory.db');

db.exec('DELETE FROM order_items');
db.exec('DELETE FROM orders');
db.exec('DELETE FROM restock_history');
db.exec('DELETE FROM item_variants');
db.exec('DELETE FROM items');
db.exec('DELETE FROM expense_invoices');
db.exec('DELETE FROM expenses');
db.exec("DELETE FROM categories WHERE name NOT IN ('Clothes', 'Shoes', 'Other')");

// ── Categories ───────────────────────────────────────────────────────────────
const cats = db.prepare('SELECT id, name FROM categories').all() as any[];
const catId = (name: string) => cats.find((c) => c.name === name)?.id as number;

// ── Items + Variants ─────────────────────────────────────────────────────────
const insertItem = db.prepare(
  'INSERT INTO items (name, description, picture_url, price, category_id, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertVariant = db.prepare(
  'INSERT INTO item_variants (item_id, size, stock_count) VALUES (?, ?, ?)'
);
const insertRestock = db.prepare(
  'INSERT INTO restock_history (variant_id, quantity, cost_per_unit, timestamp) VALUES (?, ?, ?, ?)'
);

const itemsData = [
  {
    name: 'Classic White Tee',
    description: 'Everyday staple, 100% cotton',
    price: 19.99,
    category: 'Clothes',
    threshold: 5,
    variants: [
      { size: 'S', stock: 12 },
      { size: 'M', stock: 20 },
      { size: 'L', stock: 8 },
      { size: 'XL', stock: 3 },
    ],
  },
  {
    name: 'Slim Fit Jeans',
    description: 'Stretch denim, dark wash',
    price: 59.99,
    category: 'Clothes',
    threshold: 4,
    variants: [
      { size: '30', stock: 6 },
      { size: '32', stock: 14 },
      { size: '34', stock: 9 },
      { size: '36', stock: 2 },
    ],
  },
  {
    name: 'Floral Summer Dress',
    description: 'Lightweight chiffon, knee-length',
    price: 44.99,
    category: 'Clothes',
    threshold: 3,
    variants: [
      { size: 'XS', stock: 5 },
      { size: 'S', stock: 11 },
      { size: 'M', stock: 7 },
    ],
  },
  {
    name: 'Running Sneakers',
    description: 'Breathable mesh upper, cushioned sole',
    price: 89.99,
    category: 'Shoes',
    threshold: 5,
    variants: [
      { size: '38', stock: 4 },
      { size: '39', stock: 10 },
      { size: '40', stock: 15 },
      { size: '41', stock: 8 },
      { size: '42', stock: 6 },
      { size: '43', stock: 3 },
    ],
  },
  {
    name: 'Leather Oxford',
    description: 'Full-grain leather, formal',
    price: 129.99,
    category: 'Shoes',
    threshold: 3,
    variants: [
      { size: '40', stock: 2 },
      { size: '41', stock: 5 },
      { size: '42', stock: 7 },
      { size: '43', stock: 4 },
    ],
  },
  {
    name: 'Canvas Tote Bag',
    description: 'Sturdy cotton canvas, 20L',
    price: 24.99,
    category: 'Other',
    threshold: 10,
    variants: [
      { size: 'One Size', stock: 30 },
    ],
  },
  {
    name: 'Wool Scarf',
    description: 'Merino wool blend, 180cm',
    price: 34.99,
    category: 'Other',
    threshold: 5,
    variants: [
      { size: 'One Size', stock: 18 },
    ],
  },
  {
    name: 'Hoodie - Navy',
    description: 'Pullover fleece, kangaroo pocket',
    price: 54.99,
    category: 'Clothes',
    threshold: 5,
    variants: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 9 },
      { size: 'L', stock: 7 },
      { size: 'XL', stock: 1 },
    ],
  },
];

const variantIds: number[] = [];

for (const item of itemsData) {
  const info = insertItem.run(
    item.name,
    item.description,
    '',
    item.price,
    catId(item.category),
    item.threshold
  );
  const itemId = info.lastInsertRowid;

  for (const v of item.variants) {
    const vInfo = insertVariant.run(itemId, v.size, v.stock);
    const vid = Number(vInfo.lastInsertRowid);
    variantIds.push(vid);

    // Restock history entry per variant
    const costPerUnit = +(item.price * 0.5).toFixed(2);
    insertRestock.run(vid, v.stock, costPerUnit, new Date(Date.now() - 30 * 86400000).toISOString());
  }
}

// ── Expenses ─────────────────────────────────────────────────────────────────
const insertExpense = db.prepare(
  'INSERT INTO expenses (name, details, category, subcategory, amount, quantity, total_amount, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

const expensesData = [
  { name: 'Store Rent', details: 'Monthly rent for main location', category: 'Operations', subcategory: 'Rent', amount: 1200, qty: 1, date: '2026-02-01' },
  { name: 'Electricity Bill', details: 'February electricity', category: 'Utilities', subcategory: 'Electricity', amount: 185.5, qty: 1, date: '2026-02-05' },
  { name: 'Packaging Supplies', details: '500 boxes + tissue paper', category: 'Supplies', subcategory: 'Packaging', amount: 3.2, qty: 500, date: '2026-02-07' },
  { name: 'Staff Wages', details: 'Part-time staff Feb 1–15', category: 'Payroll', subcategory: 'Wages', amount: 900, qty: 1, date: '2026-02-15' },
  { name: 'Instagram Ads', details: 'February campaign', category: 'Marketing', subcategory: 'Social Media', amount: 250, qty: 1, date: '2026-02-10' },
  { name: 'Supplier Invoice - Clothes', details: 'Restocking tees and jeans', category: 'Inventory', subcategory: 'Purchase', amount: 18.5, qty: 80, date: '2026-01-20' },
  { name: 'Supplier Invoice - Shoes', details: 'Running sneaker bulk order', category: 'Inventory', subcategory: 'Purchase', amount: 42, qty: 30, date: '2026-01-25' },
  { name: 'Internet & Phone', details: 'Monthly plan', category: 'Utilities', subcategory: 'Internet', amount: 75, qty: 1, date: '2026-02-03' },
];

for (const e of expensesData) {
  insertExpense.run(
    e.name, e.details, e.category, e.subcategory,
    e.amount, e.qty, +(e.amount * e.qty).toFixed(2), e.date
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────
const insertOrder = db.prepare(
  'INSERT INTO orders (status, customer_details, discount, total_amount, created_at) VALUES (?, ?, ?, ?, ?)'
);
const insertOrderItem = db.prepare(
  'INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
);
const deductStock = db.prepare(
  'UPDATE item_variants SET stock_count = stock_count - ? WHERE id = ?'
);

// Grab variant IDs by item name + size for readability
const getVariant = (itemName: string, size: string): number => {
  const row = db.prepare(`
    SELECT v.id FROM item_variants v
    JOIN items i ON v.item_id = i.id
    WHERE i.name = ? AND v.size = ?
  `).get(itemName, size) as any;
  return row?.id;
};

const ordersData = [
  {
    status: 'delivered',
    customer: { name: 'Alice Johnson', phone: '555-0101', address: '12 Maple St, Springfield' },
    discount: 0,
    items: [
      { itemName: 'Classic White Tee', size: 'M', qty: 2, price: 19.99 },
      { itemName: 'Slim Fit Jeans', size: '32', qty: 1, price: 59.99 },
    ],
    createdAt: '2026-02-03T10:22:00.000Z',
  },
  {
    status: 'shipped',
    customer: { name: 'Bob Martinez', phone: '555-0102', address: '7 Oak Ave, Shelbyville' },
    discount: 10,
    items: [
      { itemName: 'Running Sneakers', size: '42', qty: 1, price: 89.99 },
    ],
    createdAt: '2026-02-10T14:05:00.000Z',
  },
  {
    status: 'active',
    customer: { name: 'Clara Lee', phone: '555-0103', address: '3 Pine Rd, Capital City' },
    discount: 0,
    items: [
      { itemName: 'Floral Summer Dress', size: 'S', qty: 1, price: 44.99 },
      { itemName: 'Canvas Tote Bag', size: 'One Size', qty: 2, price: 24.99 },
    ],
    createdAt: '2026-02-18T09:15:00.000Z',
  },
  {
    status: 'active',
    customer: { name: 'David Kim', phone: '555-0104', address: '88 Birch Blvd, Ogdenville' },
    discount: 5,
    items: [
      { itemName: 'Hoodie - Navy', size: 'L', qty: 1, price: 54.99 },
      { itemName: 'Wool Scarf', size: 'One Size', qty: 1, price: 34.99 },
    ],
    createdAt: '2026-02-20T16:40:00.000Z',
  },
  {
    status: 'returned',
    customer: { name: 'Eva Rossi', phone: '555-0105', address: '2 Elm St, North Haverbrook' },
    discount: 0,
    items: [
      { itemName: 'Leather Oxford', size: '41', qty: 1, price: 129.99 },
    ],
    createdAt: '2026-02-12T11:00:00.000Z',
  },
  {
    status: 'canceled',
    customer: { name: 'Frank Nguyen', phone: '555-0106', address: '55 Walnut Way, Brockway' },
    discount: 0,
    items: [
      { itemName: 'Classic White Tee', size: 'L', qty: 3, price: 19.99 },
    ],
    createdAt: '2026-02-08T08:30:00.000Z',
  },
  {
    status: 'delivered',
    customer: { name: 'Grace Park', phone: '555-0107', address: '19 Cedar Ln, Springfield' },
    discount: 15,
    items: [
      { itemName: 'Running Sneakers', size: '39', qty: 1, price: 89.99 },
      { itemName: 'Slim Fit Jeans', size: '30', qty: 1, price: 59.99 },
    ],
    createdAt: '2026-01-28T13:20:00.000Z',
  },
  {
    status: 'delivered',
    customer: { name: 'Henry Walsh', phone: '555-0108', address: '6 Spruce Dr, Shelbyville' },
    discount: 0,
    items: [
      { itemName: 'Floral Summer Dress', size: 'M', qty: 2, price: 44.99 },
    ],
    createdAt: '2026-01-15T10:00:00.000Z',
  },
];

const placeOrder = db.transaction((order: typeof ordersData[0]) => {
  const lineItems = order.items.map((i) => ({
    ...i,
    variantId: getVariant(i.itemName, i.size),
  }));

  const subtotal = lineItems.reduce((s, i) => s + i.price * i.qty, 0);
  const total = +(subtotal - order.discount).toFixed(2);

  const info = insertOrder.run(
    order.status,
    JSON.stringify(order.customer),
    order.discount,
    total,
    order.createdAt
  );
  const orderId = info.lastInsertRowid;

  for (const li of lineItems) {
    insertOrderItem.run(orderId, li.variantId, li.qty, li.price);
    // Only deduct stock for non-canceled/returned orders
    if (order.status !== 'canceled' && order.status !== 'returned') {
      deductStock.run(li.qty, li.variantId);
    }
  }
});

for (const order of ordersData) {
  placeOrder(order);
}

console.log('✓ Database seeded successfully');
console.log(`  • ${itemsData.length} items with variants`);
console.log(`  • ${expensesData.length} expenses`);
console.log(`  • ${ordersData.length} orders`);

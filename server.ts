import http from "http";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
const expensesDataDir = path.join(dataDir, "expenses");
const inventoryDataDir = path.join(dataDir, "inventory");
const ordersDataDir = path.join(dataDir, "orders");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(expensesDataDir)) {
  fs.mkdirSync(expensesDataDir);
}
if (!fs.existsSync(inventoryDataDir)) {
  fs.mkdirSync(inventoryDataDir);
}
if (!fs.existsSync(ordersDataDir)) {
  fs.mkdirSync(ordersDataDir);
}

const db = new Database(path.join(dataDir, "inventory.db"));

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "invoice" || file.fieldname === "invoices") {
      cb(null, "data/expenses/");
    } else if (file.fieldname === "attachments") {
      cb(null, "data/orders/");
    } else {
      cb(null, "data/");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.includes("spreadsheetml") ||
      file.mimetype.includes("ms-excel");
    cb(null, ok);
  },
});

const VALID_ORDER_STATUSES = [
  "active",
  "shipped",
  "delivered",
  "canceled",
  "returned",
] as const;
type OrderStatusType = (typeof VALID_ORDER_STATUSES)[number];

function isValidOrderStatus(s: string): s is OrderStatusType {
  return (VALID_ORDER_STATUSES as readonly string[]).includes(s);
}

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    picture_url TEXT,
    price REAL DEFAULT 0,
    category_id INTEGER,
    low_stock_threshold INTEGER DEFAULT 5,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS item_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    size TEXT,
    stock_count INTEGER DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS restock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER,
    quantity INTEGER,
    cost_per_unit REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES item_variants(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    details TEXT,
    category TEXT,
    subcategory TEXT,
    amount REAL NOT NULL,
    quantity REAL DEFAULT 1,
    total_amount REAL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expense_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER,
    name TEXT,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL CHECK(status IN ('active', 'shipped', 'delivered', 'canceled', 'returned')),
    customer_details TEXT, -- JSON
    discount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME
  );

  CREATE TRIGGER IF NOT EXISTS trg_orders_status_insert
  BEFORE INSERT ON orders
  BEGIN
    SELECT CASE
      WHEN NEW.status NOT IN ('active', 'shipped', 'delivered', 'canceled', 'returned')
      THEN RAISE(ABORT, 'Invalid order status')
    END;
  END;

  CREATE TRIGGER IF NOT EXISTS trg_orders_status_update
  BEFORE UPDATE OF status ON orders
  BEGIN
    SELECT CASE
      WHEN NEW.status NOT IN ('active', 'shipped', 'delivered', 'canceled', 'returned')
      THEN RAISE(ABORT, 'Invalid order status')
    END;
  END;

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    variant_id INTEGER,
    quantity INTEGER,
    unit_price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (variant_id) REFERENCES item_variants(id)
  );

  CREATE TABLE IF NOT EXISTS order_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    name TEXT,
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Seed Default Settings
  INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD');
`);

async function startServer() {
  const app = express();

  // Trust reverse-proxy headers (X-Forwarded-For, X-Forwarded-Proto) when
  // TRUST_PROXY env var is set, e.g. TRUST_PROXY=1 or TRUST_PROXY=loopback.
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", process.env.TRUST_PROXY);
  }

  app.use(express.json());
  app.use("/data", express.static(path.join(__dirname, "data")));

  // API Routes

  // Dashboard Stats
  app.get("/api/dashboard", (req, res) => {
    try {
      const totalSales = db
        .prepare(
          "SELECT SUM(total_amount) as total FROM orders WHERE status NOT IN ('canceled', 'returned')",
        )
        .get() as any;
      const activeOrders = db
        .prepare(
          "SELECT COUNT(*) as count FROM orders WHERE status IN ('active')",
        )
        .get() as any;
      const shippedOrders = db
        .prepare(
          "SELECT COUNT(*) as count FROM orders WHERE status = 'shipped'",
        )
        .get() as any;
      const lowStockItems = db
        .prepare(
          `
        SELECT i.name, v.size, v.stock_count
        FROM items i
        JOIN item_variants v ON i.id = v.item_id
        WHERE v.stock_count <= i.low_stock_threshold AND i.is_deleted = 0
      `,
        )
        .all();
      const recentExpenses = db
        .prepare("SELECT * FROM expenses ORDER BY date DESC LIMIT 5")
        .all();

      const currentMonthSales = db
        .prepare(
          `
        SELECT SUM(total_amount) as total FROM orders
        WHERE status NOT IN ('canceled', 'returned')
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `,
        )
        .get() as any;

      const salesTrendsRaw = db
        .prepare(
          `
        SELECT strftime('%Y-%m', created_at) as month, SUM(total_amount) as total
        FROM orders
        WHERE status NOT IN ('canceled', 'returned')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
        LIMIT 12
      `,
        )
        .all() as any[];

      const salesTrends = salesTrendsRaw.reverse().map((row: any) => {
        return {
          name: row.month,
          sales: row.total || 0,
        };
      });

      const recentActiveOrdersRaw = db
        .prepare(
          `
        SELECT o.*,
          (SELECT json_group_array(json_object('id', oi.id, 'name', i.name, 'size', v.size, 'quantity', oi.quantity, 'unit_price', oi.unit_price))
           FROM order_items oi
           JOIN item_variants v ON oi.variant_id = v.id
           JOIN items i ON v.item_id = i.id
           WHERE oi.order_id = o.id) as items
        FROM orders o
        WHERE o.status IN ('active', 'shipped')
        ORDER BY o.created_at DESC
        LIMIT 10
      `,
        )
        .all() as any[];

      const recentActiveOrders = recentActiveOrdersRaw.map((o: any) => ({
        ...o,
        items: JSON.parse(o.items || "[]"),
      }));

      res.json({
        totalSales: totalSales?.total || 0,
        activeOrders: activeOrders?.count || 0,
        shippedOrders: shippedOrders?.count || 0,
        lowStockItems,
        recentExpenses,
        currentMonthSales: currentMonthSales?.total || 0,
        salesTrends,
        recentActiveOrders,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Categories
  app.get("/api/categories", (_req, res) => {
    const categories = db
      .prepare("SELECT * FROM categories ORDER BY name")
      .all();
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    // req used above for body
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(
      name.trim(),
    );
    const cat = db
      .prepare("SELECT * FROM categories WHERE name = ?")
      .get(name.trim());
    res.json(cat);
  });

  // Inventory
  app.get("/api/inventory", (req, res) => {
    try {
      const items = db
        .prepare(
          `
        SELECT i.*, c.name as category_name, 
               (SELECT json_group_array(json_object('id', v.id, 'size', v.size, 'stock_count', v.stock_count)) 
                FROM item_variants v WHERE v.item_id = i.id) as variants
        FROM items i
        JOIN categories c ON i.category_id = c.id
        WHERE i.is_deleted = 0
      `,
        )
        .all();

      res.json(
        items.map((item: any) => ({
          ...item,
          variants: JSON.parse(item.variants),
        })),
      );
    } catch (error) {
      console.error("Inventory fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/inventory", upload.single("image"), (req, res) => {
    try {
      const {
        name,
        description,
        category_id,
        low_stock_threshold,
        price,
        variants,
      } = req.body;
      const parsedVariants = JSON.parse(variants || "[]");

      const transaction = db.transaction(() => {
        const info = db
          .prepare(
            `
          INSERT INTO items (name, description, picture_url, price, category_id, low_stock_threshold)
          VALUES (:name, :description, :picture_url, :price, :category_id, :low_stock_threshold)
        `,
          )
          .run({
            name: name || "",
            description: description || "",
            picture_url: req.body.picture_url || "",
            price: parseFloat(price) || 0,
            category_id: parseInt(category_id) || 1,
            low_stock_threshold: parseInt(low_stock_threshold) || 5,
          });

        const itemId = info.lastInsertRowid;

        if (req.file) {
          const itemDir = path.join(inventoryDataDir, itemId.toString());
          if (!fs.existsSync(itemDir))
            fs.mkdirSync(itemDir, { recursive: true });
          const newPath = path.join(itemDir, req.file.filename);
          fs.renameSync(req.file.path, newPath);
          db.prepare("UPDATE items SET picture_url = ? WHERE id = ?").run(
            `/data/inventory/${itemId}/${req.file.filename}`,
            itemId,
          );
        }

        const insertVariant = db.prepare(
          "INSERT INTO item_variants (item_id, size, stock_count) VALUES (?, ?, ?)",
        );
        for (const v of parsedVariants) {
          insertVariant.run(itemId, v.size || "", parseInt(v.stock_count) || 0);
        }
        return itemId;
      });

      const itemId = transaction();
      res.status(201).json({ id: itemId });
    } catch (error) {
      console.error("Inventory create error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/inventory/:id", upload.single("image"), (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category_id,
        low_stock_threshold,
        price,
        variants,
      } = req.body;
      const parsedVariants = JSON.parse(variants || "[]");

      const item = db
        .prepare("SELECT picture_url FROM items WHERE id = ?")
        .get(id) as any;
      if (!item) return res.status(404).json({ error: "Item not found" });

      let picture_url = req.body.picture_url || item.picture_url;
      if (req.file) {
        const itemDir = path.join(inventoryDataDir, id.toString());
        if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true });
        const newPath = path.join(itemDir, req.file.filename);
        fs.renameSync(req.file.path, newPath);
        picture_url = `/data/inventory/${id}/${req.file.filename}`;
        // Delete old local file
        if (item.picture_url && item.picture_url.startsWith("/data/")) {
          const oldPath = path.join(__dirname, item.picture_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      const transaction = db.transaction(() => {
        db.prepare(
          `
          UPDATE items 
          SET name = :name, 
              description = :description, 
              picture_url = :picture_url, 
              price = :price, 
              category_id = :category_id, 
              low_stock_threshold = :low_stock_threshold 
          WHERE id = :id
        `,
        ).run({
          name: name || "",
          description: description || "",
          picture_url: picture_url || "",
          price: parseFloat(price) || 0,
          category_id: parseInt(category_id) || 1,
          low_stock_threshold: parseInt(low_stock_threshold) || 5,
          id: id,
        });

        // Preserve existing variant IDs to avoid breaking order_items / restock_history FK references.
        // UPDATE variants that already exist, INSERT new ones, and only DELETE removed variants
        // that are not referenced by any order or restock record.
        const existingVariants = db
          .prepare("SELECT id FROM item_variants WHERE item_id = ?")
          .all(id) as any[];
        const existingIds = new Set(
          existingVariants.map((v: any) => Number(v.id)),
        );
        const incomingIds = new Set(
          parsedVariants.filter((v: any) => v.id).map((v: any) => Number(v.id)),
        );

        const updateVariant = db.prepare(
          "UPDATE item_variants SET size = ?, stock_count = ? WHERE id = ? AND item_id = ?",
        );
        const insertVariant = db.prepare(
          "INSERT INTO item_variants (item_id, size, stock_count) VALUES (?, ?, ?)",
        );

        for (const v of parsedVariants) {
          if (v.id && existingIds.has(Number(v.id))) {
            updateVariant.run(
              v.size || "",
              parseInt(v.stock_count) || 0,
              v.id,
              id,
            );
          } else {
            insertVariant.run(id, v.size || "", parseInt(v.stock_count) || 0);
          }
        }

        // Only delete variants that were removed and have no FK references
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            const referencedByOrder = db
              .prepare("SELECT 1 FROM order_items WHERE variant_id = ? LIMIT 1")
              .get(existingId);
            const referencedByRestock = db
              .prepare(
                "SELECT 1 FROM restock_history WHERE variant_id = ? LIMIT 1",
              )
              .get(existingId);
            if (!referencedByOrder && !referencedByRestock) {
              db.prepare("DELETE FROM item_variants WHERE id = ?").run(
                existingId,
              );
            }
          }
        }
      });

      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Inventory update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/inventory/:id", (req, res) => {
    try {
      const { id } = req.params;
      const item = db
        .prepare("SELECT picture_url FROM items WHERE id = ?")
        .get(id) as any;
      if (item?.picture_url?.startsWith("/data/")) {
        const itemDir = path.join(inventoryDataDir, id.toString());
        if (fs.existsSync(itemDir))
          fs.rmSync(itemDir, { recursive: true, force: true });
      }
      db.prepare("UPDATE items SET is_deleted = 1 WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Inventory delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Restock
  app.post("/api/inventory/restock", (req, res) => {
    const { variant_id, quantity, cost_per_unit } = req.body;

    const transaction = db.transaction(() => {
      db.prepare(
        "UPDATE item_variants SET stock_count = stock_count + ? WHERE id = ?",
      ).run(quantity, variant_id);
      db.prepare(
        "INSERT INTO restock_history (variant_id, quantity, cost_per_unit) VALUES (?, ?, ?)",
      ).run(variant_id, quantity, cost_per_unit);
    });

    transaction();
    res.json({ success: true });
  });

  // Orders
  app.get("/api/orders", (req, res) => {
    const orders = db
      .prepare(
        `
      SELECT o.*,
             (SELECT json_group_array(json_object('id', oi.id, 'variant_id', oi.variant_id, 'name', i.name, 'size', v.size, 'quantity', oi.quantity, 'unit_price', oi.unit_price))
              FROM order_items oi
              JOIN item_variants v ON oi.variant_id = v.id
              JOIN items i ON v.item_id = i.id
              WHERE oi.order_id = o.id) as items
      FROM orders o
      ORDER BY o.created_at DESC
    `,
      )
      .all();

    const attachments = db
      .prepare("SELECT * FROM order_attachments")
      .all() as any[];

    res.json(
      orders.map((o: any) => ({
        ...o,
        items: JSON.parse(o.items),
        attachments: attachments.filter((a) => a.order_id === o.id),
      })),
    );
  });

  app.post("/api/orders", upload.array("attachments"), (req, res) => {
    const status = req.body.status;
    const customer_details = JSON.parse(req.body.customer_details || "{}");
    const discount = parseFloat(req.body.discount) || 0;
    const total_amount = parseFloat(req.body.total_amount) || 0;
    const items = JSON.parse(req.body.items || "[]");
    const notes = req.body.notes || null;
    const attachmentNames = JSON.parse(req.body.attachmentNames || "[]");

    if (!isValidOrderStatus(status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const transaction = db.transaction(() => {
      const info = db
        .prepare(
          "INSERT INTO orders (status, customer_details, discount, total_amount, notes) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          status,
          JSON.stringify(customer_details),
          discount,
          total_amount,
          notes || null,
        );

      const orderId = info.lastInsertRowid;
      const insertOrderItem = db.prepare(
        "INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
      );
      const updateStock = db.prepare(
        "UPDATE item_variants SET stock_count = stock_count - ? WHERE id = ?",
      );

      for (const item of items) {
        insertOrderItem.run(
          orderId,
          item.variant_id,
          item.quantity,
          item.unit_price,
        );
        updateStock.run(item.quantity, item.variant_id);
      }

      return orderId;
    });

    const orderId = transaction();

    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const orderDir = path.join(ordersDataDir, orderId.toString());
      if (!fs.existsSync(orderDir)) {
        fs.mkdirSync(orderDir, { recursive: true });
      }
      files.forEach((file, index) => {
        const newPath = path.join(orderDir, file.filename);
        fs.renameSync(file.path, newPath);
        const url = `/data/orders/${orderId}/${file.filename}`;
        const attName = attachmentNames[index] || file.originalname;
        db.prepare(
          "INSERT INTO order_attachments (order_id, name, url) VALUES (?, ?, ?)",
        ).run(orderId, attName, url);
      });
    }

    res.status(201).json({ id: orderId });
  });

  app.put("/api/orders/:id", upload.array("attachments"), (req, res) => {
    try {
      const { id } = req.params;
      const status = req.body.status;
      const customer_details = JSON.parse(req.body.customer_details || "{}");
      const discount = parseFloat(req.body.discount) || 0;
      const total_amount = parseFloat(req.body.total_amount) || 0;
      const items = JSON.parse(req.body.items || "[]");
      const notes = req.body.notes || null;
      const attachmentNames = JSON.parse(req.body.attachmentNames || "[]");
      const existingAttachments = JSON.parse(
        req.body.existingAttachments || "[]",
      );

      if (!isValidOrderStatus(status)) {
        return res.status(400).json({ error: "Invalid order status" });
      }

      const transaction = db.transaction(() => {
        // 1. Restore stock for existing items
        const oldItems = db
          .prepare(
            "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
          )
          .all(id) as any[];
        const restoreStock = db.prepare(
          "UPDATE item_variants SET stock_count = stock_count + ? WHERE id = ?",
        );
        for (const item of oldItems) {
          restoreStock.run(item.quantity, item.variant_id);
        }

        // 2. Delete old items
        db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);

        // 3. Update order metadata
        db.prepare(
          "UPDATE orders SET status = ?, customer_details = ?, discount = ?, total_amount = ?, notes = ? WHERE id = ?",
        ).run(
          status,
          JSON.stringify(customer_details),
          discount,
          total_amount,
          notes || null,
          id,
        );

        // 4. Insert new items and deduct stock
        const insertOrderItem = db.prepare(
          "INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        );
        const deductStock = db.prepare(
          "UPDATE item_variants SET stock_count = stock_count - ? WHERE id = ?",
        );

        for (const item of items) {
          insertOrderItem.run(
            id,
            item.variant_id,
            item.quantity,
            item.unit_price,
          );
          deductStock.run(item.quantity, item.variant_id);
        }
      });

      transaction();

      // Update existing attachment names
      existingAttachments.forEach((att: any) => {
        db.prepare(
          "UPDATE order_attachments SET name = ? WHERE id = ?",
        ).run(att.name, att.id);
      });

      // Handle new files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const orderDir = path.join(ordersDataDir, id.toString());
        if (!fs.existsSync(orderDir)) {
          fs.mkdirSync(orderDir, { recursive: true });
        }
        files.forEach((file, index) => {
          const newPath = path.join(orderDir, file.filename);
          fs.renameSync(file.path, newPath);
          const url = `/data/orders/${id}/${file.filename}`;
          const attName = attachmentNames[index] || file.originalname;
          db.prepare(
            "INSERT INTO order_attachments (order_id, name, url) VALUES (?, ?, ?)",
          ).run(id, attName, url);
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Order update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidOrderStatus(status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const transaction = db.transaction(() => {
      const oldOrder = db
        .prepare("SELECT status FROM orders WHERE id = ?")
        .get(id) as any;

      // If canceling or returning, restore inventory
      if (
        (status === "canceled" || status === "returned") &&
        oldOrder.status !== "canceled" &&
        oldOrder.status !== "returned"
      ) {
        const items = db
          .prepare(
            "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
          )
          .all(id) as any[];
        const updateStock = db.prepare(
          "UPDATE item_variants SET stock_count = stock_count + ? WHERE id = ?",
        );
        for (const item of items) {
          updateStock.run(item.quantity, item.variant_id);
        }
      }

      db.prepare(
        "UPDATE orders SET status = ?, returned_at = ? WHERE id = ?",
      ).run(
        status,
        status === "returned" ? new Date().toISOString() : null,
        id,
      );
    });

    transaction();
    res.json({ success: true });
  });

  app.delete("/api/orders/attachments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const attachment = db
        .prepare("SELECT * FROM order_attachments WHERE id = ?")
        .get(id) as any;

      if (attachment) {
        const relativePath = attachment.url.replace("/data/", "");
        const fullPath = path.join(dataDir, relativePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        db.prepare("DELETE FROM order_attachments WHERE id = ?").run(id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Attachment delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Expenses
  app.get("/api/expenses", (req, res) => {
    try {
      const expenses = db
        .prepare("SELECT * FROM expenses ORDER BY date DESC")
        .all() as any[];
      const invoices = db
        .prepare("SELECT * FROM expense_invoices")
        .all() as any[];

      const expensesWithInvoices = expenses.map((exp) => ({
        ...exp,
        invoices: invoices.filter((inv) => inv.expense_id === exp.id),
      }));

      res.json(expensesWithInvoices);
    } catch (error) {
      console.error("Expenses fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all() as any[];
      const settingsObj = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings", (req, res) => {
    try {
      const settings = req.body;
      const upsert = db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      );
      const transaction = db.transaction((settingsObj) => {
        for (const [key, value] of Object.entries(settingsObj)) {
          upsert.run(key, value);
        }
      });
      transaction(settings);
      res.json({ success: true });
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/expenses", upload.array("invoices"), (req, res) => {
    try {
      const {
        name,
        details,
        amount,
        quantity,
        total_amount,
        date,
        category,
        subcategory,
      } = req.body;
      const invoiceNames = JSON.parse(req.body.invoiceNames || "[]");

      const info = db
        .prepare(
          "INSERT INTO expenses (name, details, amount, quantity, total_amount, date, category, subcategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          name,
          details,
          parseFloat(amount) || 0,
          parseFloat(quantity) || 1,
          parseFloat(total_amount) || 0,
          date,
          category,
          subcategory,
        );

      const expenseId = info.lastInsertRowid;
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        const expenseDir = path.join(expensesDataDir, expenseId.toString());
        if (!fs.existsSync(expenseDir)) {
          fs.mkdirSync(expenseDir, { recursive: true });
        }

        files.forEach((file, index) => {
          const newPath = path.join(expenseDir, file.filename);
          fs.renameSync(file.path, newPath);
          const url = `/data/expenses/${expenseId}/${file.filename}`;
          const invName = invoiceNames[index] || file.originalname;

          db.prepare(
            "INSERT INTO expense_invoices (expense_id, name, url) VALUES (?, ?, ?)",
          ).run(expenseId, invName, url);
        });
      }

      res.status(201).json({ id: expenseId });
    } catch (error) {
      console.error("Expense create error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/expenses/:id", upload.array("invoices"), (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        details,
        amount,
        quantity,
        total_amount,
        date,
        category,
        subcategory,
      } = req.body;
      const invoiceNames = JSON.parse(req.body.invoiceNames || "[]");
      const existingInvoices = JSON.parse(req.body.existingInvoices || "[]"); // To update names of existing ones

      // Update basic info
      db.prepare(
        "UPDATE expenses SET name = ?, details = ?, amount = ?, quantity = ?, total_amount = ?, date = ?, category = ?, subcategory = ? WHERE id = ?",
      ).run(
        name,
        details,
        parseFloat(amount) || 0,
        parseFloat(quantity) || 1,
        parseFloat(total_amount) || 0,
        date,
        category,
        subcategory,
        id,
      );

      // Update existing invoice names
      existingInvoices.forEach((inv: any) => {
        db.prepare("UPDATE expense_invoices SET name = ? WHERE id = ?").run(
          inv.name,
          inv.id,
        );
      });

      // Handle new files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const expenseDir = path.join(expensesDataDir, id.toString());
        if (!fs.existsSync(expenseDir)) {
          fs.mkdirSync(expenseDir, { recursive: true });
        }

        files.forEach((file, index) => {
          const newPath = path.join(expenseDir, file.filename);
          fs.renameSync(file.path, newPath);
          const url = `/data/expenses/${id}/${file.filename}`;
          const invName = invoiceNames[index] || file.originalname;

          db.prepare(
            "INSERT INTO expense_invoices (expense_id, name, url) VALUES (?, ?, ?)",
          ).run(id, invName, url);
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Expense update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/expenses/invoices/:id", (req, res) => {
    try {
      const { id } = req.params;
      const invoice = db
        .prepare("SELECT * FROM expense_invoices WHERE id = ?")
        .get(id) as any;

      if (invoice) {
        const relativePath = invoice.url.replace("/data/", "");
        const fullPath = path.join(dataDir, relativePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

        db.prepare("DELETE FROM expense_invoices WHERE id = ?").run(id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Invoice delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/expenses/:id", (req, res) => {
    try {
      const { id } = req.params;
      const invoices = db
        .prepare("SELECT url FROM expense_invoices WHERE expense_id = ?")
        .all(id) as any[];

      invoices.forEach((inv) => {
        const relativePath = inv.url.replace("/data/", "");
        const fullPath = path.join(dataDir, relativePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });

      const expenseDir = path.join(expensesDataDir, id.toString());
      if (fs.existsSync(expenseDir))
        fs.rmSync(expenseDir, { recursive: true, force: true });

      db.prepare("DELETE FROM expense_invoices WHERE expense_id = ?").run(id);
      db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Expense delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Excel Export ──────────────────────────────────────────────────────────

  app.get("/api/export/inventory", (_req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT i.name AS "Name", i.description AS "Description",
                  COALESCE(c.name,'Uncategorized') AS "Category",
                  i.price AS "Price", i.low_stock_threshold AS "Low Stock Threshold",
                  v.size AS "Size", v.stock_count AS "Stock Count"
           FROM items i
           LEFT JOIN categories c ON i.category_id = c.id
           LEFT JOIN item_variants v ON v.item_id = i.id
           WHERE i.is_deleted = 0
           ORDER BY i.name, v.size`
        )
        .all();
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Inventory");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="inventory.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error) {
      console.error("Export inventory error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/export/orders", (_req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT o.id AS "Order ID",
                  JSON_EXTRACT(o.customer_details,'$.name') AS "Customer Name",
                  JSON_EXTRACT(o.customer_details,'$.phone') AS "Customer Phone",
                  JSON_EXTRACT(o.customer_details,'$.address') AS "Customer Address",
                  o.status AS "Status",
                  o.discount AS "Discount",
                  o.notes AS "Notes",
                  i.name AS "Product Name",
                  v.size AS "Size",
                  oi.quantity AS "Quantity",
                  oi.unit_price AS "Unit Price",
                  o.total_amount AS "Total Amount",
                  o.created_at AS "Created At"
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           LEFT JOIN item_variants v ON oi.variant_id = v.id
           LEFT JOIN items i ON v.item_id = i.id
           ORDER BY o.id`
        )
        .all();
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Orders");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="orders.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error) {
      console.error("Export orders error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/export/expenses", (_req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT name AS "Name", details AS "Details", category AS "Category",
                  subcategory AS "Subcategory", amount AS "Amount",
                  quantity AS "Quantity", total_amount AS "Total Amount", date AS "Date"
           FROM expenses ORDER BY date DESC`
        )
        .all();
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Expenses");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="expenses.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error) {
      console.error("Export expenses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Excel Templates ────────────────────────────────────────────────────────

  app.get("/api/export/template/inventory", (_req, res) => {
    const rows = [
      {
        Name: "Example T-Shirt",
        Description: "A comfortable cotton t-shirt",
        Category: "Clothes",
        Price: 29.99,
        "Low Stock Threshold": 5,
        Size: "M",
        "Stock Count": 10,
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Inventory");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="inventory_template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  app.get("/api/export/template/orders", (_req, res) => {
    const rows = [
      {
        "Customer Name": "Jane Doe",
        "Customer Phone": "+1 555-0100",
        "Customer Address": "123 Main St",
        Status: "active",
        Discount: 0,
        Notes: "",
        "Product Name": "Example T-Shirt",
        Size: "M",
        Quantity: 1,
        "Unit Price": 29.99,
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Orders");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="orders_template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  app.get("/api/export/template/expenses", (_req, res) => {
    const rows = [
      {
        Name: "Office Supplies",
        Details: "Pens, paper, etc.",
        Category: "Operations",
        Subcategory: "Supplies",
        Amount: 25.0,
        Quantity: 1,
        Date: new Date().toISOString().slice(0, 10),
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Expenses");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="expenses_template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // ── Excel Import ───────────────────────────────────────────────────────────

  app.post("/api/import/inventory", importUpload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      let created = 0;
      const errors: { row: number; message: string }[] = [];

      // Group rows by Name+Category so multiple sizes → one item
      const groups = new Map<string, any[]>();
      rows.forEach((row, idx) => {
        if (!row["Name"]) {
          errors.push({ row: idx + 2, message: "Name is required" });
          return;
        }
        const key = `${String(row["Name"]).trim()}||${String(row["Category"] || "").trim()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ ...row, __idx: idx + 2 });
      });

      const insertItem = db.transaction((rows: any[]) => {
        const first = rows[0];
        const itemName = String(first["Name"]).trim();
        const categoryName = first["Category"] ? String(first["Category"]).trim() : null;

        if (categoryName) {
          db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(categoryName);
        }
        const cat = categoryName
          ? (db.prepare("SELECT id FROM categories WHERE name = ?").get(categoryName) as any)
          : null;

        const result = db
          .prepare(
            `INSERT INTO items (name, description, price, category_id, low_stock_threshold)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(
            itemName,
            first["Description"] ?? null,
            parseFloat(first["Price"]) || 0,
            cat?.id ?? null,
            parseInt(first["Low Stock Threshold"]) || 5
          );

        const itemId = result.lastInsertRowid;
        rows.forEach((row) => {
          db.prepare(
            "INSERT INTO item_variants (item_id, size, stock_count) VALUES (?, ?, ?)"
          ).run(itemId, String(row["Size"] ?? "One Size").trim(), parseInt(row["Stock Count"]) || 0);
        });
        return rows.length;
      });

      groups.forEach((groupRows) => {
        try {
          insertItem(groupRows);
          created++;
        } catch (err: any) {
          errors.push({ row: groupRows[0].__idx, message: err.message });
        }
      });

      res.json({ created, errors });
    } catch (error) {
      console.error("Import inventory error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/import/orders", importUpload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      let created = 0;
      const errors: { row: number; message: string }[] = [];

      const insertOrder = db.transaction((row: any, rowIdx: number) => {
        const customerName = row["Customer Name"];
        if (!customerName) throw new Error("Customer Name is required");

        const productName = row["Product Name"];
        const size = row["Size"];
        if (!productName || !size) throw new Error("Product Name and Size are required");

        const variant = db
          .prepare(
            `SELECT v.id, v.stock_count FROM item_variants v
             JOIN items i ON v.item_id = i.id
             WHERE i.name = ? AND v.size = ? AND i.is_deleted = 0`
          )
          .get(String(productName).trim(), String(size).trim()) as any;

        if (!variant) throw new Error(`Product "${productName}" size "${size}" not found in inventory`);

        const qty = parseInt(row["Quantity"]) || 1;
        const unitPrice = parseFloat(row["Unit Price"]) || 0;
        const discount = parseFloat(row["Discount"]) || 0;
        const status = isValidOrderStatus(String(row["Status"] || "")) ? String(row["Status"]) as OrderStatusType : "active";

        const totalAmount = qty * unitPrice - discount;
        const customerDetails = JSON.stringify({
          name: String(customerName).trim(),
          phone: String(row["Customer Phone"] || "").trim(),
          address: String(row["Customer Address"] || "").trim(),
        });

        const orderResult = db
          .prepare(
            `INSERT INTO orders (status, customer_details, discount, total_amount, notes)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(status, customerDetails, discount, totalAmount, row["Notes"] ?? null);

        const orderId = orderResult.lastInsertRowid;
        db.prepare(
          "INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?)"
        ).run(orderId, variant.id, qty, unitPrice);

        db.prepare("UPDATE item_variants SET stock_count = stock_count - ? WHERE id = ?").run(qty, variant.id);
      });

      rows.forEach((row, idx) => {
        try {
          insertOrder(row, idx + 2);
          created++;
        } catch (err: any) {
          errors.push({ row: idx + 2, message: err.message });
        }
      });

      res.json({ created, errors });
    } catch (error) {
      console.error("Import orders error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/import/expenses", importUpload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, dateNF: "yyyy-mm-dd" });

      let created = 0;
      const errors: { row: number; message: string }[] = [];

      rows.forEach((row, idx) => {
        try {
          const name = row["Name"];
          if (!name) throw new Error("Name is required");

          const rawDate = row["Date"];
          if (!rawDate) throw new Error("Date is required");
          const dateStr = String(rawDate).slice(0, 10);

          const amount = parseFloat(row["Amount"]);
          if (isNaN(amount)) throw new Error("Amount must be a number");

          const quantity = parseFloat(row["Quantity"]) || 1;
          const totalAmount = amount * quantity;

          db.prepare(
            `INSERT INTO expenses (name, details, category, subcategory, amount, quantity, total_amount, date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            String(name).trim(),
            row["Details"] ?? null,
            row["Category"] ?? null,
            row["Subcategory"] ?? null,
            amount,
            quantity,
            totalAmount,
            dateStr
          );
          created++;
        } catch (err: any) {
          errors.push({ row: idx + 2, message: err.message });
        }
      });

      res.json({ created, errors });
    } catch (error) {
      console.error("Import expenses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const PORT = parseInt(process.env.PORT || "3000", 10);
  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "food_delivery_secret_key"; // In production, use environment variable

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database with tables
function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    courier_id INTEGER,
    delivery_address TEXT NOT NULL,
    required_due_time DATETIME NOT NULL,
    status TEXT DEFAULT 'pending',
    total_price REAL NOT NULL,
    estimated_delivery_time DATETIME,
    actual_delivery_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES users (id),
    FOREIGN KEY (customer_id) REFERENCES users (id),
    FOREIGN KEY (courier_id) REFERENCES users (id)
  )`);

  // Items table
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id)
  )`);

  // Pre-populated locations for simulated map
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    type TEXT NOT NULL
  )`);

  // Create restaurant menu items table
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    category TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES users (id)
  )`);

  // Insert sample locations if they don't exist
  db.get(`SELECT COUNT(*) as count FROM locations`, [], (err, row) => {
    if (err) {
      console.error('Error checking locations:', err);
      return;
    }

    if (row.count === 0) {
      // Insert restaurant
      db.run(`INSERT INTO locations (name, lat, lng, type) VALUES (?, ?, ?, ?)`,
        ["Restaurant HQ", 34.0522, -118.2437, "restaurant"]);

      // Insert customer addresses
      const customers = [
        ["Customer 1", 34.0511, -118.2428],
        ["Customer 2", 34.0544, -118.2401],
        ["Customer 3", 34.0496, -118.2500],
        ["Customer 4", 34.0578, -118.2389],
        ["Customer 5", 34.0463, -118.2356],
        ["Customer 6", 34.0602, -118.2456],
        ["Customer 7", 34.0493, -118.2308],
        ["Customer 8", 34.0622, -118.2537]
      ];

      customers.forEach(customer => {
        db.run(`INSERT INTO locations (name, lat, lng, type) VALUES (?, ?, ?, ?)`,
          [customer[0], customer[1], customer[2], "customer"]);
      });
    }
  });

  // Create demo restaurants if they don't exist
  db.get(`SELECT COUNT(*) as count FROM users WHERE role = ?`, ['merchant'], (err, row) => {
    if (err) {
      console.error('Error checking restaurants:', err);
      return;
    }

    if (row.count === 0) {
      // Create demo restaurants
      const demoRestaurants = [
        {
          name: "Burger Paradise",
          email: "burger@demo.com",
          password: "password123",
          address: "123 Burger St, Los Angeles, CA",
          menuItems: [
            { name: "Classic Burger", description: "Beef patty with lettuce, tomato, and special sauce", price: 8.99, category: "Burgers" },
            { name: "Cheeseburger", description: "Classic burger with American cheese", price: 9.99, category: "Burgers" },
            { name: "Bacon Burger", description: "Classic burger with crispy bacon", price: 10.99, category: "Burgers" },
            { name: "French Fries", description: "Crispy golden fries", price: 3.99, category: "Sides" },
            { name: "Soft Drink", description: "Cola, sprite, or lemonade", price: 1.99, category: "Drinks" }
          ]
        },
        {
          name: "Pizza Heaven",
          email: "pizza@demo.com",
          password: "password123",
          address: "456 Pizza Ave, Los Angeles, CA",
          menuItems: [
            { name: "Margherita Pizza", description: "Classic tomato and mozzarella", price: 12.99, category: "Pizzas" },
            { name: "Pepperoni Pizza", description: "Pepperoni with mozzarella", price: 14.99, category: "Pizzas" },
            { name: "Vegetarian Pizza", description: "Bell peppers, mushrooms, onions, and olives", price: 13.99, category: "Pizzas" },
            { name: "Garlic Bread", description: "Toasted bread with garlic butter", price: 4.99, category: "Sides" },
            { name: "Soda", description: "Various soft drinks", price: 1.99, category: "Drinks" }
          ]
        },
        {
          name: "Sushi Express",
          email: "sushi@demo.com",
          password: "password123",
          address: "789 Sushi Blvd, Los Angeles, CA",
          menuItems: [
            { name: "California Roll", description: "Crab, avocado, and cucumber", price: 6.99, category: "Rolls" },
            { name: "Spicy Tuna Roll", description: "Fresh tuna with spicy mayo", price: 7.99, category: "Rolls" },
            { name: "Salmon Nigiri", description: "Fresh salmon over rice", price: 5.99, category: "Nigiri" },
            { name: "Miso Soup", description: "Traditional Japanese soup", price: 2.99, category: "Sides" },
            { name: "Green Tea", description: "Hot or iced", price: 1.99, category: "Drinks" }
          ]
        }
      ];

      demoRestaurants.forEach(restaurant => {
        bcrypt.hash(restaurant.password, 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return;
          }

          db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
            [restaurant.name, restaurant.email, hash, 'merchant', restaurant.address],
            function(err) {
              if (err) {
                console.error('Error creating restaurant:', err);
                return;
              }

              const restaurantId = this.lastID;

              // Add menu items for this restaurant
              restaurant.menuItems.forEach(item => {
                db.run(`INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)`,
                  [restaurantId, item.name, item.description, item.price, item.category]);
              });
            });
        });
      });
    }
  });

  // Create an admin user if it doesn't exist
  db.get(`SELECT * FROM users WHERE email = ?`, ["admin@admin.com"], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }

    if (!row) {
      bcrypt.hash("admin123", 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }

        db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
          ["Admin", "admin@admin.com", hash, "admin", "Admin Office"]);
      });
    }
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Role-based authorization middleware
function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized for this resource' });
    }
    next();
  };
}

// Routes

// Register user
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, address } = req.body;
  
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  // Check if user exists
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (row) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ message: 'Error hashing password' });

      // Create new user
      db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
        [name, email, hash, role, address], function(err) {
          if (err) return res.status(500).json({ message: 'Error creating user' });

          const token = jwt.sign(
            { id: this.lastID, role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          return res.status(201).json({
            token,
            user: {
              id: this.lastID,
              name,
              email,
              role
            }
          });
      });
    });
  });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!row) return res.status(400).json({ message: 'Invalid credentials' });

    bcrypt.compare(password, row.password, (err, result) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!result) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign(
        { id: row.id, role: row.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role
        }
      });
    });
  });
});

// Get user profile
app.get('/api/users/me', authenticateToken, (req, res) => {
  db.get(`SELECT id, name, email, role, address FROM users WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!row) return res.status(404).json({ message: 'User not found' });

    res.json(row);
  });
});

// Get all restaurants
app.get('/api/restaurants', authenticateToken, (req, res) => {
  db.all(`SELECT id, name, address FROM users WHERE role = 'merchant'`, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(rows);
  });
});

// Get restaurant menu
app.get('/api/restaurants/:restaurantId/menu', authenticateToken, (req, res) => {
  const { restaurantId } = req.params;
  
  db.all(`SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category, name`, [restaurantId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(rows);
  });
});

// CUSTOMER ROUTES

// Create order (customer)
app.post('/api/customer/orders', authenticateToken, authorize(['customer']), (req, res) => {
  const { restaurant_id, items, total_price, delivery_address, required_due_time } = req.body;
  
  db.run(`INSERT INTO orders 
    (merchant_id, customer_id, delivery_address, required_due_time, total_price)
    VALUES (?, ?, ?, ?, ?)`,
    [restaurant_id, req.user.id, delivery_address, required_due_time, total_price],
    function(err) {
      if (err) {
        console.error('Error creating order:', err);
        return res.status(500).json({ message: 'Error creating order' });
      }
      
      const orderId = this.lastID;
      
      // Insert order items
      const insertItem = db.prepare(`INSERT INTO order_items 
        (order_id, name, price, quantity) VALUES (?, ?, ?, ?)`);
        
      items.forEach(item => {
        insertItem.run(orderId, item.name, item.price, item.quantity);
      });
      
      insertItem.finalize();
      
      res.status(201).json({ 
        message: 'Order created successfully',
        orderId 
      });
    }
  );
});

// Get customer orders
app.get('/api/customer/orders', authenticateToken, authorize(['customer']), (req, res) => {
  db.all(`SELECT o.*, u.name as restaurant_name, c.name as courier_name
    FROM orders o
    LEFT JOIN users u ON o.merchant_id = u.id
    LEFT JOIN users c ON o.courier_id = c.id
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows);
    }
  );
});

// MERCHANT ROUTES

// Create order (merchant)
app.post('/api/orders', authenticateToken, authorize(['merchant']), (req, res) => {
  const { customer_id, items, total_price, delivery_address, required_due_time } = req.body;
  
  db.run(`INSERT INTO orders 
    (merchant_id, customer_id, delivery_address, required_due_time, total_price)
    VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, customer_id, delivery_address, required_due_time, total_price],
    function(err) {
      if (err) {
        console.error('Error creating order:', err);
        return res.status(500).json({ message: 'Error creating order' });
      }
      
      const orderId = this.lastID;
      
      // Insert order items
      const insertItem = db.prepare(`INSERT INTO order_items 
        (order_id, name, price, quantity) VALUES (?, ?, ?, ?)`);
        
      items.forEach(item => {
        insertItem.run(orderId, item.name, item.price, item.quantity);
      });
      
      insertItem.finalize();
      
      res.status(201).json({ 
        message: 'Order created successfully',
        orderId 
      });
    }
  );
});

// Get merchant orders
app.get('/api/orders/merchant', authenticateToken, authorize(['merchant']), (req, res) => {
  db.all(`SELECT o.*, u.name as customer_name, c.name as courier_name
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.id
    LEFT JOIN users c ON o.courier_id = c.id
    WHERE o.merchant_id = ?
    ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows);
    }
  );
});

// COURIER ROUTES

// Get available orders for couriers
app.get('/api/orders/available', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`SELECT o.*, u.name as merchant_name, u.address as merchant_address
    FROM orders o
    JOIN users u ON o.merchant_id = u.id
    WHERE o.courier_id IS NULL AND o.status = 'pending'
    ORDER BY o.required_due_time ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows);
    }
  );
});

// Accept order (courier)
app.put('/api/orders/:orderId/accept', authenticateToken, authorize(['courier']), (req, res) => {
  const { orderId } = req.params;
  
  // Check if order exists and is available
  db.get(`SELECT * FROM orders WHERE id = ? AND courier_id IS NULL AND status = 'pending'`, 
    [orderId], 
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!row) return res.status(404).json({ message: 'Order not found or already assigned' });
      
      // Calculate estimated delivery time (30 minutes from now for this example)
      const now = new Date();
      const estimatedTime = new Date(now.getTime() + 30 * 60000).toISOString();
      
      // Assign courier to order
      db.run(`UPDATE orders SET 
        courier_id = ?, 
        status = 'accepted', 
        estimated_delivery_time = ?
        WHERE id = ?`, 
        [req.user.id, estimatedTime, orderId], 
        function(err) {
          if (err) return res.status(500).json({ message: 'Error accepting order' });
          if (this.changes === 0) return res.status(404).json({ message: 'Order not found' });
          
          res.json({ 
            message: 'Order accepted successfully',
            estimatedDeliveryTime: estimatedTime
          });
        }
      );
    }
  );
});

// Get courier's active orders
app.get('/api/orders/courier/active', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`SELECT o.*, 
    m.name as merchant_name, m.address as merchant_address,
    c.name as customer_name, o.delivery_address as customer_address
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    JOIN users c ON o.customer_id = c.id
    WHERE o.courier_id = ? AND o.status IN ('accepted', 'out-for-delivery')
    ORDER BY o.required_due_time ASC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows);
    }
  );
});

// Update order status
app.put('/api/orders/:orderId/status', authenticateToken, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  // Get current order
  db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], (err, order) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Check permissions based on role and status
    if (
      (req.user.role === 'courier' && order.courier_id != req.user.id) ||
      (req.user.role === 'merchant' && order.merchant_id != req.user.id && 
       !['preparing', 'cancelled'].includes(status)) ||
      (req.user.role === 'courier' && !['out-for-delivery', 'delivered'].includes(status)) ||
      (req.user.role !== 'admin' && req.user.role !== 'courier' && 
       req.user.role !== 'merchant')
    ) {
      return res.status(403).json({ message: 'Unauthorized to update this order' });
    }
    
    let updateQuery = `UPDATE orders SET status = ? WHERE id = ?`;
    let params = [status, orderId];
    
    // If order is delivered, set actual delivery time
    if (status === 'delivered') {
      updateQuery = `UPDATE orders SET status = ?, actual_delivery_time = CURRENT_TIMESTAMP WHERE id = ?`;
    }
    
    db.run(updateQuery, params, function(err) {
      if (err) return res.status(500).json({ message: 'Error updating order status' });
      if (this.changes === 0) return res.status(404).json({ message: 'Order not found' });
      
      res.json({ message: 'Order status updated successfully' });
    });
  });
});

// ADMIN ROUTES

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, authorize(['admin']), (req, res) => {
  db.all(`SELECT id, name, email, role, address, created_at FROM users`, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(rows);
  });
});

// Get all orders (admin only)
app.get('/api/admin/orders', authenticateToken, authorize(['admin']), (req, res) => {
  db.all(`SELECT o.*, 
    m.name as merchant_name, 
    c.name as customer_name,
    co.name as courier_name
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    JOIN users c ON o.customer_id = c.id
    LEFT JOIN users co ON o.courier_id = co.id
    ORDER BY o.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows);
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = app;

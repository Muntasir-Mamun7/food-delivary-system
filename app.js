const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database(':memory:');

// Initialize database
function initializeDatabase() {
  console.log('Initializing database...');
  
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating users table:', err);
      else console.log('Users table ready');
    });

    // Create orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      merchant_id INTEGER NOT NULL,
      courier_id INTEGER,
      status TEXT DEFAULT 'pending',
      total_price REAL NOT NULL,
      delivery_address TEXT NOT NULL,
      required_due_time TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES users(id),
      FOREIGN KEY(merchant_id) REFERENCES users(id),
      FOREIGN KEY(courier_id) REFERENCES users(id)
    )`, (err) => {
      if (err) console.error('Error creating orders table:', err);
      else console.log('Orders table ready');
    });

    // Create order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )`, (err) => {
      if (err) console.error('Error creating order_items table:', err);
      else console.log('Order items table ready');
    });

    // Create an admin user if it doesn't exist
    db.get(`SELECT * FROM users WHERE email = ?`, ["admin@admin.com"], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        return;
      }

      console.log("Checking for admin user:", row ? "Admin exists" : "Admin does not exist");

      if (!row) {
        console.log("Creating admin user...");
        bcrypt.hash("admin123", 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return;
          }

          db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
            ["Admin", "admin@admin.com", hash, "admin", "Admin Office"], function(err) {
              if (err) {
                console.error('Error creating admin user:', err);
              } else {
                console.log('Admin user created successfully with ID:', this.lastID);
              }
            });
        });
      }
    });

    // Insert sample users for testing
    bcrypt.hash("password123", 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return;
      }

      // Sample merchant
      db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
        ["Joe's Pizza", "joe@pizza.com", hash, "merchant", "123 Main St"], function(err) {
          if (err && err.code !== 'SQLITE_CONSTRAINT') {
            console.error('Error creating sample merchant:', err);
          }
        });

      // Sample courier
      db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
        ["Fast Delivery", "courier@fast.com", hash, "courier", "456 Delivery Rd"], function(err) {
          if (err && err.code !== 'SQLITE_CONSTRAINT') {
            console.error('Error creating sample courier:', err);
          }
        });

      // Sample customer
      db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
        ["John Smith", "john@example.com", hash, "customer", "789 Customer Ave"], function(err) {
          if (err && err.code !== 'SQLITE_CONSTRAINT') {
            console.error('Error creating sample customer:', err);
          }
        });
    });
  });
}

// Initialize database on server start
initializeDatabase();

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
}

// Authorization middleware
function authorize(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Authentication routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, address } = req.body;
  
  // Validate input
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // Check if user already exists
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Hashing error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      // Insert user
      db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`, 
        [name, email, hash, role, address || ''], function(err) {
          if (err) {
            console.error('Insert error:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          const userId = this.lastID;
          
          // Generate token
          const token = jwt.sign(
            { id: userId, email, role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          // Return user info and token
          res.json({
            token,
            user: {
              id: userId,
              name,
              email,
              role,
              address: address || ''
            }
          });
      });
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  // Get user
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Return user info and token
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address
        }
      });
    });
  });
});

// Order routes
app.post('/api/orders', authenticateToken, authorize(['merchant']), (req, res) => {
  const { customer_id, items, total_price, delivery_address, required_due_time } = req.body;
  const merchant_id = req.user.id;
  
  // Validate input
  if (!customer_id || !items || !items.length || !total_price || !delivery_address || !required_due_time) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // Check if customer exists
  db.get(`SELECT * FROM users WHERE id = ? AND role = 'customer'`, [customer_id], (err, customer) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!customer) {
      return res.status(400).json({ message: 'Customer not found' });
    }
    
    // Insert order
    db.run(`INSERT INTO orders (customer_id, merchant_id, total_price, delivery_address, required_due_time) 
      VALUES (?, ?, ?, ?, ?)`,
      [customer_id, merchant_id, total_price, delivery_address, required_due_time], function(err) {
        if (err) {
          return res.status(500).json({ message: 'Server error' });
        }
        
        const order_id = this.lastID;
        
        // Insert order items
        const insertItem = db.prepare(`INSERT INTO order_items (order_id, name, price, quantity) VALUES (?, ?, ?, ?)`);
        
        for (const item of items) {
          insertItem.run([order_id, item.name, item.price, item.quantity]);
        }
        
        insertItem.finalize();
        
        res.status(201).json({ message: 'Order created', order_id });
      }
    );
  });
});

app.get('/api/orders/merchant', authenticateToken, authorize(['merchant']), (req, res) => {
  db.all(`SELECT o.*, c.name as customer_name, co.name as courier_name
    FROM orders o
    JOIN users c ON o.customer_id = c.id
    LEFT JOIN users co ON o.courier_id = co.id
    WHERE o.merchant_id = ?
    ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json(orders);
    }
  );
});

app.get('/api/orders/available', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`SELECT o.*, m.name as merchant_name, m.address as merchant_address,
    c.name as customer_name
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    JOIN users c ON o.customer_id = c.id
    WHERE o.status = 'preparing' AND o.courier_id IS NULL
    ORDER BY o.required_due_time ASC`,
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json(orders);
    }
  );
});

app.put('/api/orders/:id/accept', authenticateToken, authorize(['courier']), (req, res) => {
  const orderId = req.params.id;
  const courierId = req.user.id;
  
  db.run(`UPDATE orders SET courier_id = ?, status = 'accepted' WHERE id = ? AND status = 'preparing'`,
    [courierId, orderId], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (this.changes === 0) {
        return res.status(400).json({ message: 'Order not available' });
      }
      
      res.json({ message: 'Order accepted' });
    }
  );
});

app.get('/api/orders/courier/active', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`SELECT o.*, 
    m.name as merchant_name, m.address as merchant_address,
    c.name as customer_name
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    JOIN users c ON o.customer_id = c.id
    WHERE o.courier_id = ? AND o.status IN ('accepted', 'out-for-delivery')
    ORDER BY o.required_due_time ASC`,
    [req.user.id],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json(orders);
    }
  );
});

app.put('/api/orders/:id/status', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'preparing', 'accepted', 'out-for-delivery', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  // Verify user has permission to update this order
  let query;
  let params;
  
  if (req.user.role === 'merchant') {
    query = `UPDATE orders SET status = ? 
      WHERE id = ? AND merchant_id = ? 
      AND status NOT IN ('accepted', 'out-for-delivery', 'delivered')`;
    params = [status, orderId, req.user.id];
  } else if (req.user.role === 'courier') {
    query = `UPDATE orders SET status = ? 
      WHERE id = ? AND courier_id = ? 
      AND status IN ('accepted', 'out-for-delivery')`;
    params = [status, orderId, req.user.id];
  } else if (req.user.role === 'admin') {
    query = `UPDATE orders SET status = ? WHERE id = ?`;
    params = [status, orderId];
  } else {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (this.changes === 0) {
      return res.status(400).json({ message: 'Could not update order' });
    }
    
    res.json({ message: 'Order updated' });
  });
});

// Admin routes
app.get('/api/admin/users', authenticateToken, authorize(['admin']), (req, res) => {
  db.all(`SELECT id, name, email, role, address, created_at FROM users`, (err, users) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    res.json(users);
  });
});

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
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json(orders);
    }
  );
});

// Get courier's active orders with time constraints
app.get('/api/orders/courier/time-analysis', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`
    SELECT o.*, 
      m.name as merchant_name, m.address as merchant_address,
      c.name as customer_name
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    JOIN users c ON o.customer_id = c.id
    WHERE o.courier_id = ? AND o.status IN ('accepted', 'out-for-delivery')
    ORDER BY o.required_due_time ASC`,
    [req.user.id],
    (err, orders) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(orders);
    }
  );
});

// Check if a courier can accept a new order based on time constraints
app.get('/api/orders/:orderId/time-check', authenticateToken, authorize(['courier']), (req, res) => {
  const orderId = req.params.orderId;
  const courierId = req.user.id;
  
  // First, get the order details
  db.get(`
    SELECT o.*,
      m.address as merchant_address,
      o.delivery_address as customer_address
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    WHERE o.id = ?`,
    [orderId],
    (err, order) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      
      // Then, get courier's current orders
      db.all(`
        SELECT o.*,
          m.address as merchant_address,
          o.delivery_address as customer_address
        FROM orders o
        JOIN users m ON o.merchant_id = m.id
        WHERE o.courier_id = ? AND o.status IN ('accepted', 'out-for-delivery')
        ORDER BY o.required_due_time ASC`,
        [courierId],
        (err, existingOrders) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          
          // Calculate time feasibility (simplified for demo)
          // In a real implementation, this would use a proper routing algorithm
          const timePerOrder = 30; // minutes per order (average)
          const pickupTime = 10; // minutes for pickup
          const deliveryTime = 10; // minutes for delivery
          
          let totalTimeNeeded = 0;
          
          // Calculate time needed for existing orders
          existingOrders.forEach(existingOrder => {
            totalTimeNeeded += timePerOrder;
          });
          
          // Add time for the new order
          totalTimeNeeded += timePerOrder;
          
          // Get current time and due time
          const currentTime = new Date();
          const dueTime = new Date(order.required_due_time);
          const minutesUntilDue = (dueTime - currentTime) / (1000 * 60);
          
          // Check if there's enough time
          const canDeliver = minutesUntilDue >= totalTimeNeeded;
          
          // Return the result
          res.json({
            canDeliver,
            minutesUntilDue: Math.round(minutesUntilDue),
            estimatedTimeNeeded: Math.round(totalTimeNeeded),
            existingOrdersCount: existingOrders.length,
            order
          });
        }
      );
    }
  );
});

// Customer routes
app.get('/api/orders/customer', authenticateToken, authorize(['customer']), (req, res) => {
  db.all(`SELECT o.*, 
    m.name as merchant_name,
    co.name as courier_name
    FROM orders o
    JOIN users m ON o.merchant_id = m.id
    LEFT JOIN users co ON o.courier_id = co.id
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json(orders);
    }
  );
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

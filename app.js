const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');

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
    delivery_lat REAL,
    delivery_lng REAL,
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
      // Insert restaurant - Now using Xianlin, Nanjing, China coordinates
      db.run(`INSERT INTO locations (name, lat, lng, type) VALUES (?, ?, ?, ?)`,
        ["Restaurant HQ", 32.1056, 118.9565, "restaurant"]);

      // Insert customer addresses - adjusted to be around Xianlin
      const customers = [
        ["Customer 1", 32.1046, 118.9555],
        ["Customer 2", 32.1066, 118.9575],
        ["Customer 3", 32.1036, 118.9545],
        ["Customer 4", 32.1076, 118.9585],
        ["Customer 5", 32.1026, 118.9535],
        ["Customer 6", 32.1086, 118.9595],
        ["Customer 7", 32.1016, 118.9525],
        ["Customer 8", 32.1096, 118.9605]
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
          address: "123 Xianlin Road, Nanjing, China",
          image: "burger-paradise.jpg",
          category: "Fast Food",
          rating: 4.5,
          deliveryTime: "25-35 min",
          menuItems: [
            { name: "Classic Burger", description: "Beef patty with lettuce, tomato, and special sauce", price: 8.99, category: "Burgers", image_url: "classic-burger.jpg" },
            { name: "Cheeseburger", description: "Classic burger with American cheese", price: 9.99, category: "Burgers", image_url: "cheeseburger.jpg" },
            { name: "Bacon Burger", description: "Classic burger with crispy bacon", price: 10.99, category: "Burgers", image_url: "bacon-burger.jpg" },
            { name: "French Fries", description: "Crispy golden fries", price: 3.99, category: "Sides", image_url: "french-fries.jpg" },
            { name: "Soft Drink", description: "Cola, sprite, or lemonade", price: 1.99, category: "Drinks", image_url: "soft-drink.jpg" }
          ]
        },
        {
          name: "Pizza Heaven",
          email: "pizza@demo.com",
          password: "password123",
          address: "456 Xianlin Ave, Nanjing, China",
          image: "pizza-heaven.jpg",
          category: "Italian",
          rating: 4.7,
          deliveryTime: "30-40 min",
          menuItems: [
            { name: "Margherita Pizza", description: "Classic tomato and mozzarella", price: 12.99, category: "Pizzas", image_url: "margherita-pizza.jpg" },
            { name: "Pepperoni Pizza", description: "Pepperoni with mozzarella", price: 14.99, category: "Pizzas", image_url: "pepperoni-pizza.jpg" },
            { name: "Vegetarian Pizza", description: "Bell peppers, mushrooms, onions, and olives", price: 13.99, category: "Pizzas", image_url: "vegetarian-pizza.jpg" },
            { name: "Garlic Bread", description: "Toasted bread with garlic butter", price: 4.99, category: "Sides", image_url: "garlic-bread.jpg" },
            { name: "Soda", description: "Various soft drinks", price: 1.99, category: "Drinks", image_url: "soda.jpg" }
          ]
        },
        {
          name: "Sushi Express",
          email: "sushi@demo.com",
          password: "password123",
          address: "789 Xianlin Blvd, Nanjing, China",
          image: "sushi-express.jpg",
          category: "Japanese",
          rating: 4.8,
          deliveryTime: "35-45 min",
          menuItems: [
            { name: "California Roll", description: "Crab, avocado, and cucumber", price: 6.99, category: "Rolls", image_url: "california-roll.jpg" },
            { name: "Spicy Tuna Roll", description: "Fresh tuna with spicy mayo", price: 7.99, category: "Rolls", image_url: "spicy-tuna-roll.jpg" },
            { name: "Salmon Nigiri", description: "Fresh salmon over rice", price: 5.99, category: "Nigiri", image_url: "salmon-nigiri.jpg" },
            { name: "Miso Soup", description: "Traditional Japanese soup", price: 2.99, category: "Sides", image_url: "miso-soup.jpg" },
            { name: "Green Tea", description: "Hot or iced", price: 1.99, category: "Drinks", image_url: "green-tea.jpg" }
          ]
        },
        {
          name: "Noodle House",
          email: "noodle@demo.com",
          password: "password123",
          address: "101 Xianlin North Road, Nanjing, China",
          image: "noodle-house.jpg",
          category: "Chinese",
          rating: 4.6,
          deliveryTime: "20-30 min",
          menuItems: [
            { name: "Beef Noodle Soup", description: "Slow-cooked beef with noodles in rich broth", price: 9.99, category: "Noodles", image_url: "beef-noodle.jpg" },
            { name: "Dan Dan Noodles", description: "Spicy Sichuan noodles with minced pork", price: 8.99, category: "Noodles", image_url: "dandan-noodles.jpg" },
            { name: "Vegetable Dumplings", description: "Steamed dumplings with mixed vegetables", price: 6.99, category: "Appetizers", image_url: "veg-dumplings.jpg" },
            { name: "Spring Rolls", description: "Crispy rolls with vegetables", price: 4.99, category: "Appetizers", image_url: "spring-rolls.jpg" },
            { name: "Jasmine Tea", description: "Traditional Chinese tea", price: 1.99, category: "Drinks", image_url: "jasmine-tea.jpg" }
          ]
        },
        {
          name: "Healthy Bites",
          email: "healthy@demo.com",
          password: "password123",
          address: "222 University Road, Nanjing, China",
          image: "healthy-bites.jpg",
          category: "Healthy",
          rating: 4.4,
          deliveryTime: "25-35 min",
          menuItems: [
            { name: "Superfood Salad", description: "Kale, quinoa, avocado, and mixed seeds", price: 10.99, category: "Salads", image_url: "superfood-salad.jpg" },
            { name: "Protein Bowl", description: "Grilled chicken, brown rice, and vegetables", price: 11.99, category: "Bowls", image_url: "protein-bowl.jpg" },
            { name: "Avocado Toast", description: "Whole grain toast with avocado and poached egg", price: 8.99, category: "Breakfast", image_url: "avocado-toast.jpg" },
            { name: "Fruit Smoothie", description: "Blended fresh fruits with yogurt", price: 5.99, category: "Drinks", image_url: "fruit-smoothie.jpg" },
            { name: "Energy Bar", description: "Oats, nuts, and honey", price: 3.99, category: "Snacks", image_url: "energy-bar.jpg" }
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
                db.run(`INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
                  [restaurantId, item.name, item.description, item.price, item.category, item.image_url]);
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
  
  // Create a demo customer if it doesn't exist
  db.get(`SELECT * FROM users WHERE email = ?`, ["customer@demo.com"], (err, row) => {
    if (err) {
      console.error('Error checking demo customer:', err);
      return;
    }

    if (!row) {
      bcrypt.hash("password123", 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }

        db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
          ["Demo Customer", "customer@demo.com", hash, "customer", "123 Customer Street, Xianlin, Nanjing"]);
      });
    }
  });
  
  // Create a demo courier if it doesn't exist
  db.get(`SELECT * FROM users WHERE email = ?`, ["courier@demo.com"], (err, row) => {
    if (err) {
      console.error('Error checking demo courier:', err);
      return;
    }

    if (!row) {
      bcrypt.hash("password123", 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }

        db.run(`INSERT INTO users (name, email, password, role, address) VALUES (?, ?, ?, ?, ?)`,
          ["Demo Courier", "courier@demo.com", hash, "courier", "456 Courier Road, Xianlin, Nanjing"]);
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

// Helper function for reverse geocoding
async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    return response.data.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
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

// Reverse geocode coordinates
app.get('/api/geocode/reverse', authenticateToken, async (req, res) => {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }
  
  try {
    const address = await reverseGeocode(lat, lng);
    if (address) {
      res.json({ address });
    } else {
      res.status(404).json({ message: 'Address not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Geocoding service error' });
  }
});

// CUSTOMER ROUTES

// Create order (customer)
app.post('/api/customer/orders', authenticateToken, authorize(['customer']), (req, res) => {
  const { restaurant_id, items, total_price, delivery_address, delivery_lat, delivery_lng, required_due_time } = req.body;
  
  db.run(`INSERT INTO orders 
    (merchant_id, customer_id, delivery_address, delivery_lat, delivery_lng, required_due_time, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [restaurant_id, req.user.id, delivery_address, delivery_lat, delivery_lng, required_due_time, total_price],
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
  const { customer_id, items, total_price, delivery_address, delivery_lat, delivery_lng, required_due_time } = req.body;
  
  db.run(`INSERT INTO orders 
    (merchant_id, customer_id, delivery_address, delivery_lat, delivery_lng, required_due_time, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [req.user.id, customer_id, delivery_address, delivery_lat, delivery_lng, required_due_time, total_price],
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

// Get merchant dashboard stats
app.get('/api/merchant/stats', authenticateToken, authorize(['merchant']), (req, res) => {
  const stats = {};
  
  // Get total orders
  db.get(`SELECT COUNT(*) as total FROM orders WHERE merchant_id = ?`, 
    [req.user.id], 
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      stats.totalOrders = row.total;
      
      // Get orders by status
      db.all(`SELECT status, COUNT(*) as count FROM orders 
        WHERE merchant_id = ? 
        GROUP BY status`, 
        [req.user.id], 
        (err, rows) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          
          stats.ordersByStatus = {};
          rows.forEach(row => {
            stats.ordersByStatus[row.status] = row.count;
          });
          
          // Get total revenue
          db.get(`SELECT SUM(total_price) as revenue FROM orders 
            WHERE merchant_id = ?`, 
            [req.user.id], 
            (err, row) => {
              if (err) return res.status(500).json({ message: 'Server error' });
              stats.totalRevenue = row.revenue || 0;
              
              res.json(stats);
            }
          );
        }
      );
    }
  );
});

// COURIER ROUTES

// Get available orders for couriers
app.get('/api/orders/available', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`SELECT o.*, u.name as merchant_name, u.address as merchant_address,
    o.delivery_lat, o.delivery_lng
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
      
      // Get current active orders for this courier to check if they can handle another
      db.all(`SELECT * FROM orders 
        WHERE courier_id = ? AND status IN ('accepted', 'out-for-delivery')`,
        [req.user.id],
        (err, activeOrders) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          
          // Check if courier can handle this order based on time constraints
          // This is where we would use the Dijkstra algorithm to determine feasibility
          // For now, we'll implement a simple time check
          
          const dueTime = new Date(row.required_due_time).getTime();
          const now = new Date().getTime();
          const estimatedDeliveryTime = now + 30 * 60000; // 30 minutes from now
          
          if (estimatedDeliveryTime > dueTime) {
            return res.status(400).json({ 
              message: 'You cannot accept this order as you may not be able to deliver it on time'
            });
          }
          
          // Assign courier to order
          db.run(`UPDATE orders SET 
            courier_id = ?, 
            status = 'accepted', 
            estimated_delivery_time = ?
            WHERE id = ?`, 
            [req.user.id, new Date(estimatedDeliveryTime).toISOString(), orderId], 
            function(err) {
              if (err) return res.status(500).json({ message: 'Error accepting order' });
              if (this.changes === 0) return res.status(404).json({ message: 'Order not found' });
              
              res.json({ 
                message: 'Order accepted successfully',
                estimatedDeliveryTime: new Date(estimatedDeliveryTime).toISOString()
              });
            }
          );
        }
      );
    }
  );
});

// Get courier's active orders
app.get('/api/orders/courier/active', authenticateToken, authorize(['courier']), (req, res) => {
  db.all(`SELECT o.*, 
    m.name as merchant_name, m.address as merchant_address,
    c.name as customer_name, o.delivery_address as customer_address,
    o.delivery_lat, o.delivery_lng
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

// Get courier dashboard stats
app.get('/api/courier/stats', authenticateToken, authorize(['courier']), (req, res) => {
  const stats = {};
  
  // Get total deliveries
  db.get(`SELECT COUNT(*) as total FROM orders WHERE courier_id = ?`, 
    [req.user.id], 
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      stats.totalDeliveries = row.total;
      
      // Get active deliveries
      db.get(`SELECT COUNT(*) as active FROM orders 
        WHERE courier_id = ? AND status IN ('accepted', 'out-for-delivery')`, 
        [req.user.id], 
        (err, row) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          stats.activeDeliveries = row.active;
          
          // Get completed deliveries
          db.get(`SELECT COUNT(*) as completed FROM orders 
            WHERE courier_id = ? AND status = 'delivered'`, 
            [req.user.id], 
            (err, row) => {
              if (err) return res.status(500).json({ message: 'Server error' });
              stats.completedDeliveries = row.completed;
              
              // Get earnings (simplified - could be more complex in real app)
              db.get(`SELECT SUM(total_price) * 0.1 as earnings FROM orders 
                WHERE courier_id = ? AND status = 'delivered'`, 
                [req.user.id], 
                (err, row) => {
                  if (err) return res.status(500).json({ message: 'Server error' });
                  stats.totalEarnings = row.earnings || 0;
                  
                  res.json(stats);
                }
              );
            }
          );
        }
      );
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
       !['cancelled'].includes(status)) ||
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

// Get admin dashboard stats
app.get('/api/admin/stats', authenticateToken, authorize(['admin']), (req, res) => {
  const stats = {};
  
  // Get user counts by role
  db.all(`SELECT role, COUNT(*) as count FROM users GROUP BY role`, 
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      
      stats.users = {};
      rows.forEach(row => {
        stats.users[row.role] = row.count;
      });
      
      // Get order counts by status
      db.all(`SELECT status, COUNT(*) as count FROM orders GROUP BY status`, 
        (err, rows) => {
          if (err) return res.status(500).json({ message: 'Server error' });
          
          stats.orders = {};
          rows.forEach(row => {
            stats.orders[row.status] = row.count;
          });
          
          // Get total revenue
          db.get(`SELECT SUM(total_price) as revenue FROM orders`, 
            (err, row) => {
              if (err) return res.status(500).json({ message: 'Server error' });
              stats.totalRevenue = row.revenue || 0;
              
              res.json(stats);
            }
          );
        }
      );
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = app;

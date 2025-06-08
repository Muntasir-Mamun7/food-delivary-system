document.addEventListener('DOMContentLoaded', function() {
  // Global variables
  const API_URL = ''; // Empty string for relative URLs in the same domain
  let token = localStorage.getItem('token');
  let currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Map related global variables
  let map;
  let merchantMap;
  let customerMap;
  let routingControl;
  let markers = [];
  let activeOrders = [];
  let availableOrders = [];
  
  // Default location - Xianlin, Nanjing, China
  const DEFAULT_LAT = 32.1056;
  const DEFAULT_LNG = 118.9565;

  // Order location coordinates
  let selectedDeliveryLat = DEFAULT_LAT;
  let selectedDeliveryLng = DEFAULT_LNG;
  let selectedCustomerLat = DEFAULT_LAT;
  let selectedCustomerLng = DEFAULT_LNG;
  let deliveryMarker = null;
  let customerDeliveryMarker = null;
  
  // Customer shopping cart
  let currentRestaurant = null;
  let cartItems = [];
  let cartTotal = 0;
  
  // Demo restaurant data
  const demoRestaurants = [
    {
      id: 1,
      name: "Burger Paradise",
      address: "123 Xianlin Road, Nanjing, China",
      image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80",
      logo: "https://via.placeholder.com/70x70",
      category: "Fast Food",
      rating: 4.5,
      deliveryTime: "25-35 min",
      tags: ["Burgers", "American", "Fast Food"]
    },
    {
      id: 2,
      name: "Pizza Heaven",
      address: "456 Xianlin Ave, Nanjing, China",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80",
      logo: "https://via.placeholder.com/70x70",
      category: "Italian",
      rating: 4.7,
      deliveryTime: "30-40 min",
      tags: ["Pizza", "Italian", "Pasta"]
    },
    {
      id: 3,
      name: "Sushi Express",
      address: "789 Xianlin Blvd, Nanjing, China",
      image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80",
      logo: "https://via.placeholder.com/70x70",
      category: "Japanese",
      rating: 4.8,
      deliveryTime: "35-45 min",
      tags: ["Sushi", "Japanese", "Asian"]
    },
    {
      id: 4,
      name: "Noodle House",
      address: "101 Xianlin North Road, Nanjing, China",
      image: "https://images.unsplash.com/photo-1552611052-33e04de081de?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80",
      logo: "https://via.placeholder.com/70x70",
      category: "Chinese",
      rating: 4.6,
      deliveryTime: "20-30 min",
      tags: ["Noodles", "Chinese", "Dumplings"]
    },
    {
      id: 5,
      name: "Healthy Bites",
      address: "222 University Road, Nanjing, China",
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80",
      logo: "https://via.placeholder.com/70x70",
      category: "Healthy",
      rating: 4.4,
      deliveryTime: "25-35 min",
      tags: ["Salad", "Healthy", "Vegan"]
    }
  ];
  
  // DOM Elements
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const authContainer = document.getElementById('auth-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const userInfo = document.getElementById('user-info');
  const userName = document.getElementById('user-name');
  const userRole = document.getElementById('user-role');
  const logoutBtn = document.getElementById('logout-btn');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const formContainers = document.querySelectorAll('.form-container');
  const dashboards = document.querySelectorAll('.user-dashboard');
  
  // Initialize dashboard navigation
  function initDashboardNav() {
    const dashboardNavLinks = document.querySelectorAll('.nav-menu li');
    
    dashboardNavLinks.forEach(link => {
      link.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section');
        const sections = document.querySelectorAll('.dashboard-section');
        
        // Update active link
        dashboardNavLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        // Show corresponding section
        sections.forEach(section => {
          if (section.id === sectionId) {
            section.classList.add('active');
          } else {
            section.classList.remove('active');
          }
        });
      });
    });
  }
  
  // Tab switching for auth forms
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding form
      formContainers.forEach(container => {
        if (container.id === `${tabName}-form`) {
          container.classList.add('active');
        } else {
          container.classList.remove('active');
        }
      });
    });
  });
  
  // Handle Login
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      token = data.token;
      currentUser = data.user;
      
      // Show dashboard
      errorElement.textContent = '';
      showDashboard();
      
    } catch (error) {
      errorElement.textContent = error.message;
    }
  });
  
  // Handle Register
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const address = document.getElementById('register-address').value;
    const errorElement = document.getElementById('register-error');
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role, address })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      token = data.token;
      currentUser = data.user;
      
      // Show dashboard
      errorElement.textContent = '';
      showDashboard();
      
    } catch (error) {
      errorElement.textContent = error.message;
    }
  });
  
  // Logout
  logoutBtn.addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    
    showAuthForms();
  });
  
  // Show dashboard based on user role
  function showDashboard() {
    if (!currentUser) return;
    
    // Update user info display
    userName.textContent = currentUser.name;
    userRole.textContent = currentUser.role;
    
    // Initialize dashboard navigation
    initDashboardNav();
    
    // Set name in role-specific header
    if (document.getElementById(`${currentUser.role}-name`)) {
      document.getElementById(`${currentUser.role}-name`).textContent = currentUser.name;
    }
    
    // Hide auth forms, show dashboard
    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    
    // Show the right dashboard based on role
    dashboards.forEach(dashboard => {
      if (dashboard.id === `${currentUser.role}-dashboard`) {
        dashboard.classList.remove('hidden');
      } else {
        dashboard.classList.add('hidden');
      }
    });
    
    // Load role-specific data
    switch(currentUser.role) {
      case 'merchant':
        loadMerchantDashboard();
        break;
      case 'courier':
        loadCourierDashboard();
        break;
      case 'admin':
        loadAdminDashboard();
        break;
      case 'customer':
        loadCustomerDashboard();
        break;
    }
  }
  
  // Show authentication forms
  function showAuthForms() {
    authContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    userInfo.classList.add('hidden');
    
    // Reset forms
    loginForm.reset();
    registerForm.reset();
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
  }
  
  // Helper function for API calls
  async function apiCall(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API call failed');
      }
      
      return data;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }
  
  // Reverse geocode coordinates
  async function reverseGeocode(lat, lng) {
    try {
      const response = await apiCall(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      return response.address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }
  
  // Merchant Dashboard Functions
  function loadMerchantDashboard() {
    // Load merchant statistics
    loadMerchantStats();
    
    // Load merchant orders
    loadMerchantOrders();
    
    // Initialize merchant map
    initializeMerchantMap();
    
    // Calculate order total
    updateOrderTotal();
    
    // Setup order creation form
    const createOrderForm = document.getElementById('create-order-form');
    const addItemBtn = document.getElementById('add-item-btn');
    const orderItemsContainer = document.getElementById('order-items');
    
    // Add new item row
    addItemBtn.addEventListener('click', function() {
      const itemRow = document.createElement('div');
      itemRow.className = 'order-item';
      itemRow.innerHTML = `
        <input type="text" placeholder="Item name" class="item-name" required>
        <input type="number" placeholder="Price" class="item-price" step="0.01" required>
        <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="1" required>
        <button type="button" class="remove-item"><i class="fas fa-trash"></i></button>
      `;
      
      orderItemsContainer.appendChild(itemRow);
      
      // Setup remove button
      itemRow.querySelector('.remove-item').addEventListener('click', function() {
        itemRow.remove();
        updateOrderTotal();
      });
      
      // Add change listeners for price and quantity
      const priceInput = itemRow.querySelector('.item-price');
      const quantityInput = itemRow.querySelector('.item-quantity');
      
      priceInput.addEventListener('input', updateOrderTotal);
      quantityInput.addEventListener('input', updateOrderTotal);
    });
    
    // Add change listeners for existing items
    document.querySelectorAll('.item-price, .item-quantity').forEach(input => {
      input.addEventListener('input', updateOrderTotal);
    });
    
    // Submit order form
    createOrderForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      try {
        const customerId = document.getElementById('customer-id').value;
        const deliveryAddress = document.getElementById('delivery-address').value;
        const dueTime = document.getElementById('due-time').value;
        
        if (!selectedDeliveryLat || !selectedDeliveryLng) {
          alert('Please select a delivery location on the map.');
          return;
        }
        
        // Collect items
        const itemElements = orderItemsContainer.querySelectorAll('.order-item');
        const items = [];
        let totalPrice = 0;
        
        itemElements.forEach(itemEl => {
          const name = itemEl.querySelector('.item-name').value;
          const price = parseFloat(itemEl.querySelector('.item-price').value);
          const quantity = parseInt(itemEl.querySelector('.item-quantity').value);
          
          items.push({ name, price, quantity });
          totalPrice += price * quantity;
        });
        
        // Create order
        await apiCall('/api/orders', 'POST', {
          customer_id: customerId,
          items,
          total_price: totalPrice,
          delivery_address: deliveryAddress,
          delivery_lat: selectedDeliveryLat,
          delivery_lng: selectedDeliveryLng,
          required_due_time: dueTime
        });
        
        // Reset form and reload orders
        createOrderForm.reset();
        
        // Reset the map marker
        if (deliveryMarker) {
          merchantMap.removeLayer(deliveryMarker);
          deliveryMarker = null;
        }
        
        document.getElementById('delivery-address-display').textContent = 'None selected';
        document.getElementById('delivery-lat').value = '0';
        document.getElementById('delivery-lng').value = '0';
        selectedDeliveryLat = DEFAULT_LAT;
        selectedDeliveryLng = DEFAULT_LNG;
        
        // Keep only one item row
        while (orderItemsContainer.children.length > 1) {
          orderItemsContainer.removeChild(orderItemsContainer.lastChild);
        }
        
        // Reset the first item row
        const firstItemRow = orderItemsContainer.querySelector('.order-item');
        if (firstItemRow) {
          firstItemRow.querySelector('.item-name').value = '';
          firstItemRow.querySelector('.item-price').value = '';
          firstItemRow.querySelector('.item-quantity').value = '1';
        }
        
        // Update order total
        updateOrderTotal();
        
        // Reload orders and stats
        loadMerchantOrders();
        loadMerchantStats();
        
        alert('Order created successfully!');
        
      } catch (error) {
        alert(`Error creating order: ${error.message}`);
      }
    });
    
    // Handle order status filter
    const statusFilter = document.getElementById('order-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function() {
        const status = this.value;
        const orders = document.querySelectorAll('.order-card');
        
        orders.forEach(order => {
          const orderStatus = order.getAttribute('data-status');
          if (status === 'all' || orderStatus === status) {
            order.style.display = 'block';
          } else {
            order.style.display = 'none';
          }
        });
      });
    }
    
    // Handle order search
    const orderSearch = document.getElementById('order-search');
    const orderSearchBtn = document.getElementById('order-search-btn');
    
    if (orderSearch && orderSearchBtn) {
      orderSearchBtn.addEventListener('click', function() {
        searchOrders(orderSearch.value);
      });
      
      orderSearch.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchOrders(this.value);
        }
      });
    }
  }
  
  function searchOrders(query) {
    query = query.toLowerCase();
    const orders = document.querySelectorAll('.order-card');
    
    orders.forEach(order => {
      const text = order.textContent.toLowerCase();
      if (text.includes(query) || query === '') {
        order.style.display = 'block';
      } else {
        order.style.display = 'none';
      }
    });
  }
  
  function updateOrderTotal() {
    let total = 0;
    const items = document.querySelectorAll('.order-item');
    
    items.forEach(item => {
      const price = parseFloat(item.querySelector('.item-price').value) || 0;
      const quantity = parseInt(item.querySelector('.item-quantity').value) || 0;
      total += price * quantity;
    });
    
    document.getElementById('order-total').textContent = total.toFixed(2);
  }
  
  async function loadMerchantStats() {
    try {
      const stats = await apiCall('/api/merchant/stats');
      
      // Update dashboard stats
      document.getElementById('total-orders').textContent = stats.totalOrders || 0;
      document.getElementById('pending-orders').textContent = stats.ordersByStatus?.pending || 0;
      document.getElementById('in-delivery-orders').textContent = 
        (stats.ordersByStatus?.accepted || 0) + (stats.ordersByStatus?.['out-for-delivery'] || 0);
      document.getElementById('total-revenue').textContent = `$${(stats.totalRevenue || 0).toFixed(2)}`;
      
      // Load recent orders for the overview section
      loadRecentOrders();
      
    } catch (error) {
      console.error('Error loading merchant stats:', error);
    }
  }
  
  async function loadRecentOrders() {
    try {
      const orders = await apiCall('/api/orders/merchant');
      const recentOrdersList = document.getElementById('recent-orders');
      
      // Display only the 5 most recent orders
      const recentOrders = orders.slice(0, 5);
      
      if (recentOrders.length === 0) {
        recentOrdersList.innerHTML = '<p>No orders found.</p>';
        return;
      }
      
      recentOrdersList.innerHTML = '';
      
      recentOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Format date
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleString();
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Created:</strong> ${formattedDate}</p>
            <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status}</span></p>
            <p><strong>Total:</strong> $${order.total_price.toFixed(2)}</p>
          </div>
        `;
        
        recentOrdersList.appendChild(orderCard);
      });
      
    } catch (error) {
      console.error('Error loading recent orders:', error);
      document.getElementById('recent-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  function initializeMerchantMap() {
    const mapElement = document.getElementById('merchant-map');
    if (!mapElement) return;
    
    // Initialize map centered on Xianlin, Nanjing
    merchantMap = L.map('merchant-map').setView([DEFAULT_LAT, DEFAULT_LNG], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(merchantMap);
    
    // Add click handler to set delivery location
    merchantMap.on('click', async function(e) {
      // Remove previous marker if exists
      if (deliveryMarker) {
        merchantMap.removeLayer(deliveryMarker);
      }
      
      // Add a new marker at the clicked location
      deliveryMarker = L.marker(e.latlng).addTo(merchantMap);
      deliveryMarker.bindPopup("Delivery Location").openPopup();
      
      // Update coordinates
      selectedDeliveryLat = e.latlng.lat;
      selectedDeliveryLng = e.latlng.lng;
      
      // Update form fields
      document.getElementById('delivery-lat').value = selectedDeliveryLat;
      document.getElementById('delivery-lng').value = selectedDeliveryLng;
      
      // Try to get address from coordinates
      try {
        const address = await reverseGeocode(selectedDeliveryLat, selectedDeliveryLng);
        document.getElementById('delivery-address-display').textContent = address;
        document.getElementById('delivery-address').value = address;
      } catch (error) {
        document.getElementById('delivery-address-display').textContent = 
          `${selectedDeliveryLat.toFixed(6)}, ${selectedDeliveryLng.toFixed(6)}`;
      }
    });
  }
  
  async function loadMerchantOrders() {
    try {
      const orders = await apiCall('/api/orders/merchant');
      const ordersList = document.getElementById('merchant-orders-list');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        orderCard.setAttribute('data-status', order.status);
        
        // Format dates
        const createdDate = new Date(order.created_at).toLocaleString();
        const requiredDate = new Date(order.required_due_time).toLocaleString();
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Created:</strong> ${createdDate}</p>
            <p><strong>Required By:</strong> ${requiredDate}</p>
            <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status}</span></p>
            <p><strong>Total Price:</strong> $${order.total_price.toFixed(2)}</p>
            ${order.courier_name ? `<p><strong>Courier:</strong> ${order.courier_name}</p>` : ''}
          </div>
          <div class="order-card-actions">
            ${order.status === 'pending' || order.status === 'preparing' ? 
              `<button class="update-status" data-id="${order.id}" data-status="cancelled"><i class="fas fa-times"></i> Cancel Order</button>` : ''}
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
      // Add event listeners to buttons
      document.querySelectorAll('.update-status').forEach(button => {
        button.addEventListener('click', async function() {
          const orderId = this.getAttribute('data-id');
          const status = this.getAttribute('data-status');
          
          try {
            await apiCall(`/api/orders/${orderId}/status`, 'PUT', { status });
            loadMerchantOrders();
            loadMerchantStats();
          } catch (error) {
            alert(`Error updating order: ${error.message}`);
          }
        });
      });
      
    } catch (error) {
      console.error('Error loading merchant orders:', error);
      document.getElementById('merchant-orders-list').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Courier Dashboard Functions
  function loadCourierDashboard() {
    // Load courier stats
    loadCourierStats();
    
    // Initialize map first
    setupMap();
    
    // Load available orders
    loadAvailableOrders();
    
    // Load active orders
    loadActiveOrders();
    
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (currentUser && currentUser.role === 'courier') {
        loadAvailableOrders();
        loadActiveOrders();
        showAvailableOrdersOnMap(); // Show available orders on map
        loadActiveOrdersWithLocations(); // Refresh the map data too
      } else {
        clearInterval(refreshInterval);
      }
    }, 30000);
  }
  
  async function loadCourierStats() {
    try {
      const stats = await apiCall('/api/courier/stats');
      
      // Update dashboard stats
      document.getElementById('active-deliveries').textContent = stats.activeDeliveries || 0;
      document.getElementById('completed-deliveries').textContent = stats.completedDeliveries || 0;
      document.getElementById('total-deliveries').textContent = stats.totalDeliveries || 0;
      document.getElementById('total-earnings').textContent = `$${(stats.totalEarnings || 0).toFixed(2)}`;
      
      // Update courier status badge
      const statusBadge = document.getElementById('courier-status');
      if (statusBadge) {
        if (stats.activeDeliveries > 0) {
          statusBadge.textContent = 'Busy';
          statusBadge.className = 'status-badge busy';
          statusBadge.nextElementSibling.textContent = 'You are currently delivering orders.';
        } else {
          statusBadge.textContent = 'Available';
          statusBadge.className = 'status-badge available';
          statusBadge.nextElementSibling.textContent = 'You are currently available for new deliveries.';
        }
      }
      
    } catch (error) {
      console.error('Error loading courier stats:', error);
    }
  }
  
  async function loadAvailableOrders() {
    try {
      availableOrders = await apiCall('/api/orders/available');
      const ordersList = document.getElementById('available-orders');
      
      if (availableOrders.length === 0) {
        ordersList.innerHTML = '<p>No available orders at the moment.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      availableOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Calculate if order can be delivered on time (simplified)
        const dueTime = new Date(order.required_due_time).getTime();
        const now = new Date().getTime();
        const timeLeft = Math.floor((dueTime - now) / (1000 * 60)); // Minutes left
        
        const isUrgent = timeLeft < 45; // Less than 45 minutes is considered urgent
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${order.merchant_address}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Time Left:</strong> <span style="color: ${isUrgent ? 'red' : 'green'}; font-weight: bold;">
              ${timeLeft} minutes
            </span></p>
            <p><strong>Total Price:</strong> $${order.total_price.toFixed(2)}</p>
          </div>
          <div class="order-card-actions">
            <button class="accept-order" data-id="${order.id}">
              <i class="fas fa-check-circle"></i> Accept Order
            </button>
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
      // Add event listeners to buttons
      document.querySelectorAll('.accept-order').forEach(button => {
        button.addEventListener('click', async function() {
          const orderId = this.getAttribute('data-id');
          
          try {
            await apiCall(`/api/orders/${orderId}/accept`, 'PUT');
            loadAvailableOrders();
            loadActiveOrders();
            loadCourierStats();
            showAvailableOrdersOnMap(); // Update available orders on map
            loadActiveOrdersWithLocations(); // Refresh map after accepting an order
          } catch (error) {
            alert(`Error accepting order: ${error.message}`);
          }
        });
      });
      
      // Show available orders on map
      showAvailableOrdersOnMap();
      
    } catch (error) {
      console.error('Error loading available orders:', error);
      document.getElementById('available-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Display available orders on map
  function showAvailableOrdersOnMap() {
    if (!map) return;
    
    // Clear existing markers
    clearMarkers();
    
    // Add courier's location marker
    addCourierLocationMarker();
    
    // Add markers for available orders
    availableOrders.forEach(order => {
      if (order.delivery_lat && order.delivery_lng) {
        const marker = L.marker([order.delivery_lat, order.delivery_lng], {
          icon: createCustomIcon('red')
        }).addTo(map);
        
        const popupContent = `
          <div class="popup-content">
            <h4>Order #${order.id}</h4>
            <p><strong>Restaurant:</strong> ${order.merchant_name}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Total:</strong> $${order.total_price.toFixed(2)}</p>
            <button class="popup-accept-btn" data-id="${order.id}">Accept Order</button>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
        
        // Add click event to the popup accept button after it's opened
        marker.on('popupopen', function() {
          const acceptBtn = document.querySelector(`.popup-accept-btn[data-id="${order.id}"]`);
          if (acceptBtn) {
            acceptBtn.addEventListener('click', async function() {
              try {
                await apiCall(`/api/orders/${order.id}/accept`, 'PUT');
                marker.closePopup();
                loadAvailableOrders();
                loadActiveOrders();
                loadCourierStats();
                loadActiveOrdersWithLocations();
              } catch (error) {
                alert(`Error accepting order: ${error.message}`);
              }
            });
          }
        });
      }
    });
    
    // Fit map to show all markers if there are any
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }
  
  // Add courier's current location marker
  function addCourierLocationMarker() {
    if (!map) return;
    
    // Try to get the courier's current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const courierMarker = L.marker([position.coords.latitude, position.coords.longitude], {
          icon: createCustomIcon('green')
        }).addTo(map);
        courierMarker.bindPopup("Your Current Location").openPopup();
        markers.push(courierMarker);
      },
      (error) => {
        console.error("Error getting courier location:", error);
        // If geolocation fails, use default location
        const courierMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG], {
          icon: createCustomIcon('green')
        }).addTo(map);
        courierMarker.bindPopup("Default Location").openPopup();
        markers.push(courierMarker);
      }
    );
  }
  
  // Create custom icon for markers
  function createCustomIcon(color) {
    return L.divIcon({
      className: "custom-marker",
      iconAnchor: [12, 24],
      labelAnchor: [-6, 0],
      popupAnchor: [0, -24],
      html: `<span style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        display: block;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      "></span>`
    });
  }
  
  async function loadActiveOrders() {
    try {
      const orders = await apiCall('/api/orders/courier/active');
      const ordersList = document.getElementById('active-orders');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>No active orders.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Format times
        const requiredByTime = new Date(order.required_due_time).toLocaleString();
        const estimatedTime = order.estimated_delivery_time ? 
          new Date(order.estimated_delivery_time).toLocaleTimeString() : 'N/A';
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${order.merchant_address}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${requiredByTime}</p>
            <p><strong>Estimated Delivery:</strong> ${estimatedTime}</p>
            <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status}</span></p>
          </div>
          <div class="order-card-actions">
            ${order.status === 'accepted' ? 
              `<button class="update-status" data-id="${order.id}" data-status="out-for-delivery">
                <i class="fas fa-truck"></i> Start Delivery
              </button>` : ''}
            ${order.status === 'out-for-delivery' ? 
              `<button class="update-status" data-id="${order.id}" data-status="delivered">
                <i class="fas fa-check-circle"></i> Mark as Delivered
              </button>` : ''}
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
      // Add event listeners to buttons
      document.querySelectorAll('.update-status').forEach(button => {
        button.addEventListener('click', async function() {
          const orderId = this.getAttribute('data-id');
          const status = this.getAttribute('data-status');
          
          try {
            await apiCall(`/api/orders/${orderId}/status`, 'PUT', { status });
            loadActiveOrders();
            loadCourierStats();
            loadActiveOrdersWithLocations(); // Refresh map when order status changes
          } catch (error) {
            alert(`Error updating order: ${error.message}`);
          }
        });
      });
      
    } catch (error) {
      console.error('Error loading active orders:', error);
      document.getElementById('active-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Customer Dashboard Functions
  function loadCustomerDashboard() {
    // Load restaurants
    displayRestaurants();
    
    // Load customer orders
    loadCustomerOrders();
    
    // Set up back button for restaurant menu
    const backToRestaurantsBtn = document.getElementById('back-to-restaurants');
    if (backToRestaurantsBtn) {
      backToRestaurantsBtn.addEventListener('click', function() {
        document.getElementById('restaurant-menu-section').classList.add('hidden');
        document.getElementById('customer-restaurants').classList.add('active');
        currentRestaurant = null;
        resetCart();
      });
    }
    
    // Set up place order button
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', placeOrder);
    }
    
    // Set up category filtering
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
      button.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        
        // Update active button
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Filter restaurants
        filterRestaurants(category);
      });
    });
    
    // Set up search functionality
    const searchInput = document.getElementById('restaurant-search');
    const searchButton = document.getElementById('restaurant-search-btn');
    
    if (searchInput && searchButton) {
      searchButton.addEventListener('click', function() {
        searchRestaurants(searchInput.value);
      });
      
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchRestaurants(this.value);
        }
      });
    }
    
    // Set up order status tabs
    const statusTabs = document.querySelectorAll('.status-tab');
    statusTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const status = this.getAttribute('data-status');
        
        // Update active tab
        statusTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Filter orders by status
        filterOrdersByStatus(status);
      });
    });
  }
  
  function filterOrdersByStatus(status) {
    const orders = document.querySelectorAll('.customer-order');
    
    orders.forEach(order => {
      const orderStatus = order.getAttribute('data-status');
      if (status === 'all' || orderStatus === status) {
        order.style.display = 'block';
      } else {
        order.style.display = 'none';
      }
    });
  }
  
  function searchRestaurants(query) {
    query = query.toLowerCase();
    const restaurants = document.querySelectorAll('.restaurant-card');
    
    restaurants.forEach(restaurant => {
      const name = restaurant.querySelector('h4').textContent.toLowerCase();
      const tags = Array.from(restaurant.querySelectorAll('.restaurant-tag'))
        .map(tag => tag.textContent.toLowerCase());
      
      if (name.includes(query) || tags.some(tag => tag.includes(query)) || query === '') {
        restaurant.style.display = 'block';
      } else {
        restaurant.style.display = 'none';
      }
    });
  }
  
  function filterRestaurants(category) {
    const restaurants = document.querySelectorAll('.restaurant-card');
    
    restaurants.forEach(restaurant => {
      if (category === 'all' || restaurant.getAttribute('data-category') === category) {
        restaurant.style.display = 'block';
      } else {
        restaurant.style.display = 'none';
      }
    });
  }
  
  function displayRestaurants() {
    const restaurantContainer = document.getElementById('customer-restaurants-list');
    if (!restaurantContainer) return;
    
    restaurantContainer.innerHTML = '';
    
    demoRestaurants.forEach(restaurant => {
      const restaurantCard = document.createElement('div');
      restaurantCard.className = 'restaurant-card';
      restaurantCard.setAttribute('data-category', restaurant.category);
      
      restaurantCard.innerHTML = `
        <div class="restaurant-banner" style="background-image: url('${restaurant.image}')"></div>
        <div class="restaurant-logo" style="background-image: url('${restaurant.logo}')"></div>
        <div class="restaurant-details">
          <h4>${restaurant.name}</h4>
          <div class="restaurant-meta">
            <div class="restaurant-rating">
              <i class="fas fa-star"></i> ${restaurant.rating}
            </div>
            <div class="restaurant-delivery">
              <i class="fas fa-clock"></i> ${restaurant.deliveryTime}
            </div>
          </div>
          <div class="restaurant-tags">
            ${restaurant.tags.map(tag => `<span class="restaurant-tag">${tag}</span>`).join('')}
          </div>
          <button class="view-menu-btn btn" data-id="${restaurant.id}" data-name="${restaurant.name}">
            <i class="fas fa-utensils"></i> View Menu
          </button>
        </div>
      `;
      
      restaurantContainer.appendChild(restaurantCard);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.view-menu-btn').forEach(button => {
      button.addEventListener('click', function() {
        const restaurantId = this.getAttribute('data-id');
        const restaurantName = this.getAttribute('data-name');
        loadRestaurantMenu(restaurantId, restaurantName);
        
        // Hide restaurants section, show menu section
        document.getElementById('customer-restaurants').classList.remove('active');
        document.getElementById('restaurant-menu-section').classList.remove('hidden');
      });
    });
  }
  
  async function loadRestaurantMenu(restaurantId, restaurantName) {
    try {
      // For demo, we'll use static data instead of an API call
      const menuItems = getRestaurantMenu(restaurantId);
      const menuContainer = document.getElementById('restaurant-menu');
      const menuSection = document.getElementById('restaurant-menu-section');
      const restaurantNameElement = document.getElementById('restaurant-name');
      
      // Set current restaurant
      currentRestaurant = {
        id: restaurantId,
        name: restaurantName
      };
      
      // Reset cart
      resetCart();
      
      // Initialize customer map
      initializeCustomerMap();
      
      // Update restaurant name
      restaurantNameElement.textContent = restaurantName;
      
      if (!menuItems || menuItems.length === 0) {
        menuContainer.innerHTML = '<p>No menu items available.</p>';
        return;
      }
      
      // Group menu items by category
      const categories = {};
      menuItems.forEach(item => {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push(item);
      });
      
      // Build menu HTML
      let menuHTML = '';
      
      for (const category in categories) {
        menuHTML += `
          <div class="menu-category">
            <h4>${category}</h4>
            <div class="menu-items">
        `;
        
        categories[category].forEach(item => {
          menuHTML += `
            <div class="menu-item" data-id="${item.id}">
              <div class="menu-item-info">
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-description">${item.description || ''}</div>
              </div>
              <div class="menu-item-price">$${item.price.toFixed(2)}</div>
              <div class="menu-item-actions">
                <button class="add-to-cart-btn" 
                  data-id="${item.id}" 
                  data-name="${item.name}" 
                  data-price="${item.price}">
                  <i class="fas fa-plus"></i> Add to Cart
                </button>
              </div>
            </div>
          `;
        });
        
        menuHTML += `
            </div>
          </div>
        `;
      }
      
      menuContainer.innerHTML = menuHTML;
      
      // Add event listeners to buttons
      document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
          const id = this.getAttribute('data-id');
          const name = this.getAttribute('data-name');
          const price = parseFloat(this.getAttribute('data-price'));
          
          addToCart(id, name, price);
        });
      });
      
    } catch (error) {
      console.error('Error loading restaurant menu:', error);
      document.getElementById('restaurant-menu').innerHTML = 
        `<p class="error-message">Error loading menu: ${error.message}</p>`;
    }
  }
  
  // Demo function to get menu for a restaurant
  function getRestaurantMenu(restaurantId) {
    const menuItems = [
      { id: 1, restaurantId: 1, name: "Classic Burger", description: "Beef patty with lettuce, tomato, and special sauce", price: 8.99, category: "Burgers" },
      { id: 2, restaurantId: 1, name: "Cheeseburger", description: "Classic burger with American cheese", price: 9.99, category: "Burgers" },
      { id: 3, restaurantId: 1, name: "Bacon Burger", description: "Classic burger with crispy bacon", price: 10.99, category: "Burgers" },
      { id: 4, restaurantId: 1, name: "French Fries", description: "Crispy golden fries", price: 3.99, category: "Sides" },
      { id: 5, restaurantId: 1, name: "Soft Drink", description: "Cola, sprite, or lemonade", price: 1.99, category: "Drinks" },
      
      { id: 6, restaurantId: 2, name: "Margherita Pizza", description: "Classic tomato and mozzarella", price: 12.99, category: "Pizzas" },
      { id: 7, restaurantId: 2, name: "Pepperoni Pizza", description: "Pepperoni with mozzarella", price: 14.99, category: "Pizzas" },
      { id: 8, restaurantId: 2, name: "Vegetarian Pizza", description: "Bell peppers, mushrooms, onions, and olives", price: 13.99, category: "Pizzas" },
      { id: 9, restaurantId: 2, name: "Garlic Bread", description: "Toasted bread with garlic butter", price: 4.99, category: "Sides" },
      { id: 10, restaurantId: 2, name: "Soda", description: "Various soft drinks", price: 1.99, category: "Drinks" },
      
      { id: 11, restaurantId: 3, name: "California Roll", description: "Crab, avocado, and cucumber", price: 6.99, category: "Rolls" },
      { id: 12, restaurantId: 3, name: "Spicy Tuna Roll", description: "Fresh tuna with spicy mayo", price: 7.99, category: "Rolls" },
      { id: 13, restaurantId: 3, name: "Salmon Nigiri", description: "Fresh salmon over rice", price: 5.99, category: "Nigiri" },
      { id: 14, restaurantId: 3, name: "Miso Soup", description: "Traditional Japanese soup", price: 2.99, category: "Sides" },
      { id: 15, restaurantId: 3, name: "Green Tea", description: "Hot or iced", price: 1.99, category: "Drinks" },
      
      { id: 16, restaurantId: 4, name: "Beef Noodle Soup", description: "Slow-cooked beef with noodles in rich broth", price: 9.99, category: "Noodles" },
      { id: 17, restaurantId: 4, name: "Dan Dan Noodles", description: "Spicy Sichuan noodles with minced pork", price: 8.99, category: "Noodles" },
      { id: 18, restaurantId: 4, name: "Vegetable Dumplings", description: "Steamed dumplings with mixed vegetables", price: 6.99, category: "Appetizers" },
      { id: 19, restaurantId: 4, name: "Spring Rolls", description: "Crispy rolls with vegetables", price: 4.99, category: "Appetizers" },
      { id: 20, restaurantId: 4, name: "Jasmine Tea", description: "Traditional Chinese tea", price: 1.99, category: "Drinks" },
      
      { id: 21, restaurantId: 5, name: "Superfood Salad", description: "Kale, quinoa, avocado, and mixed seeds", price: 10.99, category: "Salads" },
      { id: 22, restaurantId: 5, name: "Protein Bowl", description: "Grilled chicken, brown rice, and vegetables", price: 11.99, category: "Bowls" },
      { id: 23, restaurantId: 5, name: "Avocado Toast", description: "Whole grain toast with avocado and poached egg", price: 8.99, category: "Breakfast" },
      { id: 24, restaurantId: 5, name: "Fruit Smoothie", description: "Blended fresh fruits with yogurt", price: 5.99, category: "Drinks" },
      { id: 25, restaurantId: 5, name: "Energy Bar", description: "Oats, nuts, and honey", price: 3.99, category: "Snacks" }
    ];
    
    return menuItems.filter(item => item.restaurantId == restaurantId);
  }
  
  function initializeCustomerMap() {
    const mapElement = document.getElementById('customer-map');
    if (!mapElement) return;
    
    // Initialize map centered on Xianlin, Nanjing
    customerMap = L.map('customer-map').setView([DEFAULT_LAT, DEFAULT_LNG], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(customerMap);
    
    // Add click handler to set delivery location
    customerMap.on('click', async function(e) {
      // Remove previous marker if exists
      if (customerDeliveryMarker) {
        customerMap.removeLayer(customerDeliveryMarker);
      }
      
      // Add a new marker at the clicked location
      customerDeliveryMarker = L.marker(e.latlng).addTo(customerMap);
      customerDeliveryMarker.bindPopup("Your Delivery Location").openPopup();
      
      // Update coordinates
      selectedCustomerLat = e.latlng.lat;
      selectedCustomerLng = e.latlng.lng;
      
      // Update hidden form fields
      document.getElementById('customer-lat').value = selectedCustomerLat;
      document.getElementById('customer-lng').value = selectedCustomerLng;
      
      // Try to get address from coordinates
      try {
        const address = await reverseGeocode(selectedCustomerLat, selectedCustomerLng);
        document.getElementById('customer-address-display').textContent = address;
        document.getElementById('customer-address').value = address;
      } catch (error) {
        document.getElementById('customer-address-display').textContent = 
          `${selectedCustomerLat.toFixed(6)}, ${selectedCustomerLng.toFixed(6)}`;
      }
    });
  }
  
  function addToCart(itemId, itemName, itemPrice) {
    // Check if item is already in cart
    const existingItem = cartItems.find(item => item.id === itemId);
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cartItems.push({
        id: itemId,
        name: itemName,
        price: itemPrice,
        quantity: 1
      });
    }
    
    updateCartDisplay();
  }
  
  function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalContainer = document.getElementById('cart-total');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    
    // Calculate total
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = 2.99;
    cartTotal = subtotal + deliveryFee;
    
    // Update cart display
    if (cartItems.length === 0) {
      cartItemsContainer.innerHTML = '';
      cartItemsContainer.appendChild(emptyCartMessage);
      emptyCartMessage.classList.remove('hidden');
      cartTotalContainer.classList.add('hidden');
      return;
    }
    
    // Hide empty message and show total
    emptyCartMessage.classList.add('hidden');
    cartTotalContainer.classList.remove('hidden');
    
    // Update cart items
    let cartHTML = '';
    
    cartItems.forEach(item => {
      cartHTML += `
        <div class="cart-item" data-id="${item.id}">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-quantity">×${item.quantity}</span>
          <span class="cart-item-price">$${item.price.toFixed(2)}</span>
          <span class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</span>
          <button class="cart-item-remove" data-id="${item.id}">×</button>
        </div>
      `;
    });
    
    cartItemsContainer.innerHTML = cartHTML;
    cartSubtotal.textContent = subtotal.toFixed(2);
    cartTotalPrice.textContent = cartTotal.toFixed(2);
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.cart-item-remove').forEach(button => {
      button.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        removeFromCart(id);
      });
    });
    
    // Pre-fill delivery address with user's address
    if (currentUser && currentUser.address && !document.getElementById('customer-address').value) {
      document.getElementById('customer-address').value = currentUser.address;
    }
    
    // Set default delivery time to 1 hour from now
    const defaultDueTime = new Date();
    defaultDueTime.setHours(defaultDueTime.getHours() + 1);
    
    const dueTimeElement = document.getElementById('customer-due-time');
    if (dueTimeElement && !dueTimeElement.value) {
      dueTimeElement.value = defaultDueTime.toISOString().slice(0, 16);
    }
  }
  
  function removeFromCart(itemId) {
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      cartItems.splice(itemIndex, 1);
      updateCartDisplay();
    }
  }
  
  function resetCart() {
    cartItems = [];
    cartTotal = 0;
    updateCartDisplay();
  }
  
  async function placeOrder() {
    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    
    const deliveryAddress = document.getElementById('customer-address').value;
    const dueTime = document.getElementById('customer-due-time').value;
    
    if (!deliveryAddress) {
      alert('Please enter a delivery address.');
      return;
    }
    
    if (!dueTime) {
      alert('Please select a delivery time.');
      return;
    }
    
    if (!selectedCustomerLat || !selectedCustomerLng) {
      alert('Please select your delivery location on the map.');
      return;
    }
    
    try {
      await apiCall('/api/customer/orders', 'POST', {
        restaurant_id: currentRestaurant.id,
        items: cartItems,
        total_price: cartTotal,
        delivery_address: deliveryAddress,
        delivery_lat: selectedCustomerLat,
        delivery_lng: selectedCustomerLng,
        required_due_time: dueTime
      });
      
      alert('Your order has been placed successfully!');
      
      // Reset cart and hide menu section
      resetCart();
      document.getElementById('restaurant-menu-section').classList.add('hidden');
      document.getElementById('customer-restaurants').classList.add('active');
      currentRestaurant = null;
      
      // Reset map marker
      if (customerDeliveryMarker && customerMap) {
        customerMap.removeLayer(customerDeliveryMarker);
        customerDeliveryMarker = null;
      }
      
      // Reload customer orders
      loadCustomerOrders();
      
    } catch (error) {
      alert(`Error placing order: ${error.message}`);
    }
  }
  
  async function loadCustomerOrders() {
    try {
      const orders = await apiCall('/api/customer/orders');
      const ordersList = document.getElementById('customer-orders-list');
      
      if (orders.length === 0) {
        ordersList.innerHTML = `
          <p>You don't have any orders yet.</p>
          <p>Browse our restaurants to place your first order!</p>
        `;
        return;
      }
      
      ordersList.innerHTML = '';
      
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card customer-order';
        orderCard.setAttribute('data-status', order.status);
        
        // Format time
        const orderDate = new Date(order.created_at);
        const requiredDate = new Date(order.required_due_time);
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Restaurant:</strong> ${order.restaurant_name}</p>
            <p><strong>Total:</strong> $${order.total_price.toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status}</span></p>
            <p><strong>Ordered:</strong> ${orderDate.toLocaleString()}</p>
            <p><strong>Required By:</strong> ${requiredDate.toLocaleString()}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            ${order.courier_name ? `<p><strong>Courier:</strong> ${order.courier_name}</p>` : ''}
            ${order.estimated_delivery_time ? 
              `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery_time).toLocaleString()}</p>` : ''}
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
    } catch (error) {
      console.error('Error loading customer orders:', error);
      document.getElementById('customer-orders-list').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Admin Dashboard Functions
  function loadAdminDashboard() {
    // Load admin statistics
    loadAdminStats();
    
    // Load all users
    loadAdminUsers();
    
    // Load all orders
    loadAdminOrders();
    
    // Setup admin filters
    setupAdminFilters();
  }
  
  async function loadAdminStats() {
    try {
      const stats = await apiCall('/api/admin/stats');
      
      // Update user counts
      document.getElementById('total-users').textContent = 
        Object.values(stats.users).reduce((sum, count) => sum + count, 0);
      document.getElementById('total-merchants').textContent = stats.users.merchant || 0;
      
      // Update order countsssd

document.addEventListener('DOMContentLoaded', function() {
  // Global variables
  const API_URL = ''; // Empty string for relative URLs in the same domain
  let token = localStorage.getItem('token');
  let currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Map related global variables
  let activeOrders = [];
  let availableOrders = [];
  
  // Default location coordinates for the map (will be used for display purposes only)
  let selectedDeliveryLat = 0;
  let selectedDeliveryLng = 0;
  let selectedCustomerLat = 0;
  let selectedCustomerLng = 0;
  
  // Customer shopping cart
  let currentRestaurant = null;
  let cartItems = [];
  let cartTotal = 0;
  
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
  
  // Initialize the route planner
  const routePlanner = new RoutePlanner(LocationData);
  
  // Tab switching
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
  
  // Merchant Dashboard
  function loadMerchantDashboard() {
    // Load merchant orders
    loadMerchantOrders();
    
    // Setup order creation form
    const createOrderForm = document.getElementById('create-order-form');
    const addItemBtn = document.getElementById('add-item-btn');
    const orderItemsContainer = document.getElementById('order-items');
    
    // Simulate click handler for merchant map
    const merchantMap = document.getElementById('merchant-map');
    if (merchantMap) {
      merchantMap.addEventListener('click', function(e) {
        // Get click position relative to the map
        const rect = merchantMap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate percentage
        const xPercent = x / rect.width;
        const yPercent = y / rect.height;
        
        // Convert to coordinates (assuming 1000x600 coordinate system)
        selectedDeliveryLat = Math.round(xPercent * 1000);
        selectedDeliveryLng = Math.round(yPercent * 600);
        
        // Update display
        document.getElementById('delivery-lat').textContent = selectedDeliveryLat;
        document.getElementById('delivery-lng').textContent = selectedDeliveryLng;
      });
    }
    
    // Add new item row
    addItemBtn.addEventListener('click', function() {
      const itemRow = document.createElement('div');
      itemRow.className = 'order-item';
      itemRow.innerHTML = `
        <input type="text" placeholder="Item name" class="item-name" required>
        <input type="number" placeholder="Price" class="item-price" step="0.01" required>
        <input type="number" placeholder="Quantity" class="item-quantity" min="1" value="1" required>
        <button type="button" class="remove-item">Remove</button>
      `;
      
      orderItemsContainer.appendChild(itemRow);
      
      // Setup remove button
      itemRow.querySelector('.remove-item').addEventListener('click', function() {
        itemRow.remove();
      });
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
        document.getElementById('delivery-lat').textContent = '0';
        document.getElementById('delivery-lng').textContent = '0';
        selectedDeliveryLat = 0;
        selectedDeliveryLng = 0;
        
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
        
        loadMerchantOrders();
        
        alert('Order created successfully!');
        
      } catch (error) {
        alert(`Error creating order: ${error.message}`);
      }
    });
  }
  
  async function loadMerchantOrders() {
    try {
      const orders = await apiCall('/api/orders/merchant');
      const ordersList = document.getElementById('merchant-orders');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // For demo purposes, use pre-defined customer addresses
        const customerId = `customer${order.id % 8 + 1}`;
        const customerAddress = LocationData.getAddressForLocation(customerId);
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Delivery Address:</strong> ${customerAddress}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Total Price:</strong> $${order.total_price.toFixed(2)}</p>
            ${order.courier_name ? `<p><strong>Courier:</strong> ${order.courier_name}</p>` : ''}
          </div>
          <div class="order-card-actions">
            ${order.status === 'pending' || order.status === 'preparing' ? 
              `<button class="update-status" data-id="${order.id}" data-status="cancelled">Cancel Order</button>` : ''}
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
          } catch (error) {
            alert(`Error updating order: ${error.message}`);
          }
        });
      });
      
    } catch (error) {
      console.error('Error loading merchant orders:', error);
      document.getElementById('merchant-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Courier Dashboard
  function loadCourierDashboard() {
    // Load available orders
    loadAvailableOrders();
    
    // Load active orders
    loadActiveOrders();
    
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (currentUser && currentUser.role === 'courier') {
        loadAvailableOrders();
        loadActiveOrders();
        loadActiveOrdersWithLocations();
      } else {
        clearInterval(refreshInterval);
      }
    }, 30000);
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
        
        // Generate customer ID based on order ID modulo 8
        const customerId = `customer${order.id % 8 + 1}`;
        
        // Get estimated delivery time using our route planner
        const eta = routePlanner.estimateDeliveryTime(order);
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${LocationData.getAddressForLocation('restaurant')}</p>
            <p><strong>Delivery Address:</strong> ${LocationData.getAddressForLocation(customerId)}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Estimated Delivery Time:</strong> ${eta.estimatedMinutes} minutes</p>
            <p><strong>Total Price:</strong> $${order.total_price.toFixed(2)}</p>
          </div>
          <div class="order-card-actions">
            <button class="accept-order" data-id="${order.id}" data-customer="${customerId}">Accept Order</button>
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
            loadActiveOrdersWithLocations();
          } catch (error) {
            alert(`Error accepting order: ${error.message}`);
          }
        });
      });
      
    } catch (error) {
      console.error('Error loading available orders:', error);
      document.getElementById('available-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
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
        // Generate customer ID based on order ID modulo 8
        const customerId = `customer${order.id % 8 + 1}`;
        
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${LocationData.getAddressForLocation('restaurant')}</p>
            <p><strong>Customer:</strong> ${order.customer_name || LocationData.locations[customerId].name}</p>
            <p><strong>Delivery Address:</strong> ${LocationData.getAddressForLocation(customerId)}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
          <div class="order-card-actions">
            ${order.status === 'accepted' ? 
              `<button class="update-status" data-id="${order.id}" data-status="out-for-delivery">Start Delivery</button>` : ''}
            ${order.status === 'out-for-delivery' ? 
              `<button class="update-status" data-id="${order.id}" data-status="delivered">Mark as Delivered</button>` : ''}
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
            loadActiveOrdersWithLocations();
          } catch (error) {
            alert(`Error updating order: ${error.message}`);
          }
        });
      });
      
      // Load route planning info
      loadActiveOrdersWithLocations();
      
    } catch (error) {
      console.error('Error loading active orders:', error);
      document.getElementById('active-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Load active orders and show route info (no map interaction)
  async function loadActiveOrdersWithLocations() {
    try {
      // Get active orders
      const orders = await apiCall('/api/orders/courier/active');
      activeOrders = orders;
      
      if (orders.length === 0) {
        if (document.getElementById('route-stops')) {
          document.getElementById('route-stops').innerHTML = '<p>No active orders to display.</p>';
        }
        if (document.getElementById('estimated-times')) {
          document.getElementById('estimated-times').innerHTML = '';
        }
        return;
      }
      
      // Prepare orders for route planning
      const ordersForRouting = orders.map(order => {
        return {
          id: order.id,
          customerId: `customer${order.id % 8 + 1}`,
          required_due_time: order.required_due_time,
          customer_name: order.customer_name,
          status: order.status
        };
      });
      
      // Get optimized route using the route planner
      const routeResult = routePlanner.planRoute(ordersForRouting, 'restaurant');
      
      // Display route information in the sidebar
      renderRouteInfo(routeResult, ordersForRouting);
      
    } catch (error) {
      console.error('Error loading active orders with locations:', error);
      if (document.getElementById('route-stops')) {
        document.getElementById('route-stops').innerHTML = 
          `<p class="error-message">Error loading route data: ${error.message}</p>`;
      }
    }
  }
  
  // Display route information in the sidebar without relying on map
  function renderRouteInfo(routeResult, orders) {
    const routeStopsElement = document.getElementById('route-stops');
    const estimatedTimesElement = document.getElementById('estimated-times');
    
    if (!routeStopsElement || !estimatedTimesElement) return;
    
    let routeHTML = '';
    
    // Add each stop from the route
    routeResult.route.forEach((stop, index) => {
      // Format the stop information
      let stopType = '';
      let stopClass = '';
      let details = '';
      
      if (stop.type === 'start') {
        stopType = 'Start';
        stopClass = 'stop-start';
        details = 'Your starting location';
      } else if (stop.type === 'pickup') {
        stopType = 'Pickup';
        stopClass = 'stop-merchant';
        details = `Order #${stop.orderId}`;
      } else if (stop.type === 'deliver') {
        stopType = 'Delivery';
        stopClass = 'stop-customer';
        
        // Find the order details
        const order = orders.find(o => o.id.toString() === stop.orderId.toString());
        if (order) {
          const customerId = order.customerId || `customer${order.id % 8 + 1}`;
          details = `${order.customer_name || LocationData.locations[customerId].name}, Order #${order.id}`;
        } else {
          details = `Order #${stop.orderId}`;
        }
      }
      
      routeHTML += `
        <div class="route-stop ${stopClass}">
          <p><strong>Stop ${index + 1}: ${stopType}</strong></p>
          <p>${LocationData.locations[stop.locationId].name}</p>
          <p>${LocationData.getAddressForLocation(stop.locationId)}</p>
          <p><small>${details}</small></p>
          ${stop.time ? `<p><small>Travel time: ${stop.time} minutes</small></p>` : ''}
          ${stop.estimatedArrival ? `<p><small>ETA: ${new Date(stop.estimatedArrival).toLocaleTimeString()}</small></p>` : ''}
        </div>
      `;
    });
    
    // Update the DOM
    routeStopsElement.innerHTML = routeHTML;
    
    // Display total estimated time
    estimatedTimesElement.innerHTML = `
      <div class="route-summary">
        <p><strong>Total estimated time:</strong> ${routeResult.totalTime} minutes</p>
      </div>
    `;
  }
  
  // Customer Dashboard
  function loadCustomerDashboard() {
    // Load restaurants
    loadRestaurants();
    
    // Load customer orders
    loadCustomerOrders();
    
    // Set up back button for restaurant menu
    const backToRestaurantsBtn = document.getElementById('back-to-restaurants');
    if (backToRestaurantsBtn) {
      backToRestaurantsBtn.addEventListener('click', function() {
        document.getElementById('restaurant-menu-section').classList.add('hidden');
        currentRestaurant = null;
        resetCart();
      });
    }
    
    // Set up place order button
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', placeOrder);
    }
    
    // Simulate click handler for customer map
    const customerMap = document.getElementById('customer-map');
    if (customerMap) {
      customerMap.addEventListener('click', function(e) {
        // Get click position relative to the map
        const rect = customerMap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate percentage
        const xPercent = x / rect.width;
        const yPercent = y / rect.height;
        
        // Convert to coordinates (assuming 1000x600 coordinate system)
        selectedCustomerLat = Math.round(xPercent * 1000);
        selectedCustomerLng = Math.round(yPercent * 600);
        
        // Update display
        document.getElementById('customer-lat').textContent = selectedCustomerLat;
        document.getElementById('customer-lng').textContent = selectedCustomerLng;
      });
    }
  }
  
  async function loadRestaurants() {
    try {
      const restaurants = await apiCall('/api/restaurants');
      const restaurantsList = document.getElementById('customer-restaurants');
      
      if (restaurants.length === 0) {
        restaurantsList.innerHTML = '<p>No restaurants found.</p>';
        return;
      }
      
      restaurantsList.innerHTML = '';
      
      restaurants.forEach(restaurant => {
        const restaurantCard = document.createElement('div');
        restaurantCard.className = 'restaurant-card';
        
        restaurantCard.innerHTML = `
          <div class="restaurant-card-content">
            <h4>${restaurant.name}</h4>
            <p>${restaurant.address || LocationData.getAddressForLocation('restaurant')}</p>
            <button class="view-menu-btn btn" data-id="${restaurant.id}" data-name="${restaurant.name}">View Menu</button>
          </div>
        `;
        
        restaurantsList.appendChild(restaurantCard);
      });
      
      // Add event listeners to buttons
      document.querySelectorAll('.view-menu-btn').forEach(button => {
        button.addEventListener('click', function() {
          const restaurantId = this.getAttribute('data-id');
          const restaurantName = this.getAttribute('data-name');
          loadRestaurantMenu(restaurantId, restaurantName);
        });
      });
      
    } catch (error) {
      console.error('Error loading restaurants:', error);
      document.getElementById('customer-restaurants').innerHTML = 
        `<p class="error-message">Error loading restaurants: ${error.message}</p>`;
    }
  }
  
  async function loadRestaurantMenu(restaurantId, restaurantName) {
    try {
      const menuItems = await apiCall(`/api/restaurants/${restaurantId}/menu`);
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
      
      // Update restaurant name
      restaurantNameElement.textContent = restaurantName;
      
      // Show menu section, hide restaurants list
      menuSection.classList.remove('hidden');
      
      if (menuItems.length === 0) {
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
                  data-price="${item.price}">Add to Cart</button>
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
    const emptyCartMessage = document.getElementById('empty-cart-message');
    
    // Calculate total
    cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
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
    cartTotalPrice.textContent = cartTotal.toFixed(2);
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.cart-item-remove').forEach(button => {
      button.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        removeFromCart(id);
      });
    });
    
    // Pre-fill delivery address with user's address
    if (currentUser && currentUser.address) {
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
      currentRestaurant = null;
      
      // Reset coordinates
      selectedCustomerLat = 0;
      selectedCustomerLng = 0;
      document.getElementById('customer-lat').textContent = '0';
      document.getElementById('customer-lng').textContent = '0';
      
      // Reload customer orders
      loadCustomerOrders();
      
    } catch (error) {
      alert(`Error placing order: ${error.message}`);
    }
  }
  
  async function loadCustomerOrders() {
    try {
      const orders = await apiCall('/api/customer/orders');
      const ordersList = document.getElementById('customer-orders');
      
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
        orderCard.className = 'order-card';
        
        // For demo purposes, use pre-defined customer addresses
        const customerId = `customer${order.id % 8 + 1}`;
        const customerAddress = LocationData.getAddressForLocation(customerId);
        
        // Format time
        const orderDate = new Date(order.created_at);
        const requiredDate = new Date(order.required_due_time);
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Restaurant:</strong> ${order.restaurant_name}</p>
            <p><strong>Total:</strong> $${order.total_price.toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Ordered:</strong> ${orderDate.toLocaleString()}</p>
            <p><strong>Required By:</strong> ${requiredDate.toLocaleString()}</p>
            <p><strong>Delivery Address:</strong> ${customerAddress || order.delivery_address}</p>
            ${order.courier_name ? `<p><strong>Courier:</strong> ${order.courier_name}</p>` : ''}
            ${order.estimated_delivery_time ? 
              `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery_time).toLocaleString()}</p>` : ''}
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
    } catch (error) {
      console.error('Error loading customer orders:', error);
      document.getElementById('customer-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Admin Dashboard
  function loadAdminDashboard() {
    // Load all users
    loadAdminUsers();
    
    // Load all orders
    loadAdminOrders();
  }
  
  async function loadAdminUsers() {
    try {
      const users = await apiCall('/api/admin/users');
      const usersList = document.getElementById('admin-users');
      
      usersList.innerHTML = '';
      
      users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        
        userCard.innerHTML = `
          <h4>${user.name}</h4>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          <p><strong>Address:</strong> ${user.address || 'N/A'}</p>
          <p><strong>Registered:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
        `;
        
        usersList.appendChild(userCard);
      });
      
    } catch (error) {
      console.error('Error loading users:', error);
      document.getElementById('admin-users').innerHTML = 
        `<p class="error-message">Error loading users: ${error.message}</p>`;
    }
  }
  
  async function loadAdminOrders() {
    try {
      const orders = await apiCall('/api/admin/orders');
      const ordersList = document.getElementById('admin-orders');
      
      ordersList.innerHTML = '';
      
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // For demo purposes, use pre-defined customer addresses
        const customerId = `customer${order.id % 8 + 1}`;
        const customerAddress = LocationData.getAddressForLocation(customerId);
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Courier:</strong> ${order.courier_name || 'Not assigned'}</p>
            <p><strong>Delivery Address:</strong> ${customerAddress || order.delivery_address}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Total Price:</strong> $${order.total_price.toFixed(2)}</p>
            <p><strong>Created:</strong> ${new Date(order.created_at).toLocaleString()}</p>
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
    } catch (error) {
      console.error('Error loading admin orders:', error);
      document.getElementById('admin-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Update footer with current date and time
  const footer = document.querySelector('footer');
  if (footer) {
    footer.innerHTML = `
      <p>Current Date and Time (UTC): 2025-06-09 02:07:21</p>
      <p>User: Muntasir-Mamun7</p>
    `;
  }
  
  // Check if user is already logged in
  if (token && currentUser) {
    showDashboard();
  } else {
    showAuthForms();
  }
});

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
    
    // Initialize merchant map
    initializeMerchantMap();
    
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
        
        // Reset the map marker
        if (deliveryMarker) {
          merchantMap.removeLayer(deliveryMarker);
          deliveryMarker = null;
        }
        
        document.getElementById('delivery-lat').textContent = '0';
        document.getElementById('delivery-lng').textContent = '0';
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
        
        loadMerchantOrders();
        
        alert('Order created successfully!');
        
      } catch (error) {
        alert(`Error creating order: ${error.message}`);
      }
    });
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
    merchantMap.on('click', function(e) {
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
      
      // Update display
      document.getElementById('delivery-lat').textContent = selectedDeliveryLat.toFixed(6);
      document.getElementById('delivery-lng').textContent = selectedDeliveryLng.toFixed(6);
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
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
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
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${order.merchant_address}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Total Price:</strong> $${order.total_price.toFixed(2)}</p>
          </div>
          <div class="order-card-actions">
            <button class="accept-order" data-id="${order.id}">Accept Order</button>
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
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${order.merchant_address}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
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
            <p>${restaurant.address}</p>
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
      
      // Initialize customer map
      initializeCustomerMap();
      
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
    customerMap.on('click', function(e) {
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
      
      // Update display
      document.getElementById('customer-lat').textContent = selectedCustomerLat.toFixed(6);
      document.getElementById('customer-lng').textContent = selectedCustomerLng.toFixed(6);
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
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Courier:</strong> ${order.courier_name || 'Not assigned'}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
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
  
  // Set up the map
  function setupMap() {
    const mapElement = document.getElementById('courier-map');
    if (!mapElement) return;
    
    // Default map center - Xianlin, Nanjing, China
    const defaultCenter = [DEFAULT_LAT, DEFAULT_LNG];
    
    // Initialize map
    map = L.map('courier-map').setView(defaultCenter, 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // If the courier has active orders, load them and display on map
    if (currentUser && currentUser.role === 'courier') {
      loadActiveOrdersWithLocations();
      showAvailableOrdersOnMap();
    }
  }
  
  // Load active orders and display on map
  async function loadActiveOrdersWithLocations() {
    try {
      // Check if map exists
      if (!map) return;
      
      // Get active orders
      const orders = await apiCall('/api/orders/courier/active');
      activeOrders = orders;
      
      // Clear existing markers
      clearMarkers();
      
      // Show available orders too
      showAvailableOrdersOnMap();
      
      if (orders.length === 0) {
        if (document.getElementById('route-stops')) {
          document.getElementById('route-stops').innerHTML = '<p>No active orders to display.</p>';
        }
        return;
      }
      
      // Add courier's location marker
      addCourierLocationMarker();
      
      // Get locations for each address (merchant and customer)
      const waypoints = [];
      
      // Process each order
      for (const order of orders) {
        // Add merchant marker
        if (order.merchant_address) {
          const merchantMarker = L.marker([DEFAULT_LAT + (Math.random() - 0.5) * 0.01, DEFAULT_LNG + (Math.random() - 0.5) * 0.01], {
            icon: createCustomIcon('blue')
          }).addTo(map);
          
          merchantMarker.bindPopup(`
            <div class="popup-content">
              <h4>${order.merchant_name}</h4>
              <p>Pickup Location</p>
              <p>Order #${order.id}</p>
            </div>
          `);
          
          markers.push(merchantMarker);
          waypoints.push(merchantMarker.getLatLng());
        }
        
        // Add delivery location marker
        if (order.delivery_lat && order.delivery_lng) {
          const deliveryMarker = L.marker([order.delivery_lat, order.delivery_lng], {
            icon: createCustomIcon('red')
          }).addTo(map);
          
          deliveryMarker.bindPopup(`
            <div class="popup-content">
              <h4>${order.customer_name}</h4>
              <p>Delivery Location</p>
              <p>Order #${order.id}</p>
            </div>
          `);
          
          markers.push(deliveryMarker);
          waypoints.push(deliveryMarker.getLatLng());
        }
      }
      
      // Calculate and display route
      if (waypoints.length > 0) {
        calculateAndDisplayRoute(waypoints);
      }
      
      // Fit map to show all markers
      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1)); // Add some padding
      }
      
      // Display route information
      renderRouteInfo(orders);
      
    } catch (error) {
      console.error('Error loading active orders with locations:', error);
      if (document.getElementById('route-stops')) {
        document.getElementById('route-stops').innerHTML = 
          `<p class="error-message">Error loading route data: ${error.message}</p>`;
      }
    }
  }
  
  // Calculate and display the optimal route
  function calculateAndDisplayRoute(waypoints) {
    // If there are no waypoints or no map, return
    if (!waypoints || waypoints.length === 0 || !map) return;
    
    // Clear any existing routes
    if (routingControl) {
      map.removeControl(routingControl);
    }
    
    // Create routing control
    routingControl = L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: false,
      lineOptions: {
        styles: [{ color: '#FF5722', opacity: 0.7, weight: 5 }]
      },
      createMarker: function() { return null; } // Don't create default markers
    }).addTo(map);
  }
  
  // Display route information in the sidebar
  function renderRouteInfo(orders) {
    const routeStopsElement = document.getElementById('route-stops');
    const estimatedTimesElement = document.getElementById('estimated-times');
    
    if (!routeStopsElement || !estimatedTimesElement) return;
    
    let routeHTML = '';
    let totalTime = 0;
    let totalDistance = 0;
    
    // Add courier location as start
    routeHTML += `
      <div class="route-stop">
        <p><strong>Start:</strong> Your Location</p>
      </div>
    `;
    
    // Add merchant and customer stops
    orders.forEach((order, index) => {
      // Add merchant stop
      routeHTML += `
        <div class="route-stop stop-merchant">
          <p><strong>Stop ${index * 2 + 1}:</strong> ${order.merchant_name}</p>
          <p>${order.merchant_address}</p>
          <p><small>Order #${order.id} - Pickup</small></p>
        </div>
      `;
      
      // Add customer stop
      routeHTML += `
        <div class="route-stop stop-customer">
          <p><strong>Stop ${index * 2 + 2}:</strong> ${order.customer_name}</p>
          <p>${order.delivery_address}</p>
          <p><small>Order #${order.id} - Delivery</small></p>
        </div>
      `;
      
      // Add estimated time and distance
      totalTime += 20; // 20 minutes per order (pickup + delivery)
      totalDistance += 5; // 5 km per order (estimated)
    });
    
    // Update the DOM
    routeStopsElement.innerHTML = routeHTML;
    
    // Display total estimated time and distance
    estimatedTimesElement.innerHTML = `
      <div class="route-summary">
        <p><strong>Total estimated time:</strong> ${totalTime} minutes</p>
        <p><strong>Total distance:</strong> ${totalDistance.toFixed(1)} km</p>
      </div>
    `;
  }
  
  // Clear all markers from the map
  function clearMarkers() {
    if (!map) return;
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
  }
  
  // Initialize map when document is ready
  function initializeMap() {
    if (currentUser) {
      if (currentUser.role === 'courier' && document.getElementById('courier-map')) {
        setupMap();
      } else if (currentUser.role === 'merchant' && document.getElementById('merchant-map')) {
        initializeMerchantMap();
      }
    }
  }
  
  // Initialize map when document is ready
  setTimeout(initializeMap, 1000);
  
  // Check if user is already logged in
  if (token && currentUser) {
    showDashboard();
  } else {
    showAuthForms();
  }
});

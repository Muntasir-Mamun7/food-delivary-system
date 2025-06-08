document.addEventListener('DOMContentLoaded', function() {
  // Global variables
  const API_URL = ''; // Empty string for relative URLs in the same domain
  let token = localStorage.getItem('token');
  let currentUser = JSON.parse(localStorage.getItem('user'));
  
  // Map related global variables
  let map;
  let routingControl;
  let markers = [];
  let activeOrders = [];
  
  // Restaurant and ordering related variables
  let selectedRestaurant = null;
  let selectedMenuItems = [];
  let customerMap = null;
  let customerMarker = null;
  let merchantMap = null;
  let merchantMarker = null;
  
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
  
  // Add admin option temporarily
  const roleSelect = document.getElementById('register-role');
  if (roleSelect) {
    const adminOption = document.createElement('option');
    adminOption.value = 'admin';
    adminOption.textContent = 'Admin';
    roleSelect.appendChild(adminOption);
  }
  
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
    
    errorElement.textContent = 'Processing registration...';
    
    try {
      console.log('Sending registration data:', { name, email, role, address });
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role, address })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        
        // Try to parse as JSON if possible
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Registration failed');
        } catch (jsonError) {
          // If it's not valid JSON, use the text as error message
          throw new Error(text || 'Registration failed with status: ' + response.status);
        }
      }
      
      // Now parse the JSON response
      const data = await response.json();
      console.log('Registration successful:', data);
      
      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      token = data.token;
      currentUser = data.user;
      
      // Show dashboard
      errorElement.textContent = '';
      showDashboard();
      
    } catch (error) {
      console.error('Registration error:', error);
      errorElement.textContent = error.message || 'An unexpected error occurred';
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
    
    // Add map integration for merchant
    document.getElementById('verify-address-btn').addEventListener('click', function() {
      showMerchantMap();
    });
    
    document.getElementById('confirm-address-btn').addEventListener('click', function() {
      confirmMerchantAddress();
    });
    
    document.getElementById('cancel-map-btn').addEventListener('click', function() {
      hideMerchantMap();
    });
    
    // Submit order form
    createOrderForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      try {
        const customerId = document.getElementById('customer-id').value;
        const deliveryAddress = document.getElementById('delivery-address').value;
        const dueTime = document.getElementById('due-time').value;
        
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
          required_due_time: dueTime
        });
        
        // Reset form and reload orders
        createOrderForm.reset();
        
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
  
  // Show merchant map for address verification
  function showMerchantMap() {
    const mapContainer = document.getElementById('merchant-map-container');
    mapContainer.classList.remove('hidden');
    
    // Initialize map if not already done
    if (!merchantMap) {
      merchantMap = L.map('merchant-map').setView([34.0522, -118.2437], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(merchantMap);
    }
    
    // Get address from input field
    const address = document.getElementById('delivery-address').value;
    
    if (address) {
      // For demo purposes, simulate geocoding with random coordinates
      const randomLocation = [
        34.0522 + (Math.random() - 0.5) * 0.05,
        -118.2437 + (Math.random() - 0.5) * 0.05
      ];
      
      // Update or create marker
      if (merchantMarker) {
        merchantMarker.setLatLng(randomLocation);
      } else {
        merchantMarker = L.marker(randomLocation, { draggable: true }).addTo(merchantMap);
      }
      
      merchantMap.setView(randomLocation, 15);
    }
    
    // Resize the map after showing it
    setTimeout(() => {
      merchantMap.invalidateSize();
    }, 100);
  }
  
  // Hide merchant map
  function hideMerchantMap() {
    document.getElementById('merchant-map-container').classList.add('hidden');
  }
  
  // Confirm address from map
  function confirmMerchantAddress() {
    if (merchantMarker) {
      const position = merchantMarker.getLatLng();
      // For demo purposes, use coordinates as address
      document.getElementById('delivery-address').value = 
        `Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`;
    }
    
    hideMerchantMap();
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
            <p><strong>Total Price:</strong> $${order.total_price}</p>
            ${order.courier_name ? `<p><strong>Courier:</strong> ${order.courier_name}</p>` : ''}
          </div>
          <div class="order-card-actions">
            ${order.status === 'pending' ? 
              `<button class="update-status" data-id="${order.id}" data-status="preparing">Mark as Preparing</button>` : ''}
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
    
    // Initialize map
    setupMap();
    
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (currentUser && currentUser.role === 'courier') {
        loadAvailableOrders();
        loadActiveOrders();
        loadActiveOrdersWithLocations(); // Refresh the map data too
      } else {
        clearInterval(refreshInterval);
      }
    }, 30000);
  }
  
  // Fix for the courier dashboard refresh issue
  async function acceptOrder(orderId) {
    try {
      await apiCall(`/api/orders/${orderId}/accept`, 'PUT');
      
      // Add a short delay to ensure database updates are complete
      setTimeout(async () => {
        await loadAvailableOrders();
        await loadActiveOrders();
        await loadActiveOrdersWithLocations(); // This loads the map with active orders
      }, 300);
      
      // Show notification
      alert('Order accepted successfully! Check your active orders and route plan.');
    } catch (error) {
      alert(`Error accepting order: ${error.message}`);
    }
  }
  
  // Modified loadAvailableOrders function to include time feasibility check
  async function loadAvailableOrders() {
    try {
      const orders = await apiCall('/api/orders/available');
      const ordersList = document.getElementById('available-orders');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>No available orders at the moment.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      // Get courier's active orders count first
      const activeOrders = await apiCall('/api/orders/courier/active');
      const activeOrdersCount = activeOrders.length;
      
      // Display a counter of active orders at the top
      const orderCounter = document.createElement('div');
      orderCounter.className = 'order-counter';
      orderCounter.innerHTML = `
        <p><strong>Active Orders:</strong> ${activeOrdersCount}</p>
        <p>${activeOrdersCount > 0 ? 'Remember to ensure on-time delivery!' : 'You can accept new orders.'}</p>
      `;
      ordersList.appendChild(orderCounter);
      
      for (const order of orders) {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Calculate time remaining until due
        const dueTime = new Date(order.required_due_time);
        const currentTime = new Date();
        const minutesUntilDue = Math.round((dueTime - currentTime) / (1000 * 60));
        
        // Determine urgency class
        let urgencyClass = 'normal';
        let urgencyLabel = 'Normal';
        
        if (minutesUntilDue < 30) {
          urgencyClass = 'urgent';
          urgencyLabel = 'Urgent';
        } else if (minutesUntilDue < 60) {
          urgencyClass = 'soon';
          urgencyLabel = 'Soon';
        }
        
        // If courier has multiple active orders, perform a time check
        let timeCheck = null;
        if (activeOrdersCount > 0) {
          try {
            timeCheck = await apiCall(`/api/orders/${order.id}/time-check`);
          } catch (error) {
            console.error('Error checking time feasibility:', error);
          }
        }
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${order.merchant_address}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${dueTime.toLocaleString()}</p>
            <p><strong>Total Price:</strong> $${order.total_price}</p>
            <p class="time-remaining ${urgencyClass}">
              <strong>Time Remaining:</strong> ${formatTimeRemaining(minutesUntilDue)}
              <span class="urgency-label">${urgencyLabel}</span>
            </p>
            ${timeCheck ? `
              <div class="time-feasibility ${timeCheck.canDeliver ? 'feasible' : 'not-feasible'}">
                <p><strong>${timeCheck.canDeliver ? 'You can deliver this order on time' : 'Warning: May be difficult to deliver on time'}</strong></p>
                <p>Estimated time needed: ${timeCheck.estimatedTimeNeeded} minutes</p>
                <p>Time until due: ${timeCheck.minutesUntilDue} minutes</p>
              </div>
            ` : ''}
          </div>
          <div class="order-card-actions">
            <button class="accept-order" data-id="${order.id}">Accept Order</button>
            <button class="view-on-map" data-id="${order.id}">View on Map</button>
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      }
      
      // Add event listeners to buttons
      document.querySelectorAll('.accept-order').forEach(button => {
        button.addEventListener('click', function() {
          const orderId = this.getAttribute('data-id');
          
          // If courier has active orders, show a confirmation dialog
          if (activeOrdersCount > 0) {
            const confirmed = confirm(`You already have ${activeOrdersCount} active order(s). Are you sure you can deliver this additional order on time?`);
            if (!confirmed) return;
          }
          
          acceptOrder(orderId);
        });
      });
      
      document.querySelectorAll('.view-on-map').forEach(button => {
        button.addEventListener('click', async function() {
          const orderId = this.getAttribute('data-id');
          // Find the order from the orders array
          const order = orders.find(o => o.id == orderId);
          if (order) {
            // Preview the order on the map
            previewOrderOnMap(order);
          }
        });
      });
      
    } catch (error) {
      console.error('Error loading available orders:', error);
      document.getElementById('available-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Helper function to format time remaining
  function formatTimeRemaining(minutes) {
    if (minutes < 0) {
      return 'Overdue!';
    }
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  // Preview an order on the map before accepting
  async function previewOrderOnMap(order) {
    try {
      // Make sure map is initialized
      if (!map) {
        setupMap();
      }
      
      // Clear existing markers and routes
      clearMarkers();
      
      // Get locations
      const merchantLocation = await geocodeAddress(order.merchant_address);
      merchantLocation.type = 'merchant';
      merchantLocation.name = order.merchant_name;
      merchantLocation.orderId = order.id;
      
      const customerLocation = await geocodeAddress(order.delivery_address);
      customerLocation.type = 'customer';
      customerLocation.name = order.customer_name || 'Customer';
      customerLocation.orderId = order.id;
      
      // Add markers
      addMarker(merchantLocation);
      addMarker(customerLocation);
      
      // Get courier location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const courierLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            type: 'courier',
            name: 'Your Location'
          };
          
          // Add courier marker
          addMarker(courierLocation);
          
          // Calculate and display preview route
          const waypoints = [
            L.latLng(courierLocation.lat, courierLocation.lng),
            L.latLng(merchantLocation.lat, merchantLocation.lng),
            L.latLng(customerLocation.lat, customerLocation.lng)
          ];
          
          // Create routing control for preview
          routingControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            showAlternatives: false,
            fitSelectedRoutes: true,
            lineOptions: {
              styles: [{ color: '#FF9800', opacity: 0.7, weight: 5 }]
            },
            createMarker: function() { return null; } // Don't create default markers
          }).addTo(map);
          
          // When route is found, show time estimate
          routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            const route = routes[0]; // Get the first (best) route
            
            // Calculate travel time in minutes
            const travelTimeMinutes = Math.round(route.summary.totalTime / 60);
            
            // Show time estimation popup
            const popup = L.popup()
              .setLatLng(customerLocation)
              .setContent(`
                <div class="time-estimate-popup">
                  <h4>Delivery Time Estimate</h4>
                  <p><strong>Travel time:</strong> ${travelTimeMinutes} minutes</p>
                  <p><strong>Pickup time:</strong> ~10 minutes</p>
                  <p><strong>Delivery time:</strong> ~5 minutes</p>
                  <p><strong>Total estimated time:</strong> ${travelTimeMinutes + 15} minutes</p>
                  <p><strong>Required by:</strong> ${new Date(order.required_due_time).toLocaleTimeString()}</p>
                </div>
              `)
              .openOn(map);
          });
        },
        (error) => {
          console.error("Error getting courier location:", error);
          alert("Couldn't access your location. Please enable location services.");
        }
      );
    } catch (error) {
      console.error('Error previewing order on map:', error);
    }
  }
  
  // Enhance the loadActiveOrders function to include time management
  async function loadActiveOrders() {
    try {
      const orders = await apiCall('/api/orders/courier/active');
      const ordersList = document.getElementById('active-orders');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>No active orders.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      // Create a delivery schedule header
      const scheduleHeader = document.createElement('div');
      scheduleHeader.className = 'delivery-schedule-header';
      scheduleHeader.innerHTML = '<h4>Your Delivery Schedule</h4>';
      ordersList.appendChild(scheduleHeader);
      
      // Sort orders by due time
      orders.sort((a, b) => new Date(a.required_due_time) - new Date(b.required_due_time));
      
      orders.forEach((order, index) => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Calculate time remaining until due
        const dueTime = new Date(order.required_due_time);
        const currentTime = new Date();
        const minutesUntilDue = Math.round((dueTime - currentTime) / (1000 * 60));
        
        // Determine urgency class
        let urgencyClass = 'normal';
        if (minutesUntilDue < 30) {
          urgencyClass = 'urgent';
        } else if (minutesUntilDue < 60) {
          urgencyClass = 'soon';
        }
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-schedule">
            <span class="order-number">${index + 1}</span>
          </div>
          <div class="order-card-details">
            <p><strong>Merchant:</strong> ${order.merchant_name}</p>
            <p><strong>Pickup Address:</strong> ${order.merchant_address}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${dueTime.toLocaleString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p class="time-remaining ${urgencyClass}">
              <strong>Time Remaining:</strong> ${formatTimeRemaining(minutesUntilDue)}
            </p>
          </div>
          <div class="order-card-actions">
            ${order.status === 'accepted' ? 
              `<button class="update-status" data-id="${order.id}" data-status="out-for-delivery">Start Delivery</button>` : ''}
            ${order.status === 'out-for-delivery' ? 
              `<button class="update-status" data-id="${order.id}" data-status="delivered">Mark as Delivered</button>` : ''}
            <button class="focus-on-map" data-id="${order.id}">Focus on Map</button>
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
      
      document.querySelectorAll('.focus-on-map').forEach(button => {
        button.addEventListener('click', function() {
          const orderId = this.getAttribute('data-id');
          focusOrderOnMap(orderId);
        });
      });
      
    } catch (error) {
      console.error('Error loading active orders:', error);
      document.getElementById('active-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Focus a specific order on the map
  function focusOrderOnMap(orderId) {
    const orderMarkers = markers.filter(marker => {
      // Get the marker's popup content
      const popupContent = marker.getPopup()?.getContent() || '';
      // Check if the popup content contains the order ID
      return popupContent.includes(`Order #${orderId}`);
    });
    
    if (orderMarkers.length > 0) {
      // Create a bounds object to fit all markers for this order
      const group = new L.featureGroup(orderMarkers);
      map.fitBounds(group.getBounds().pad(0.2));
      
      // Open the popup for the first marker
      orderMarkers[0].openPopup();
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
            <p><strong>Total Price:</strong> $${order.total_price}</p>
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

  // Customer Dashboard
  function loadCustomerDashboard() {
    // Load restaurants for ordering
    loadRestaurants();
    
    // Load customer orders
    loadCustomerOrders();
    
    // Set up event listeners for ordering steps
    document.getElementById('back-to-restaurants').addEventListener('click', () => {
      showOrderStep(1);
    });
    
    document.getElementById('proceed-to-delivery').addEventListener('click', () => {
      showOrderStep(3);
      initializeCustomerMap();
    });
    
    document.getElementById('back-to-menu').addEventListener('click', () => {
      showOrderStep(2);
    });
    
    // Set up delivery form submission
    document.getElementById('delivery-form').addEventListener('submit', function(e) {
      e.preventDefault();
      placeOrder();
    });
    
    // Initialize the first step
    showOrderStep(1);
  }
  
  // Show a specific order step
  function showOrderStep(stepNumber) {
    const steps = document.querySelectorAll('.order-step');
    steps.forEach(step => step.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
  }
  
  // Load all restaurants
  async function loadRestaurants() {
    try {
      const restaurants = await apiCall('/api/restaurants');
      const restaurantList = document.getElementById('restaurant-list');
      
      if (restaurants.length === 0) {
        restaurantList.innerHTML = '<p>No restaurants available.</p>';
        return;
      }
      
      restaurantList.innerHTML = '';
      
      restaurants.forEach(restaurant => {
        const restaurantCard = document.createElement('div');
        restaurantCard.className = 'restaurant-card';
        restaurantCard.dataset.id = restaurant.id;
        
        restaurantCard.innerHTML = `
          <h4>${restaurant.name}</h4>
          <p>${restaurant.address}</p>
          <button class="primary-btn select-restaurant-btn">Select</button>
        `;
        
        restaurantList.appendChild(restaurantCard);
        
        // Add click event
        restaurantCard.querySelector('.select-restaurant-btn').addEventListener('click', () => {
          selectRestaurant(restaurant.id);
        });
      });
      
    } catch (error) {
      console.error('Error loading restaurants:', error);
      document.getElementById('restaurant-list').innerHTML = 
        `<p class="error-message">Error loading restaurants: ${error.message}</p>`;
    }
  }
  
  // Select a restaurant and load its menu
  async function selectRestaurant(restaurantId) {
    try {
      // Get restaurant details
      const restaurant = await apiCall(`/api/restaurants/${restaurantId}`);
      selectedRestaurant = restaurant;
      
      // Update UI
      document.getElementById('selected-restaurant-name').textContent = restaurant.name;
      document.getElementById('selected-restaurant-address').textContent = restaurant.address;
      
      // Reset selected items
      selectedMenuItems = [];
      updateSelectedItems();
      
      // Load menu
      const menuItems = await apiCall(`/api/restaurants/${restaurantId}/menu`);
      const menuList = document.getElementById('menu-list');
      
      if (menuItems.length === 0) {
        menuList.innerHTML = '<p>No menu items available for this restaurant.</p>';
        return;
      }
      
      menuList.innerHTML = '';
      
      // Group menu items by category
      const menuByCategory = {};
      menuItems.forEach(item => {
        if (!menuByCategory[item.category]) {
          menuByCategory[item.category] = [];
        }
        menuByCategory[item.category].push(item);
      });
      
      // Create category sections
      for (const [category, items] of Object.entries(menuByCategory)) {
        const categorySection = document.createElement('div');
        categorySection.className = 'menu-category';
        categorySection.innerHTML = `<h5>${category}</h5>`;
        menuList.appendChild(categorySection);
        
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'menu-grid';
        
        items.forEach(item => {
          const menuItem = document.createElement('div');
          menuItem.className = 'menu-item';
          menuItem.dataset.id = item.id;
          
          menuItem.innerHTML = `
            <h5>${item.name}</h5>
            <p>${item.description}</p>
            <p class="menu-item-price">$${item.price.toFixed(2)}</p>
            <div class="menu-item-controls">
              <button class="decrease-item-btn">-</button>
              <input type="number" min="0" value="0" class="menu-item-quantity" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">
              <button class="increase-item-btn">+</button>
            </div>
          `;
          
          itemsGrid.appendChild(menuItem);
          
          // Set up quantity controls
          const quantityInput = menuItem.querySelector('.menu-item-quantity');
          
          menuItem.querySelector('.decrease-item-btn').addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value) || 0;
            if (currentValue > 0) {
              quantityInput.value = currentValue - 1;
              updateMenuItem(item, currentValue - 1);
            }
          });
          
          menuItem.querySelector('.increase-item-btn').addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value) || 0;
            quantityInput.value = currentValue + 1;
            updateMenuItem(item, currentValue + 1);
          });
          
          quantityInput.addEventListener('change', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            updateMenuItem(item, quantity);
          });
        });
        
        categorySection.appendChild(itemsGrid);
      }
      
      // Show step 2
      showOrderStep(2);
      
    } catch (error) {
      console.error('Error loading restaurant details:', error);
      alert(`Error: ${error.message}`);
    }
  }
  
  // Update menu item selection
  function updateMenuItem(item, quantity) {
    // Find if the item is already in the selection
    const existingItem = selectedMenuItems.find(i => i.id === item.id);
    
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      if (existingItem) {
        selectedMenuItems = selectedMenuItems.filter(i => i.id !== item.id);
      }
    } else {
      // Update or add item
      if (existingItem) {
        existingItem.quantity = quantity;
      } else {
        selectedMenuItems.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: quantity
        });
      }
    }
    
    // Update the UI
    updateSelectedItems();
  }
  
  // Update the selected items display
  function updateSelectedItems() {
    const orderItemsList = document.getElementById('order-items-list');
    const orderTotal = document.getElementById('order-total');
    const proceedButton = document.getElementById('proceed-to-delivery');
    
    if (selectedMenuItems.length === 0) {
      orderItemsList.innerHTML = '<p>No items selected</p>';
      orderTotal.textContent = 'Total: $0.00';
      proceedButton.disabled = true;
      return;
    }
    
    orderItemsList.innerHTML = '';
    let total = 0;
    
    selectedMenuItems.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'order-item-row';
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      itemRow.innerHTML = `
        <span>${item.quantity}x ${item.name}</span>
        <span>$${itemTotal.toFixed(2)}</span>
      `;
      
      orderItemsList.appendChild(itemRow);
    });
    
    orderTotal.textContent = `Total: $${total.toFixed(2)}`;
    proceedButton.disabled = false;
  }
  
  // Initialize customer map for delivery address selection
  function initializeCustomerMap() {
    if (customerMap) return; // Map already initialized
    
    const mapContainer = document.getElementById('customer-map');
    if (!mapContainer) return;
    
    // Default location (Los Angeles)
    const defaultLocation = [34.0522, -118.2437];
    
    // Initialize map
    customerMap = L.map('customer-map').setView(defaultLocation, 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(customerMap);
    
    // Add a draggable marker
    customerMarker = L.marker(defaultLocation, { draggable: true }).addTo(customerMap);
    
    // Update address field when marker is moved
    customerMarker.on('dragend', async function() {
      const position = customerMarker.getLatLng();
      try {
        // For a real implementation, this would use reverse geocoding
        // For demo purposes, we'll use coordinates as the address
        const address = `Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`;
        document.getElementById('delivery-address-input').value = address;
      } catch (error) {
        console.error('Error with reverse geocoding:', error);
      }
    });
    
    // Update marker when address field changes
    document.getElementById('delivery-address-input').addEventListener('change', async function() {
      const address = this.value;
      if (!address) return;
      
      try {
        // For a real implementation, this would use geocoding
        // For demo purposes, we'll use a random location
        const randomLocation = [
          defaultLocation[0] + (Math.random() - 0.5) * 0.05,
          defaultLocation[1] + (Math.random() - 0.5) * 0.05
        ];
        
        customerMarker.setLatLng(randomLocation);
        customerMap.setView(randomLocation, 15);
      } catch (error) {
        console.error('Error with geocoding:', error);
      }
    });
    
    // Try to get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = [position.coords.latitude, position.coords.longitude];
        customerMarker.setLatLng(userLocation);
        customerMap.setView(userLocation, 15);
        
        // Update the address field
        document.getElementById('delivery-address-input').value = 
          `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`;
      },
      (error) => {
        console.warn('Error getting user location:', error);
      }
    );
    
    // Make sure map is fully rendered
    setTimeout(() => {
      customerMap.invalidateSize();
    }, 100);
  }
  
  // Place an order
  async function placeOrder() {
    if (!selectedRestaurant || selectedMenuItems.length === 0) {
      alert('Please select a restaurant and at least one menu item');
      return;
    }
    
    const deliveryAddress = document.getElementById('delivery-address-input').value;
    const deliveryTime = document.getElementById('delivery-time').value;
    const deliveryNotes = document.getElementById('delivery-notes').value;
    
    if (!deliveryAddress || !deliveryTime) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Calculate total price
      let totalPrice = 0;
      selectedMenuItems.forEach(item => {
        totalPrice += item.price * item.quantity;
      });
      
      // Create order object
      const orderData = {
        merchant_id: selectedRestaurant.id,
        items: selectedMenuItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total_price: totalPrice,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        required_due_time: deliveryTime
      };
      
      // Submit order
      await apiCall('/api/orders/customer', 'POST', orderData);
      
      // Show success message
      alert('Order placed successfully!');
      
      // Reset form and go back to step 1
      selectedRestaurant = null;
      selectedMenuItems = [];
      document.getElementById('delivery-form').reset();
      showOrderStep(1);
      
      // Refresh orders list
      loadCustomerOrders();
      
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Error placing order: ${error.message}`);
    }
  }
  
  // Load customer orders
  async function loadCustomerOrders() {
    try {
      const orders = await apiCall('/api/orders/customer');
      const ordersList = document.getElementById('customer-orders');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>You have no orders yet.</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // Calculate time remaining until delivery
        const dueTime = new Date(order.required_due_time);
        const currentTime = new Date();
        const minutesUntilDue = Math.round((dueTime - currentTime) / (1000 * 60));
        
        // Determine status class
        let statusClass = 'status-' + order.status.replace('-', '');
        
        orderCard.innerHTML = `
          <h4>Order #${order.id}</h4>
          <div class="order-card-details">
            <p><strong>Restaurant:</strong> ${order.merchant_name}</p>
            <p><strong>Total:</strong> $${order.total_price.toFixed(2)}</p>
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${dueTime.toLocaleString()}</p>
            <p class="order-status ${statusClass}"><strong>Status:</strong> ${formatStatus(order.status)}</p>
            ${minutesUntilDue > 0 ? 
              `<p><strong>Arriving in:</strong> ${formatTimeRemaining(minutesUntilDue)}</p>` : 
              ''}
            ${order.courier_name ? 
              `<p><strong>Courier:</strong> ${order.courier_name}</p>` : 
              ''}
          </div>
          <div class="order-card-actions">
            <button class="track-order-btn" data-id="${order.id}">Track Order</button>
          </div>
        `;
        
        ordersList.appendChild(orderCard);
      });
      
      // Add event listeners to track buttons
      document.querySelectorAll('.track-order-btn').forEach(button => {
        button.addEventListener('click', function() {
          const orderId = this.getAttribute('data-id');
          trackOrder(orderId);
        });
      });
      
    } catch (error) {
      console.error('Error loading customer orders:', error);
      document.getElementById('customer-orders').innerHTML = 
        `<p class="error-message">Error loading orders: ${error.message}</p>`;
    }
  }
  
  // Format order status for display
  function formatStatus(status) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'preparing': return 'Being Prepared';
      case 'accepted': return 'Courier Assigned';
      case 'out-for-delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
  
  // Track an order on map
  function trackOrder(orderId) {
    // In a real implementation, this would open a tracking view with a map
    alert(`Tracking for order #${orderId} would be displayed here in a real app.`);
  }
  
  // Set up the map
  function setupMap() {
    const mapElement = document.getElementById('courier-map');
    if (!mapElement) return;
    
    // Default map center (can be adjusted to your region)
    const defaultCenter = [34.0522, -118.2437]; // Los Angeles: latitude, longitude
    
    // Initialize map
    map = L.map('courier-map').setView(defaultCenter, 12);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // If the courier has active orders, load them and display on map
    if (currentUser && currentUser.role === 'courier') {
      loadActiveOrdersWithLocations();
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
      
      if (orders.length === 0) {
        if (document.getElementById('route-stops')) {
          document.getElementById('route-stops').innerHTML = '<p>No active orders to display.</p>';
        }
        return;
      }
      
      // Get locations for each address (merchant and customer)
      const waypoints = [];
      
      // Start with courier's current location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const courierLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            type: 'courier',
            name: 'Your Location'
          };
          
          // Add courier marker
          addMarker(courierLocation);
          
          // Process each order
          for (const order of orders) {
            // Get merchant location
            const merchantLocation = await geocodeAddress(order.merchant_address);
            merchantLocation.type = 'merchant';
            merchantLocation.name = order.merchant_name;
            merchantLocation.orderId = order.id;
            
            // Get customer location
            const customerLocation = await geocodeAddress(order.delivery_address);
            customerLocation.type = 'customer';
            customerLocation.name = order.customer_name;
            customerLocation.orderId = order.id;
            
            // Add markers
            addMarker(merchantLocation);
            addMarker(customerLocation);
            
            // Add waypoints
            waypoints.push(L.latLng(merchantLocation.lat, merchantLocation.lng));
            waypoints.push(L.latLng(customerLocation.lat, customerLocation.lng));
          }
          
          // Calculate and display route
          if (waypoints.length > 0) {
            calculateAndDisplayRoute(courierLocation, waypoints);
          }
          
          // Fit map to show all markers
          const group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1)); // Add some padding
        },
        (error) => {
          console.error("Error getting courier location:", error);
          // If geolocation fails, use a default location
          const defaultCourierLocation = {
            lat: 34.0522,
            lng: -118.2437,
            type: 'courier',
            name: 'Default Location'
          };
          
          addMarker(defaultCourierLocation);
          
          // Process each order with default courier location
          processOrdersWithLocation(defaultCourierLocation, orders, waypoints);
        }
      );
    } catch (error) {
      console.error('Error loading active orders with locations:', error);
      if (document.getElementById('route-stops')) {
        document.getElementById('route-stops').innerHTML = 
          `<p class="error-message">Error loading route data: ${error.message}</p>`;
      }
    }
  }
  
  // Process orders when courier location is known
  async function processOrdersWithLocation(courierLocation, orders, waypoints) {
    // Process each order
    for (const order of orders) {
      // Get merchant location
      const merchantLocation = await geocodeAddress(order.merchant_address);
      merchantLocation.type = 'merchant';
      merchantLocation.name = order.merchant_name;
      merchantLocation.orderId = order.id;
      
      // Get customer location
      const customerLocation = await geocodeAddress(order.delivery_address);
      customerLocation.type = 'customer';
      customerLocation.name = order.customer_name;
      customerLocation.orderId = order.id;
      
      // Add markers
      addMarker(merchantLocation);
      addMarker(customerLocation);
      
      // Add waypoints
      waypoints.push(L.latLng(merchantLocation.lat, merchantLocation.lng));
      waypoints.push(L.latLng(customerLocation.lat, customerLocation.lng));
    }
    
    // Calculate and display route
    if (waypoints.length > 0) {
      calculateAndDisplayRoute(courierLocation, waypoints);
    }
    
    // Fit map to show all markers
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1)); // Add some padding
  }
  
  // Geocode address to get lat/lng (simulated for demo)
  async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
      // In a real implementation, use a geocoding API like Nominatim (OpenStreetMap's geocoder)
      // For this demo, we'll simulate it with random coordinates near a base location
      
      // Base location (Los Angeles)
      const baseLocation = { lat: 34.0522, lng: -118.2437 };
      
      // Generate a random location within ~3 miles
      const location = {
        lat: baseLocation.lat + (Math.random() - 0.5) * 0.06,
        lng: baseLocation.lng + (Math.random() - 0.5) * 0.06,
        address: address
      };
      
      resolve(location);
      
      /* 
      // For a real implementation with OpenStreetMap's Nominatim:
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.length > 0) {
            resolve({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              address: address
            });
          } else {
            reject(new Error('Address not found'));
          }
        })
        .catch(error => reject(error));
      */
    });
  }
  
  // Add a marker to the map
  function addMarker(location) {
    if (!map) return null;
    
    const markerColors = {
      courier: 'green',
      merchant: 'blue',
      customer: 'red'
    };
    
    // Create marker icon
    const markerHtmlStyles = `
      background-color: ${markerColors[location.type] || '#3388ff'};
      width: 2rem;
      height: 2rem;
      display: block;
      left: -1rem;
      top: -1rem;
      position: relative;
      border-radius: 2rem 2rem 0;
      transform: rotate(45deg);
      border: 1px solid #FFFFFF;
    `;
    
    const icon = L.divIcon({
      className: "marker-icon",
      iconAnchor: [0, 24],
      labelAnchor: [-6, 0],
      popupAnchor: [0, -36],
      html: `<span style="${markerHtmlStyles}" />`
    });
    
    const marker = L.marker([location.lat, location.lng], { icon: icon }).addTo(map);
    
    // Add popup with information
    const popupContent = `
      <div class="popup-content">
        <h4>${location.name}</h4>
        <p>${location.address || ''}</p>
        <p>Type: ${location.type.charAt(0).toUpperCase() + location.type.slice(1)}</p>
        ${location.orderId ? `<p>Order #${location.orderId}</p>` : ''}
      </div>
    `;
    
    marker.bindPopup(popupContent);
    markers.push(marker);
    return marker;
  }
  
  // Clear all markers from the map
  function clearMarkers() {
    if (!map) return;
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Clear any existing routes
    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
  }
  
  // Calculate and display the optimal route for multiple orders
  function calculateAndDisplayRoute(origin, waypoints) {
    // If there are no waypoints or no map, return
    if (!waypoints || waypoints.length === 0 || !map) return;
    
    // For multiple orders, we need to optimize the route
    // Start with origin
    const routeWaypoints = [L.latLng(origin.lat, origin.lng)];
    
    // Add all waypoints - first all merchant pickups, then all customer deliveries
    // This is a simple strategy - for more complex routing, consider the TSP algorithm
    const pickupWaypoints = [];
    const deliveryWaypoints = [];
    
    // Group pickup and delivery points
    for (let i = 0; i < waypoints.length; i++) {
      // In our simple implementation, even indexes are merchant locations (pickups)
      // and odd indexes are customer locations (deliveries)
      if (i % 2 === 0) {
        pickupWaypoints.push(waypoints[i]);
      } else {
        deliveryWaypoints.push(waypoints[i]);
      }
    }
    
    // Add all pickups first
    pickupWaypoints.forEach(waypoint => {
      routeWaypoints.push(waypoint);
    });
    
    // Then add all deliveries
    deliveryWaypoints.forEach(waypoint => {
      routeWaypoints.push(waypoint);
    });
    
    // Add origin as the final destination (return to start)
    routeWaypoints.push(L.latLng(origin.lat, origin.lng));
    
    // Create routing control
    routingControl = L.Routing.control({
      waypoints: routeWaypoints,
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#FF5722', opacity: 0.7, weight: 5 }]
      },
      createMarker: function() { return null; } // Don't create default markers
    }).addTo(map);
    
    // Extract route information when available
    routingControl.on('routesfound', function(e) {
      const routes = e.routes;
      const route = routes[0]; // Get the first (best) route
      
      renderRouteInfo(origin, routeWaypoints, route);
    });
    
    // For demo purposes, also render immediately with simulated data
    renderRouteInfo(origin, routeWaypoints);
  }
  
  // Display route information in the sidebar
  function renderRouteInfo(origin, waypoints, route = null) {
    const routeStopsElement = document.getElementById('route-stops');
    const estimatedTimesElement = document.getElementById('estimated-times');
    
    if (!routeStopsElement || !estimatedTimesElement) return;
    
    let routeHTML = '';
    let totalTime = 0;
    let totalDistance = 0;
    
    if (route) {
      // Use actual route data if available
      totalTime

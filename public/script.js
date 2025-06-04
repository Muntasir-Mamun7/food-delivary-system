document.addEventListener('DOMContentLoaded', function() {
  // Global variables
  const API_URL = ''; // Empty string for relative URLs in the same domain
  let token = localStorage.getItem('token');
  let currentUser = JSON.parse(localStorage.getItem('user'));
  
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
    
    // Refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      if (currentUser && currentUser.role === 'courier') {
        loadAvailableOrders();
        loadActiveOrders();
      } else {
        clearInterval(refreshInterval);
      }
    }, 30000);
  }
  
  async function loadAvailableOrders() {
    try {
      const orders = await apiCall('/api/orders/available');
      const ordersList = document.getElementById('available-orders');
      
      if (orders.length === 0) {
        ordersList.innerHTML = '<p>No available orders at the moment.</p>';
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
            <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
            <p><strong>Required By:</strong> ${new Date(order.required_due_time).toLocaleString()}</p>
            <p><strong>Total Price:</strong> $${order.total_price}</p>
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
    // In a complete application, customers would see their orders here
    document.getElementById('customer-orders').innerHTML = `
      <p>This is a simplified version. In a full application, customers would see their orders here.</p>
    `;
  }
  
  // Check if user is already logged in
  if (token && currentUser) {
    showDashboard();
  } else {
    showAuthForms();
  }
});
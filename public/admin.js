// API Base URL - usar window para evitar conflitos
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.origin;
    window.API_URL = `${window.API_BASE}/api`;
}
const API_BASE = window.API_BASE;
const API_URL = window.API_URL;

// Auth token
let authToken = localStorage.getItem('admin_token');
let currentUser = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

// Check if user is logged in
if (authToken) {
    showAdminPanel();
    loadDashboard();
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('admin_token', authToken);
            showAdminPanel();
            loadDashboard();
        } else {
            alert(data.error || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('admin_token');
    showLoginScreen();
});

function showLoginScreen() {
    loginScreen.style.display = 'flex';
    adminPanel.style.display = 'none';
}

function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'flex';
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Show section
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`${section}Section`).classList.add('active');
        
        // Load section data
        if (section === 'products') {
            loadProducts();
        } else if (section === 'orders') {
            loadOrders();
        } else if (section === 'customers') {
            loadCustomers();
        } else if (section === 'dashboard') {
            loadDashboard();
        }
    });
});

// Load Dashboard Stats
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('statProducts').textContent = stats.total_products || 0;
            document.getElementById('statOrders').textContent = stats.total_orders || 0;
            document.getElementById('statRevenue').textContent = 
                `R$ ${(stats.total_revenue || 0).toFixed(2).replace('.', ',')}`;
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Load Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/admin/products`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const products = await response.json();
            renderProductsTable(products);
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.id}</td>
            <td class="product-image-cell">
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.name}">` : 
                    '<span style="color: #666;">Sem imagem</span>'
                }
            </td>
            <td>${product.name}</td>
            <td>${product.category || '-'}</td>
            <td>R$ ${(parseFloat(product.price) || 0).toFixed(2).replace('.', ',')}</td>
            <td>${product.stock || 0}</td>
            <td>
                <span class="status-badge ${product.active ? 'active' : 'inactive'}">
                    ${product.active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick="editProduct(${product.id})">EDITAR</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">DELETAR</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Product
document.getElementById('addProductBtn').addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'NOVO PRODUTO';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productModal').classList.add('active');
});

// Close Modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('productModal').classList.remove('active');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('productModal').classList.remove('active');
});

// Image Preview
document.getElementById('productImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
});

// Save Product
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const productId = document.getElementById('productId').value;
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('category', document.getElementById('productCategory').value);
    formData.append('stock', document.getElementById('productStock').value);
    formData.append('active', document.getElementById('productActive').value);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const url = productId ? 
            `${API_URL}/admin/products/${productId}` : 
            `${API_URL}/admin/products`;
        
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Produto salvo com sucesso!');
            document.getElementById('productModal').classList.remove('active');
            loadProducts();
            loadDashboard();
        } else {
            alert(data.error || 'Erro ao salvar produto');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar produto');
    }
});

// Edit Product
async function editProduct(id) {
    try {
        const response = await fetch(`${API_URL}/admin/products/${id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const product = await response.json();
            document.getElementById('modalTitle').textContent = 'EDITAR PRODUTO';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category || 'camisetas';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productActive').value = product.active ? '1' : '0';
            
            if (product.image_url) {
                document.getElementById('imagePreview').innerHTML = 
                    `<img src="${product.image_url}" alt="Preview">`;
            } else {
                document.getElementById('imagePreview').innerHTML = '';
            }
            
            document.getElementById('productModal').classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        alert('Erro ao carregar produto');
    }
}

// Delete Product
async function deleteProduct(id) {
    if (!confirm('Tem certeza que deseja deletar este produto?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Produto deletado com sucesso!');
            loadProducts();
            loadDashboard();
        } else {
            alert(data.error || 'Erro ao deletar produto');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao deletar produto');
    }
}

// Load Orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/admin/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const orders = await response.json();
            renderOrdersTable(orders);
        }
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer_name || '-'}</td>
            <td>${order.customer_email || '-'}</td>
            <td>R$ ${order.total.toFixed(2).replace('.', ',')}</td>
            <td>
                <span class="status-badge ${order.status}">
                    ${order.status === 'pending' ? 'Pendente' : 
                      order.status === 'completed' ? 'Concluído' : 
                      order.status === 'cancelled' ? 'Cancelado' : order.status}
                </span>
            </td>
            <td>${new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <select onchange="updateOrderStatus(${order.id}, this.value)" class="btn btn-sm">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendente</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processando</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Concluído</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            loadOrders();
            loadDashboard();
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
    }
}

// ===== CUSTOMERS MANAGEMENT =====

// Load Customers
async function loadCustomers() {
    try {
        const response = await fetch(`${API_URL}/admin/customers`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const customers = await response.json();
            renderCustomersTable(customers);
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.id}</td>
            <td>${customer.name || '-'}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.cpf || '-'}</td>
            <td>${customer.city || '-'}</td>
            <td>${new Date(customer.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick="editCustomer(${customer.id})">EDITAR</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">DELETAR</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Customer
document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
    document.getElementById('customerModalTitle').textContent = 'NOVO CLIENTE';
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerModal').classList.add('active');
});

// Close Customer Modal
document.getElementById('closeCustomerModal')?.addEventListener('click', () => {
    document.getElementById('customerModal').classList.remove('active');
});

document.getElementById('cancelCustomerBtn')?.addEventListener('click', () => {
    document.getElementById('customerModal').classList.remove('active');
});

// Save Customer
document.getElementById('customerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerId = document.getElementById('customerId').value;
    const customerData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        cpf: document.getElementById('customerCpf').value,
        address: document.getElementById('customerAddress').value,
        city: document.getElementById('customerCity').value,
        state: document.getElementById('customerState').value,
        zip_code: document.getElementById('customerZipCode').value
    };

    try {
        const url = customerId ? 
            `${API_URL}/admin/customers/${customerId}` : 
            `${API_URL}/admin/customers`;
        
        const method = customerId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(customerData)
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Cliente salvo com sucesso!');
            document.getElementById('customerModal').classList.remove('active');
            loadCustomers();
        } else {
            alert(data.error || 'Erro ao salvar cliente');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar cliente');
    }
});

// Edit Customer
async function editCustomer(id) {
    try {
        const response = await fetch(`${API_URL}/admin/customers/${id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const customer = await response.json();
            document.getElementById('customerModalTitle').textContent = 'EDITAR CLIENTE';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerName').value = customer.name || '';
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerCpf').value = customer.cpf || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerCity').value = customer.city || '';
            document.getElementById('customerState').value = customer.state || '';
            document.getElementById('customerZipCode').value = customer.zip_code || '';
            
            document.getElementById('customerModal').classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao carregar cliente:', error);
        alert('Erro ao carregar cliente');
    }
}

// Delete Customer
async function deleteCustomer(id) {
    if (!confirm('Tem certeza que deseja deletar este cliente?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/customers/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Cliente deletado com sucesso!');
            loadCustomers();
        } else {
            alert(data.error || 'Erro ao deletar cliente');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao deletar cliente');
    }
}

// Make functions globally available
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;




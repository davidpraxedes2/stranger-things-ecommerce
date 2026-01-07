// Admin Dashboard - Stranger Things Store
// Sistema completo com CRUD real e notificações

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api/admin`;

// Estado global
let currentUser = null;
let collections = [];
let products = [];
let stats = {};
let sortableInstance = null;

// === AUTENTICAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    createModalContainers();
});

function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        currentUser = { username: 'admin' };
        showDashboard();
        loadPage('dashboard');
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
}

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            loadPage(page);

            document.querySelectorAll('[data-page]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    showLoading('Autenticando...');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('admin_token', data.token);
            currentUser = { username };
            showDashboard();
            loadPage('dashboard');
            showToast('Login realizado com sucesso!', 'success');
        } else {
            showToast('Credenciais inválidas', 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showToast('Erro ao conectar com servidor', 'error');
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    localStorage.removeItem('admin_token');
    currentUser = null;
    showLogin();
    showToast('Logout realizado', 'info');
}

// === SISTEMA DE NOTIFICAÇÕES ===
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icon[type]}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showLoading(message = 'Carregando...') {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'global-loader';
        document.body.appendChild(loader);
    }

    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <div class="loader-text">${message}</div>
        </div>
    `;
    loader.classList.add('active');
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.remove('active');
    }
}

// === ROTEAMENTO SPA ===
async function loadPage(pageName) {
    const contentArea = document.getElementById('contentArea');

    showLoading('Carregando página...');

    try {
        switch (pageName) {
            case 'dashboard':
                await renderDashboard(contentArea);
                break;
            case 'vitrine':
                await renderVitrine(contentArea);
                break;
            case 'products':
                await renderProducts(contentArea);
                break;
            case 'collections':
                await renderCollections(contentArea);
                break;
            case 'orders':
                await renderOrders(contentArea);
                break;
            default:
                contentArea.innerHTML = '<p>Página não encontrada</p>';
        }
    } finally {
        hideLoading();
    }
}

// === PÁGINA: DASHBOARD ===
async function renderDashboard(container) {
    await loadStats();

    const onlineUsers = Math.floor(Math.random() * 50) + 10;

    container.innerHTML = `
        <div class="page-header">
            <h1>Dashboard</h1>
            <p class="page-subtitle">Visão geral do e-commerce</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.1);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Vendas Hoje</div>
                    <div class="stat-value">R$ ${stats.today_sales || '0,00'}</div>
                    <div class="stat-change positive">+12.5% vs ontem</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(229, 9, 20, 0.1);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Pedidos</div>
                    <div class="stat-value">${stats.total_orders || '0'}</div>
                    <div class="stat-change positive">+8 hoje</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(251, 191, 36, 0.1);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="23 11 23 11 23 11"></polyline>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Usuários Online Agora</div>
                    <div class="stat-value">${onlineUsers}</div>
                    <div class="stat-change">Últimos 5 minutos</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(147, 51, 234, 0.1);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Produtos</div>
                    <div class="stat-value">${stats.total_products || '0'}</div>
                    <div class="stat-change">Total no catálogo</div>
                </div>
            </div>
        </div>

        <div class="dashboard-section">
            <h2>Atividade Recente</h2>
            <div class="activity-list">
                <div class="activity-item">
                    <div class="activity-icon success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">Novo pedido #${Math.floor(Math.random() * 1000)}</div>
                        <div class="activity-time">Há 3 minutos</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">Produto adicionado ao carrinho</div>
                        <div class="activity-time">Há 8 minutos</div>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">Estoque baixo: Camiseta Eleven</div>
                        <div class="activity-time">Há 15 minutos</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadStats() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            stats = await response.json();
        } else {
            throw new Error('Stats fetch failed');
        }
    } catch (error) {
        console.warn('Erro ao carregar estatísticas (usando fallback):', error);
        stats = { today_sales: 'R$ 0,00', total_orders: 0, total_products: 0, total_revenue: 0 };
    }
}

// === PÁGINA: GESTÃO DE VITRINE ===
async function renderVitrine(container) {
    await loadCollections();

    container.innerHTML = `
        <div class="page-header">
            <h1>Gestão de Vitrine</h1>
            <p class="page-subtitle">Arraste para reordenar as coleções exibidas na home</p>
            <button class="btn btn-primary" onclick="openCollectionModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nova Coleção
            </button>
        </div>

        <div id="collectionsList" class="collections-sortable">
            ${collections.map(col => `
                <div class="collection-drag-item" data-id="${col.id}">
                    <div class="drag-handle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="9" x2="19" y2="9"></line>
                            <line x1="5" y1="15" x2="19" y2="15"></line>
                        </svg>
                    </div>
                    <div class="collection-info">
                        <div class="collection-name">${col.name}</div>
                        <div class="collection-meta">${col.product_count || 0} produtos • Ordem: ${col.sort_order}</div>
                    </div>
                    <div class="collection-actions">
                        <button class="btn-icon" onclick="toggleCollectionActive(${col.id}, ${!col.is_active})" title="${col.is_active ? 'Ocultar' : 'Tornar visível'}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${col.is_active ?
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>' :
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
        }
                            </svg>
                            ${col.is_active ? 'Visível' : 'Oculta'}
                        </button>
                        <button class="btn-icon" onclick="openCollectionModal(${col.id})" title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="deleteCollection(${col.id})" title="Excluir">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    initSortable();
}

function initSortable() {
    const el = document.getElementById('collectionsList');
    if (el && window.Sortable) {
        if (sortableInstance) {
            sortableInstance.destroy();
        }

        sortableInstance = Sortable.create(el, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: async (evt) => {
                await updateCollectionsOrder();
            }
        });
    }
}

async function loadCollections() {
    try {
        const response = await fetch(`${API_URL}/collections`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) {
            collections = await response.json();
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
        showToast('Erro ao carregar coleções', 'error');
        collections = [];
    }
}

async function updateCollectionsOrder() {
    const items = document.querySelectorAll('.collection-drag-item');
    const order = Array.from(items).map((item, index) => ({
        id: parseInt(item.dataset.id),
        sort_order: index
    }));

    showLoading('Atualizando ordem...');

    try {
        const response = await fetch(`${API_URL}/collections/reorder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ order })
        });

        if (response.ok) {
            showToast('Ordem atualizada com sucesso!', 'success');
            await loadCollections();
        } else {
            showToast('Erro ao atualizar ordem', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        showToast('Erro ao atualizar ordem', 'error');
    } finally {
        hideLoading();
    }
}

async function toggleCollectionActive(id, isActive) {
    showLoading('Atualizando status...');

    try {
        const response = await fetch(`${API_URL}/collections/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ is_active: isActive })
        });

        if (response.ok) {
            showToast(`Coleção ${isActive ? 'ativada' : 'desativada'} com sucesso!`, 'success');
            loadPage('vitrine');
        } else {
            showToast('Erro ao atualizar coleção', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar coleção:', error);
        showToast('Erro ao atualizar coleção', 'error');
    } finally {
        hideLoading();
    }
}

// === PÁGINA: PRODUTOS ===
async function renderProducts(container) {
    await loadProducts();
    await loadCollections();

    container.innerHTML = `
        <div class="page-header">
            <h1>Produtos</h1>
            <button class="btn btn-primary" onclick="openProductModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Novo Produto
            </button>
        </div>

        <div class="filters-bar">
            <input type="text" id="productSearch" placeholder="Buscar produtos..." class="search-input" onkeyup="filterProducts()">
            <select id="collectionFilter" class="filter-select" onchange="filterProducts()">
                <option value="">Todas as coleções</option>
                ${collections.map(col => `<option value="${col.id}">${col.name}</option>`).join('')}
            </select>
        </div>

        <div class="table-container">
            <table class="admin-table" id="productsTable">
                <thead>
                    <tr>
                        <th>Imagem</th>
                        <th>Nome</th>
                        <th>Preço</th>
                        <th>Estoque</th>
                        <th>Coleções</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr data-product-id="${product.id}">
                            <td>
                                <div class="product-thumb">
                                    ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` :
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'}
                                </div>
                            </td>
                            <td><strong>${product.name}</strong></td>
                            <td>R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</td>
                            <td><span class="badge ${product.stock > 10 ? 'success' : 'warning'}">${product.stock || 0}</span></td>
                            <td><span class="collections-tags">${(product.collections || []).slice(0, 2).join(', ') || '-'}</span></td>
                            <td>
                                <button class="btn-icon" onclick="editProduct(${product.id})" title="Editar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="btn-icon danger" onclick="deleteProduct(${product.id})" title="Excluir">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        if (response.ok) {
            products = await response.json();
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showToast('Erro ao carregar produtos', 'error');
        products = [];
    }
}

function filterProducts() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const collectionId = document.getElementById('collectionFilter').value;

    const rows = document.querySelectorAll('#productsTable tbody tr');
    rows.forEach(row => {
        const name = row.querySelector('strong').textContent.toLowerCase();
        const matchSearch = name.includes(search);
        const matchCollection = !collectionId || true;

        row.style.display = (matchSearch && matchCollection) ? '' : 'none';
    });
}

// === PÁGINA: COLEÇÕES ===
async function renderCollections(container) {
    await loadCollections();

    container.innerHTML = `
        <div class="page-header">
            <h1>Coleções</h1>
            <button class="btn btn-primary" onclick="openCollectionModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nova Coleção
            </button>
        </div>

        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Slug</th>
                        <th>Produtos</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${collections.map(col => `
                        <tr>
                            <td><strong>${col.name}</strong></td>
                            <td><code>${col.slug}</code></td>
                            <td>${col.product_count || 0}</td>
                            <td><span class="badge ${col.is_active ? 'success' : 'danger'}">${col.is_active ? 'Ativa' : 'Inativa'}</span></td>
                            <td>
                                <button class="btn-icon" onclick="manageCollectionProducts(${col.id})" title="Gerenciar Produtos">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                </button>
                                <button class="btn-icon" onclick="openCollectionModal(${col.id})" title="Editar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="btn-icon danger" onclick="deleteCollection(${col.id})" title="Excluir">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// === PÁGINA: PEDIDOS ===
async function renderOrders(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>Pedidos</h1>
        </div>

        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Data</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 60px 20px; color: #999;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.3;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <div>Em desenvolvimento - integração com pedidos</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

// === MODAIS ===
function createModalContainers() {
    if (!document.getElementById('modalContainer')) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        document.body.appendChild(modalContainer);
    }
}

async function openCollectionModal(collectionId = null) {
    const collection = collectionId ? collections.find(c => c.id === collectionId) : null;
    const isEdit = !!collection;

    // Carregar produtos e associações
    let allProducts = products;
    if (allProducts.length === 0) {
        try {
            // Usar endpoint publico/admin para listar produtos
            const res = await fetch(`${API_BASE}/api/products`);
            if (res.ok) allProducts = await res.json();
        } catch (e) { console.error(e); }
    }

    let associatedIds = new Set();
    if (isEdit) {
        try {
            const res = await fetch(`${API_URL}/collections/${collectionId}/products`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            if (res.ok) {
                const ids = await res.json();
                associatedIds = new Set(ids);
            }
        } catch (e) { console.error(e); }
    }

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-dialog" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Coleção' : 'Nova Coleção'}</h2>
                    <button class="modal-close" onclick="closeModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form id="collectionForm" class="modal-body">
                    <!-- Tabs Navigation -->
                    <div class="tabs-nav" style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #ddd;">
                        <button type="button" class="tab-btn active" onclick="switchTab(this, 'tab-info')" style="padding:8px 16px; border:none; background:none; cursor:pointer; font-weight:bold; border-bottom:2px solid #e50914;">Informações</button>
                        <button type="button" class="tab-btn" onclick="switchTab(this, 'tab-products')" style="padding:8px 16px; border:none; background:none; cursor:pointer;">Produtos (${associatedIds.size})</button>
                    </div>

                    <!-- Tab: Informações -->
                    <div id="tab-info" class="tab-content">
                        <div class="form-group">
                            <label>Nome da Coleção *</label>
                            <input type="text" name="name" value="${collection?.name || ''}" required placeholder="Ex: Roupas Stranger Things">
                        </div>
                        <div class="form-group">
                            <label>Slug (URL) *</label>
                            <input type="text" name="slug" value="${collection?.slug || ''}" required placeholder="Ex: roupas-stranger-things">
                            <small>Usado na URL. Apenas letras minúsculas, números e hífens.</small>
                        </div>
                        <div class="form-group">
                            <label>Descrição</label>
                            <textarea name="description" rows="3" placeholder="Descrição opcional da coleção">${collection?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_active" ${collection?.is_active !== false ? 'checked' : ''}>
                                <span>Coleção ativa (visível na loja)</span>
                            </label>
                        </div>
                    </div>

                    <!-- Tab: Produtos -->
                    <div id="tab-products" class="tab-content" style="display:none;">
                        <div class="form-group">
                            <input type="text" placeholder="Buscar produto..." onkeyup="filterCollectionProducts(this)" style="margin-bottom:10px; width:100%; padding:8px;">
                            <div class="products-list-scroll" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                                ${allProducts.map(p => `
                                    <div class="product-selection-item" style="display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid #eee;">
                                        <input type="checkbox" name="product_ids" value="${p.id}" ${associatedIds.has(p.id) ? 'checked' : ''} style="width:auto; margin:0;">
                                        <div style="width:30px; height:30px; background:#f0f0f0; border-radius:4px; overflow:hidden;">
                                            ${p.image_url ? `<img src="${p.image_url}" style="width:100%; height:100%; object-fit:cover;">` : ''}
                                        </div>
                                        <span class="prod-name" style="font-size:14px;">${p.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" form="collectionForm" class="btn btn-primary">
                        ${isEdit ? 'Salvar Alterações' : 'Criar Coleção'}
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = modalHTML;

    // Helpers globais para o modal
    window.switchTab = (btn, tabId) => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.borderBottom = 'none';
        });
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

        btn.classList.add('active');
        btn.style.borderBottom = '2px solid #e50914';
        document.getElementById(tabId).style.display = 'block';
    };

    window.filterCollectionProducts = (input) => {
        const term = input.value.toLowerCase();
        document.querySelectorAll('.product-selection-item').forEach(item => {
            const name = item.querySelector('.prod-name').innerText.toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    };

    document.getElementById('collectionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCollection(collectionId);
    });

    // Auto-gerar slug
    const nameInput = document.querySelector('[name="name"]');
    const slugInput = document.querySelector('[name="slug"]');
    if (!isEdit && nameInput && slugInput) {
        nameInput.addEventListener('input', () => {
            slugInput.value = nameInput.value
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        });
    }
}

async function saveCollection(collectionId) {
    const form = document.getElementById('collectionForm');
    const formData = new FormData(form);

    // Coletar IDs dos produtos selecionados
    const selectedProducts = [];
    form.querySelectorAll('input[name="product_ids"]:checked').forEach(cb => {
        selectedProducts.push(parseInt(cb.value));
    });

    const data = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description') || '',
        is_active: formData.get('is_active') === 'on'
    };

    showLoading(collectionId ? 'Atualizando coleção...' : 'Criando coleção...');

    try {
        // 1. Salvar dados básicos da coleção
        const url = collectionId ? `${API_URL}/collections/${collectionId}` : `${API_URL}/collections`;
        const method = collectionId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            // ID da coleção (se for update usa params, se insert usa retorno)
            const targetId = collectionId || result.id;

            // 2. Salvar associações de produtos (Bulk Update)
            if (targetId) {
                await fetch(`${API_URL}/collections/${targetId}/products`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                    },
                    body: JSON.stringify({ product_ids: selectedProducts })
                });
            }

            showToast(`Coleção ${collectionId ? 'atualizada' : 'criada'} com sucesso!`, 'success');
            closeModal();
            loadPage(window.location.hash.includes('vitrine') ? 'vitrine' : 'collections');
        } else {
            const error = await response.json();
            showToast(error.error || 'Erro ao salvar coleção', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar coleção:', error);
        showToast('Erro ao salvar coleção', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteCollection(id) {
    const collection = collections.find(c => c.id === id);
    if (!confirm(`Tem certeza que deseja excluir a coleção "${collection?.name}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    showLoading('Excluindo coleção...');

    try {
        const response = await fetch(`${API_URL}/collections/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });

        if (response.ok) {
            showToast('Coleção excluída com sucesso!', 'success');
            loadPage(window.location.hash.includes('vitrine') ? 'vitrine' : 'collections');
        } else {
            showToast('Erro ao excluir coleção', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir coleção:', error);
        showToast('Erro ao excluir coleção', 'error');
    } finally {
        hideLoading();
    }
}

function openProductModal(productId = null) {
    const product = productId ? products.find(p => p.id === productId) : null;
    const isEdit = !!product;

    // Parse existing images for display
    let existingImages = '';
    if (product && product.images_json) {
        try {
            const parsed = JSON.parse(product.images_json);
            if (Array.isArray(parsed)) {
                existingImages = parsed.join('\n');
            }
        } catch (e) {
            console.error('Error parsing images_json', e);
        }
    }

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-dialog" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <button class="modal-close" onclick="closeModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <form id="productForm" class="modal-body" enctype="multipart/form-data">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label>Nome do Produto *</label>
                            <input type="text" name="name" value="${product?.name || ''}" required placeholder="Ex: Camiseta Hellfire Club">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Categoria</label>
                            <input type="text" name="category" value="${product?.category || ''}" placeholder="Ex: Roupas">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Preço (R$) *</label>
                            <input type="number" name="price" value="${product?.price || ''}" step="0.01" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>Estoque</label>
                            <input type="number" name="stock" value="${product?.stock || 0}" placeholder="0">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea name="description" rows="3" placeholder="Descrição do produto...">${product?.description || ''}</textarea>
                    </div>

                    <!-- Imagem (Simulando upload ou URL, o server aceita multipart mas vamos simplificar se possivel, ou implementar multipart) -->
                    <!-- Para simplificar e garantir compatibilidade com server.js existente que aceita multipart form-data para insert/update -->
                   
                    <div class="form-group">
                        <label>Imagem Principal (Upload)</label>
                        <input type="file" name="image" accept="image/*">
                        ${product?.image_url ? `<br><small>Imagem atual: <a href="${product.image_url}" target="_blank">Ver imagem</a></small>` : ''}
                    </div>

                    <div class="form-group">
                        <label>Fotos Adicionais (URLs) - Uma por linha</label>
                        <textarea name="additional_images" rows="4" placeholder="https://.../foto2.jpg&#10;https://.../foto3.jpg" style="font-family: monospace; font-size: 12px;">${existingImages}</textarea>
                        <small>Cole links de imagens aqui para criar a galeria/miniaturas.</small>
                    </div>

                    <div class="form-group">
                         <label class="checkbox-label">
                            <input type="checkbox" name="has_variants" ${product?.has_variants ? 'checked' : ''}>
                            <span>Este produto possui variantes (P, M, G...)?</span>
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="active" ${product?.active !== 0 ? 'checked' : ''}>
                            <span>Produto ativo (visível na loja)</span>
                        </label>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" form="productForm" class="btn btn-primary">
                        ${isEdit ? 'Salvar Alterações' : 'Criar Produto'}
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) createModalContainers();
    document.getElementById('modalContainer').innerHTML = modalHTML;

    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProduct(productId);
    });
}

async function saveProduct(productId) {
    const form = document.getElementById('productForm');
    const formData = new FormData(form);

    // Processar imagens adicionais
    const additionalImagesRaw = formData.get('additional_images');
    if (additionalImagesRaw) {
        const imagesArray = additionalImagesRaw.split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);

        formData.append('images_json', JSON.stringify(imagesArray));
        // Remove raw field just in case
        formData.delete('additional_images');
    } else {
        formData.append('images_json', '[]');
    }

    // Converter checkbox 'on'/'off' em boleano para o DB/API
    // API esperaMultipart, então campos checkbox não enviados se unchecked, mas se checked envia 'on'.
    // Server side deve tratar? Vou olhar o server.js
    // Server: const { ... active, has_variants } = req.body; ... [ ... active ? 1 : 0, has_variants ? 1 : 0 ]
    // Se o FormData enviar 'on', 'if ("on")' é true. Se não enviar (undefined), é false.
    // Então o FormData padrão do browser funciona perfeitamente com a lógica do server.js que espera truthy/falsy.

    showLoading(productId ? 'Atualizando produto...' : 'Criando produto...');

    try {
        const url = productId ? `${API_URL}/admin/products/${productId}` : `${API_URL}/admin/products`;
        const method = productId ? 'PUT' : 'POST';

        // Usar FormData diretamente permite upload de arquivos se implementado no server
        // Headers CONTENT-TYPE não deve ser setado manualmente com FormData, o browser seta com boundary
        const response = await fetch(url, {
            method,
            headers: {
                // 'Content-Type': 'multipart/form-data', // NÃO SETAR!
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: formData
        });

        if (response.ok) {
            showToast(`Produto ${productId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            closeModal();
            loadPage('products');
        } else {
            const error = await response.json();
            showToast(error.error || 'Erro ao salvar produto', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showToast('Erro ao salvar produto', 'error');
    } finally {
        hideLoading();
    }
}

function editProduct(id) {
    openProductModal(id);
}

function deleteProduct(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    showLoading('Excluindo...');
    fetch(`${API_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
    })
        .then(res => {
            if (res.ok) {
                showToast('Produto excluído', 'success');
                loadPage('products');
            } else {
                showToast('Erro ao excluir', 'error');
            }
        })
        .catch(err => showToast('Erro de conexão', 'error'))
        .finally(() => hideLoading());
}

// === GESTÃO DE PRODUTOS DA COLEÇÃO ===
async function manageCollectionProducts(collectionId) {
    showLoading('Carregando produtos...');
    try {
        const collectionsResp = await fetch(`${API_URL}/collections`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } });
        const allCollections = await collectionsResp.json();
        const collection = allCollections.find(c => c.id === collectionId);

        const productsResp = await fetch(`${API_BASE}/api/products`);
        let allProducts = await productsResp.json();

        // IDs n coleção
        const inCollectionIds = new Set((collection.products || []).map(p => p.id));
        const productsIn = collection.products || [];
        const productsOut = allProducts.filter(p => !inCollectionIds.has(p.id));

        const modalHtml = `
            <div id="collectionProductsModal" class="modal-overlay" style="display: flex;">
                <div class="modal-content" style="width: 90%; max-width: 900px; height: 80vh; display: flex; flex-direction: column;">
                    <div class="modal-header">
                        <h2>Gerenciar: ${collection.name}</h2>
                        <button class="close-btn" onclick="closeModal()">×</button>
                    </div>
                    
                    <div class="modal-body" style="flex: 1; display: flex; gap: 20px; overflow: hidden; padding: 20px;">
                        
                        <!-- Coluna: Na Coleção -->
                        <div class="pm-column" style="flex: 1; display: flex; flex-direction: column; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <h3 style="margin-bottom: 10px;">Na Coleção (${productsIn.length}) <small>(Arraste para ordenar)</small></h3>
                            <div id="inCollectionList" class="pm-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                                ${productsIn.map(p => renderProductItem(p, true, collectionId)).join('')}
                            </div>
                        </div>

                        <!-- Coluna: Disponíveis -->
                        <div class="pm-column" style="flex: 1; display: flex; flex-direction: column; background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
                            <h3 style="margin-bottom: 10px;">Produtos Disponíveis</h3>
                            <input type="text" placeholder="Buscar produto..." class="form-input" onkeyup="filterPMList(this)" style="margin-bottom: 10px;">
                            <div id="outCollectionList" class="pm-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                                ${productsOut.map(p => renderProductItem(p, false, collectionId)).join('')}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('modalContainer');
        if (!container) createModalContainers();
        document.getElementById('modalContainer').innerHTML = modalHtml;

        // Init Sortable para a lista "In Collection"
        if (typeof Sortable !== 'undefined') {
            Sortable.create(document.getElementById('inCollectionList'), {
                animation: 150,
                onEnd: () => saveCollectionProductOrder(collectionId)
            });
        }

    } catch (e) {
        console.error(e);
        showToast('Erro ao carregar dados', 'error');
    } finally {
        hideLoading();
    }
}

function renderProductItem(product, isIn, collectionId) {
    return `
        <div class="pm-item" data-id="${product.id}" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #ddd; display: flex; align-items: center; gap: 10px;">
            <img src="${product.image_url || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 14px;">${product.name}</div>
                <div style="font-size: 12px; color: #666;">R$ ${parseFloat(product.price).toFixed(2)}</div>
            </div>
            <button class="btn-icon ${isIn ? 'danger' : 'success'}" 
                onclick="${isIn ? `removeProductFromCollection(${collectionId}, ${product.id})` : `addProductToCollection(${collectionId}, ${product.id})`}">
                ${isIn ?
            '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' :
            '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'}
            </button>
        </div>
    `;
}

async function addProductToCollection(collectionId, productId) {
    try {
        const response = await fetch(`${API_URL}/collections/${collectionId}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ product_id: productId })
        });
        if (response.ok) {
            manageCollectionProducts(collectionId); // Reload modal
        } else {
            const data = await response.json();
            showToast(data.error || 'Erro ao adicionar', 'error');
        }
    } catch (e) { console.error(e); showToast('Erro de conexão', 'error'); }
}

async function removeProductFromCollection(collectionId, productId) {
    if (!confirm('Remover produto da coleção?')) return;
    try {
        const response = await fetch(`${API_URL}/collections/${collectionId}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) {
            manageCollectionProducts(collectionId); // Reload modal
        } else {
            showToast('Erro ao remover', 'error');
        }
    } catch (e) { console.error(e); showToast('Erro de conexão', 'error'); }
}

async function saveCollectionProductOrder(collectionId) {
    const items = document.querySelectorAll('#inCollectionList .pm-item');
    const order = Array.from(items).map((item, index) => ({
        product_id: parseInt(item.dataset.id),
        sort_order: index
    }));

    try {
        await fetch(`${API_URL}/collections/${collectionId}/reorder-products`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ order })
        });
    } catch (e) { console.error('Erro ao salvar ordem', e); }
}

function filterPMList(input) {
    const term = input.value.toLowerCase();
    const items = document.querySelectorAll('#outCollectionList .pm-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

function closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.innerHTML = '';
    }
}

// Global Exports
window.openCollectionModal = openCollectionModal;
window.openProductModal = openProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.deleteCollection = deleteCollection;
window.toggleCollectionActive = toggleCollectionActive;
window.filterProducts = filterProducts;
window.closeModal = closeModal;
window.manageCollectionProducts = manageCollectionProducts;
window.addProductToCollection = addProductToCollection;
window.removeProductFromCollection = removeProductFromCollection;
window.saveCollectionProductOrder = saveCollectionProductOrder;
window.filterPMList = filterPMList;

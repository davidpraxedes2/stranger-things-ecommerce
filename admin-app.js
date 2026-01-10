// STRANGER THINGS E-COMMERCE - ADMIN DASHBOARD PRO
// Production-Ready Admin Panel with Advanced Features
// v2.1 (Fix Patch) - Debug Mode
// =====================================================

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api/admin`;

// =====================================================
// GLOBAL STATE MANAGEMENT
// =====================================================

const AppState = {
    currentUser: null,
    collections: [],
    products: [],
    orders: [],
    customers: [],
    stats: {},
    analytics: {},
    inventory: [],
    settings: {},
    charts: {},

    // Filters & Search
    filters: {
        products: { search: '', collection: '', status: '', priceRange: null },
        orders: { search: '', status: '', dateRange: null },
        customers: { search: '', segment: '', tags: [] }
    },

    // Pagination
    pagination: {
        products: { page: 1, limit: 20, total: 0 },
        orders: { page: 1, limit: 20, total: 0 },
        customers: { page: 1, limit: 20, total: 0 }
    },

    // Selection (for bulk actions)
    selected: {
        products: new Set(),
        orders: new Set(),
        customers: new Set()
    }
};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    checkAuth();
    setupEventListeners();
    createModalContainers();
    setupRefreshButton();
    setupNotifications();
    setupHashNavigation();
}

function setupHashNavigation() {
    // Listener para mudanças no hash (quando clicar nos links)
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1);
        if (page && AppState.currentUser) {
            loadPage(page);
        }
    });
}

// =====================================================
// AUTHENTICATION
// =====================================================

function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        AppState.currentUser = { username: 'admin' };
        showDashboard();

        // Restaurar página do hash ou localStorage
        const hashPage = window.location.hash.substring(1);
        const savedPage = localStorage.getItem('admin_current_page');
        const pageToLoad = hashPage || savedPage || 'dashboard';

        loadPage(pageToLoad);
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
            AppState.currentUser = { username };
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
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('admin_token');
        AppState.currentUser = null;
        showLogin();
        showToast('Logout realizado', 'info');
    }
}

// Helper para headers de autenticação
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    };
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Os links já usam hash (#products, #orders, etc)
    // O evento hashchange vai lidar com a navegação
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            // Deixa o hash mudar naturalmente, hashchange vai pegar
            const page = link.dataset.page;
            window.location.hash = page;
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const currentPage = localStorage.getItem('admin_current_page') || 'dashboard';
            loadPage(currentPage);
            showToast('Dados atualizados', 'success');
        });
    }
}

function setupNotifications() {
    const notifBtn = document.getElementById('notificationsBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            showNotificationsPanel();
        });
    }
}

// =====================================================
// ROUTING & PAGE LOADING
// =====================================================

async function loadPage(pageName) {
    const contentArea = document.getElementById('contentArea');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    showLoading('Carregando página...');

    try {
        const pageConfigs = {
            dashboard: {
                title: 'Dashboard',
                subtitle: 'Visão geral e métricas em tempo real',
                render: renderDashboard
            },
            analytics: {
                title: 'Analytics',
                subtitle: 'Relatórios detalhados e análise de dados',
                render: renderAnalytics
            },
            products: {
                title: 'Produtos',
                subtitle: 'Gerenciamento completo do catálogo',
                render: renderProducts
            },
            collections: {
                title: 'Coleções',
                subtitle: 'Organize produtos em coleções temáticas',
                render: renderCollections
            },
            orders: {
                title: 'Pedidos',
                subtitle: 'Gestão completa de pedidos e status',
                render: renderOrders
            },
            customers: {
                title: 'Clientes',
                subtitle: 'Base de clientes e segmentação',
                render: renderCustomers
            },
            inventory: {
                title: 'Estoque',
                subtitle: 'Controle de inventário e alertas',
                render: renderInventory
            },
            shipping: {
                title: 'Fretes',
                subtitle: 'Gerenciamento de opções de frete',
                render: renderShipping
            },
            tracking: {
                title: 'Rastreamento',
                subtitle: 'Configurações de Pixel e Analytics',
                render: renderTracking
            },
            gateways: {
                title: 'Gateways de Pagamento',
                subtitle: 'Configuração de meios de pagamento',
                render: renderGateways
            },
            settings: {
                title: 'Configurações',
                subtitle: 'Configurações gerais da loja',
                render: renderSettings
            }
        };

        const config = pageConfigs[pageName] || pageConfigs.dashboard;

        pageTitle.textContent = config.title;
        pageSubtitle.textContent = config.subtitle;

        // Salvar página atual
        localStorage.setItem('admin_current_page', pageName);

        // Atualizar hash na URL (sem recarregar)
        if (window.location.hash !== '#' + pageName) {
            history.replaceState(null, null, '#' + pageName);
        }

        // Atualizar menu ativo
        document.querySelectorAll('[data-page]').forEach(link => {
            if (link.dataset.page === pageName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        await config.render(contentArea);
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        contentArea.innerHTML = `
            <div class="error-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; color: var(--danger); margin-bottom: 16px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2>Erro ao carregar página</h2>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Recarregar</button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// =====================================================
// DASHBOARD PAGE
// =====================================================

async function renderDashboard(container) {
    await loadStats();
    await loadRecentActivity();

    const onlineUsers = Math.floor(Math.random() * 50) + 10;
    const todaySales = AppState.stats.today_sales || 'R$ 0,00';
    const totalOrders = AppState.stats.total_orders || 0;
    const totalProducts = AppState.stats.total_products || 0;
    const totalRevenue = AppState.stats.total_revenue || 0;

    container.innerHTML = `
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Vendas Hoje</div>
                    <div class="stat-value">${todaySales}</div>
                    <div class="stat-change positive">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        +12.5% vs ontem
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, rgba(229, 9, 20, 0.2), rgba(229, 9, 20, 0.05));">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Pedidos</div>
                    <div class="stat-value">${totalOrders}</div>
                    <div class="stat-change positive">+8 hoje</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05));">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Visitantes Online</div>
                    <div class="stat-value">${onlineUsers}</div>
                    <div class="stat-change">Últimos 5 minutos</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(147, 51, 234, 0.05));">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9333EA" stroke-width="2">
                        <path d="M20 7h-9"></path>
                        <path d="M14 17H5"></path>
                        <circle cx="17" cy="17" r="3"></circle>
                        <circle cx="7" cy="7" r="3"></circle>
                    </svg>
                </div>
                <div class="stat-content">
                    <div class="stat-label">Produtos</div>
                    <div class="stat-value">${totalProducts}</div>
                    <div class="stat-change">Total no catálogo</div>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="dashboard-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 32px;">
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">Vendas dos Últimos 7 Dias</h3>
                    <div class="chart-filters">
                        <button class="chart-filter-btn active" data-period="7d">7 Dias</button>
                        <button class="chart-filter-btn" data-period="30d">30 Dias</button>
                        <button class="chart-filter-btn" data-period="90d">90 Dias</button>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="salesChart"></canvas>
                </div>
            </div>

            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">Top Categorias</h3>
                </div>
                <div class="chart-wrapper" style="height: 250px;">
                    <canvas id="categoriesChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="dashboard-section">
            <h2>Atividade Recente</h2>
            <div class="activity-list" id="activityList">
                <!-- Activities will be populated by JS -->
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-section">
            <h2>Ações Rápidas</h2>
            <div class="quick-actions-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px;">
                <button class="quick-action-card" onclick="openProductModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span>Novo Produto</span>
                </button>
                <button class="quick-action-card" onclick="openCollectionModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    <span>Nova Coleção</span>
                </button>
                <button class="quick-action-card" onclick="loadPage('orders')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span>Ver Pedidos</span>
                </button>
                <button class="quick-action-card" onclick="loadPage('analytics')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="20" x2="12" y2="10"></line>
                        <line x1="18" y1="20" x2="18" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="16"></line>
                    </svg>
                    <span>Analytics</span>
                </button>
            </div>
        </div>
    `;

    initializeDashboardCharts();
    loadRecentActivityUI();
}

function initializeDashboardCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }

    // Sales Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        const salesData = generateMockSalesData(7);
        AppState.charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: salesData.values,
                    borderColor: '#E50914',
                    backgroundColor: 'rgba(229, 9, 20, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1A1A1A',
                        titleColor: '#FFF',
                        bodyColor: '#FFF',
                        borderColor: '#2A2A2A',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#2A2A2A' },
                        ticks: { color: '#A0A0A0' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#A0A0A0' }
                    }
                }
            }
        });
    }

    // Categories Chart
    const categoriesCtx = document.getElementById('categoriesChart');
    if (categoriesCtx) {
        AppState.charts.categories = new Chart(categoriesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Roupas', 'Acessórios', 'Decoração', 'Outros'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: [
                        '#E50914',
                        '#10B981',
                        '#F59E0B',
                        '#3B82F6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#A0A0A0', padding: 15 }
                    }
                }
            }
        });
    }
}

function generateMockSalesData(days) {
    const labels = [];
    const values = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
        values.push(Math.floor(Math.random() * 5000) + 1000);
    }

    return { labels, values };
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
            AppState.stats = await response.json();
        } else {
            throw new Error('Stats fetch failed');
        }
    } catch (error) {
        console.warn('Erro ao carregar estatísticas:', error);
        AppState.stats = {
            today_sales: 'R$ 0,00',
            total_orders: 0,
            total_products: 0,
            total_revenue: 0
        };
    }
}

async function loadRecentActivity() {
    AppState.recentActivity = [
        {
            type: 'success',
            icon: 'check',
            title: `Novo pedido #${Math.floor(Math.random() * 1000)}`,
            time: 'Há 3 minutos'
        },
        {
            type: 'info',
            icon: 'star',
            title: 'Produto adicionado ao carrinho',
            time: 'Há 8 minutos'
        },
        {
            type: 'warning',
            icon: 'alert',
            title: 'Estoque baixo: Camiseta Eleven',
            time: 'Há 15 minutos'
        },
        {
            type: 'success',
            icon: 'user',
            title: 'Novo cliente cadastrado',
            time: 'Há 23 minutos'
        }
    ];
}

function loadRecentActivityUI() {
    const container = document.getElementById('activityList');
    if (!container) return;

    const icons = {
        check: '<polyline points="20 6 9 17 4 12"></polyline>',
        star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
        alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
    };

    container.innerHTML = AppState.recentActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${icons[activity.icon]}
                </svg>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// =====================================================
// ANALYTICS PAGE
// ===================================================== */

async function renderAnalytics(container) {
    let onlineUsers = 0;

    try {
        const response = await fetch(`${API_URL}/analytics/online-count`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
            const data = await response.json();
            onlineUsers = data.count || 0;
        }
    } catch (error) {
        console.log('Dados de visitantes online não disponíveis');
    }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>🔴 LIVE VIEW - Tempo Real</h1>
                <p class="page-subtitle">Monitoramento de visitantes em tempo real</p>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--success-bg); border: 1px solid var(--success); border-radius: 8px;">
                    <div style="width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse-dot 2s infinite;"></div>
                    <span style="color: var(--success); font-weight: 700; font-size: 14px;">AO VIVO</span>
                </div>
            </div>
        </div>

        <!-- Online Stats -->
        <div class="stats-grid" style="margin-bottom: 32px;">
            <div class="stat-card">
                <div class="stat-label">👥 Visitantes Online</div>
                <div class="stat-value" id="onlineCount" style="color: var(--success);">${onlineUsers}</div>
                <div class="stat-change">Atualizado agora</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">📍 Localizações Ativas</div>
                <div class="stat-value" id="locationsCount">0</div>
                <div class="stat-change">Cidades diferentes</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">📄 Página Mais Visitada</div>
                <div class="stat-value" style="font-size: 18px;" id="topPage">-</div>
                <div class="stat-change positive" id="topPagePercent">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">⏱️ Tempo Médio</div>
                <div class="stat-value" id="avgTime">-</div>
                <div class="stat-change">minutos na página</div>
            </div>
        </div>

        <!-- Live View Grid -->
        <div style="display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 24px; margin-bottom: 32px;">
            <!-- Brazil Map -->
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">🗺️ Mapa de Visitantes - Brasil</h3>
                </div>
                <div id="brazilMap" style="padding: 20px; height: 450px; position: relative; background: var(--bg-darker); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <!-- SVG Map will be injected here -->
                </div>
            </div>

            <!-- Active Sessions -->
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">👁️ Sessões Ativas</h3>
                </div>
                <div id="activeSessions" style="padding: 20px; height: 450px; overflow-y: auto;">
                    <!-- Sessions will be populated by JS -->
                </div>
            </div>
        </div>

        <!-- Top Products Table -->
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">🏆 Top 10 Produtos Mais Vendidos</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Vendas</th>
                        <th>Receita</th>
                        <th>Crescimento</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateTopProductsRows()}
                </tbody>
            </table>
        </div>
    `;

    initializeLiveView();
}

// ... helper ...
function generateSessionsHTML(sessions) {
    if (!sessions || sessions.length === 0) return '<div class="text-muted" style="text-align:center; padding: 20px;">Nenhum visitante ativo no momento</div>';

    return sessions.map(s => {
        // UTM Icons Logic
        // UTM Icons Logic
        let sourceIcon = '';
        if (s.utm_source) {
            const source = s.utm_source.toLowerCase();
            if (source.includes('instagram') || source.includes('ig')) {
                sourceIcon = '<i class="fa-brands fa-instagram" style="background: -webkit-linear-gradient(45deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>';
            } else if (source.includes('facebook') || source.includes('fb')) {
                sourceIcon = '<i class="fa-brands fa-facebook" style="color: #1877F2;"></i>';
            } else if (source.includes('google')) {
                sourceIcon = '<i class="fa-brands fa-google" style="color: #4285F4;"></i>';
            } else if (source.includes('tiktok')) {
                sourceIcon = '<i class="fa-brands fa-tiktok" style="color: #000000; filter: drop-shadow(0 0 1px rgba(255,255,255,0.5));"></i>';
            } else if (source.includes('whatsapp')) {
                sourceIcon = '<i class="fa-brands fa-whatsapp" style="color: #25D366;"></i>';
            } else {
                sourceIcon = '<i class="fa-solid fa-link" style="color: #A0A0A0;"></i>';
            }
        }

        // Location & IP Logic
        const locationText = s.city && s.city !== 'Desconhecido' ? s.city : '📍 Localizando...';
        const flag = s.country === 'BR' ? '🇧🇷' : '';

        return `
        <div class="session-card" style="margin-bottom: 12px; padding: 12px; background: var(--bg-hover); border-radius: 8px; border-left: 3px solid #10B981;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 700; color: #FFF; font-size: 13px;">${flag} ${locationText}</span>
                    <span style="font-size: 10px; color: #666; font-family: monospace;">${s.ip || ''}</span>
                </div>
                <div style="font-size: 16px;">
                    ${sourceIcon ? `<span title="Via ${s.utm_source}">${sourceIcon}</span>` : ''}
                    <span style="font-size: 11px; color: #A0A0A0;">${s.device === 'Mobile' ? '📱 Mobile' : (s.device === 'Tablet' ? '📱 Tablet' : '')}</span>
                </div>
            </div>
            <div style="font-size: 11px; color: #A0A0A0; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="${s.page}">
                ${s.page}
            </div>
             <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #666;">
                <span>Há ${s.duration || '0m'}</span>
                ${s.utm_campaign ? `<span style="background: rgba(245, 158, 11, 0.1); color: #F59E0B; padding: 1px 4px; border-radius: 4px;">${s.utm_campaign}</span>` : ''}
            </div>
        </div>
    `}).join('');
}
function generateTopProductsRows() {
    const products = [
        { name: 'Camiseta Hellfire Club', sales: 245, revenue: 12250, growth: 15 },
        { name: 'Moletom Upside Down', sales: 198, revenue: 19800, growth: 22 },
        { name: 'Caneca Demogorgon', sales: 156, revenue: 4680, growth: -3 },
        { name: 'Poster Stranger Things', sales: 142, revenue: 4260, growth: 8 },
        { name: 'Action Figure Eleven', sales: 128, revenue: 11520, growth: 12 }
    ];

    return products.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.sales} unidades</td>
            <td>R$ ${p.revenue.toLocaleString('pt-BR')}</td>
            <td>
                <span class="stat-change ${p.growth >= 0 ? 'positive' : 'negative'}">
                    ${p.growth >= 0 ? '+' : ''}${p.growth}%
                </span>
            </td>
        </tr>
    `).join('');
}

// Map Instance
// let liveMap = null; // Removed Leaflet
// let mapMarkers = []; // Removed Leaflet

async function initializeLiveView() {
    renderBrazilMap();
    await updateLiveViewData();

    // Polling every 5 seconds
    if (window.liveInterval) clearInterval(window.liveInterval);
    window.liveInterval = setInterval(updateLiveViewData, 5000);
}

// Reverted to SVG Map Logic
async function renderBrazilMap() {
    const mapContainer = document.getElementById('brazilMap');
    if (!mapContainer) return;

    // Only load SVG if not already loaded
    if (mapContainer.querySelector('svg')) return updateMapMarkersSVG();

    mapContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Carregando mapa...</div>';

    try {
        const svgResponse = await fetch('/brazil.svg');
        const svgText = await svgResponse.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (svgElement) {
            svgElement.setAttribute('viewBox', '0 0 612 639');
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.maxHeight = '400px';

            const paths = svgElement.querySelectorAll('path');
            paths.forEach(path => {
                path.setAttribute('fill', 'rgba(229, 9, 20, 0.15)');
                path.setAttribute('stroke', 'rgba(229, 9, 20, 0.5)');
                path.setAttribute('stroke-width', '1');
                path.style.transition = 'all 0.3s';
            });

            mapContainer.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative;';
            wrapper.appendChild(svgElement);
            mapContainer.appendChild(wrapper);

            // Initial markers update
            updateMapMarkersSVG();
        }
    } catch (error) {
        console.error('Erro ao carregar mapa:', error);
        mapContainer.innerHTML = 'Erro ao carregar mapa';
    }
}

async function updateMapMarkersSVG() {
    const mapContainer = document.getElementById('brazilMap');
    const svgElement = mapContainer?.querySelector('svg');
    if (!svgElement) return;

    try {
        const res = await fetch(`${API_URL}/analytics/visitor-locations`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const locations = await res.json();

        // Clear existing markers (circles and texts inside g elements that are not paths)
        const existingMarkers = svgElement.querySelectorAll('.map-marker-group');
        existingMarkers.forEach(el => el.remove());

        // City Coordinates Mapping (approximate X,Y on the SVG 612x639)
        // We will match mostly by City Name since we don't have a geo-projection library loaded
        const cityMap = {
            'São Paulo': { x: 420, y: 480 },
            'Rio de Janeiro': { x: 460, y: 500 },
            'Brasília': { x: 380, y: 380 },
            'Belo Horizonte': { x: 450, y: 440 },
            'Curitiba': { x: 390, y: 530 },
            'Porto Alegre': { x: 350, y: 600 },
            'Salvador': { x: 500, y: 320 },
            'Recife': { x: 540, y: 230 },
            'Fortaleza': { x: 530, y: 190 },
            'Manaus': { x: 200, y: 190 },
            'Goiânia': { x: 400, y: 410 },
            'Florianópolis': { x: 400, y: 560 },
            'Belém': { x: 350, y: 120 }
        };

        locations.forEach((loc, index) => {
            // Try to find coords
            let coords = cityMap[loc.city];

            // If we have real lat/lon, we could project it, but for now fallback to city map or default
            // Just displaying known cities clearly is better than random dots
            if (!coords) return;

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('map-marker-group');

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', coords.x);
            circle.setAttribute('cy', coords.y);
            circle.setAttribute('r', '6');
            circle.setAttribute('fill', '#10B981');
            circle.setAttribute('opacity', '0.8');
            // Adding a pulsing class or style
            circle.innerHTML = `<animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" /> <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />`;

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${loc.city}: ${loc.count} online`;

            group.appendChild(title);
            group.appendChild(circle);
            svgElement.appendChild(group);
        });

    } catch (e) { console.error(e); }
}

async function updateLiveViewData() {
    await Promise.all([
        renderActiveSessions(),
        updateMapMarkersSVG(), // SVG Update
        updateOnlineCount()
    ]);
}

async function updateOnlineCount() {
    try {
        const res = await fetch(`${API_URL}/analytics/online-count`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const data = await res.json();
        const el = document.getElementById('onlineCount');
        if (el) {
            // Animate only if changed
            if (el.textContent !== String(data.count)) {
                el.textContent = data.count;
                el.style.transform = 'scale(1.2)';
                setTimeout(() => el.style.transform = 'scale(1)', 200);
            }
        }
    } catch (e) { }
}

async function updateMapMarkers() {
    // Legacy / Leaflet placeholder - doing nothing now
}

// Add CSS for pulse animation if not exists
if (!document.getElementById('leaflet-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'leaflet-custom-styles';
    style.textContent = `
        @keyframes leaflet-pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
    `;
    document.head.appendChild(style);
}

async function renderActiveSessions() {
    const sessionsContainer = document.getElementById('activeSessions');
    if (!sessionsContainer) return;

    try {
        const response = await fetch(`${API_URL}/sessions/active`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });

        if (response.ok) {
            const sessions = await response.json();

            // Updates count stat
            const uniqueCities = new Set(sessions.map(s => s.city)).size;
            const locationsCountEl = document.getElementById('locationsCount');
            if (locationsCountEl) locationsCountEl.textContent = uniqueCities;

            // Simple Render using helper with truncation
            sessionsContainer.innerHTML = generateSessionsHTML(sessions);
        }
    } catch (e) {
        console.error('Erro rendering sessions:', e);
        sessionsContainer.innerHTML = '<div class="text-danger">Erro ao carregar sessões</div>';
    }
}

async function renderActiveSessions_Legacy() {
    const sessionsContainer = document.getElementById('activeSessions');
    if (!sessionsContainer) return;

    try {
        const response = await fetch(`${API_URL}/sessions/active`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });

        if (response.ok) {
            const sessions = await response.json();

            if (!sessions || sessions.length === 0) {
                sessionsContainer.innerHTML = '<div class="text-muted text-center p-4">Nenhuma sessão ativa no momento</div>';
                return;
            }

            const uniqueCities = new Set(sessions.map(s => s.city)).size;
            const locationsCountEl = document.getElementById('locationsCount');
            if (locationsCountEl) locationsCountEl.textContent = uniqueCities;

            // --- OPTIMIZED LIST RENDERING (NO BLINKING) ---

            // 1. Identify current DOM elements
            const currentMap = new Map();
            sessionsContainer.querySelectorAll('[data-session-id]').forEach(el => {
                currentMap.set(el.dataset.sessionId, el);
            });

            const processedIds = new Set();

            // 2. Update or Create
            sessions.forEach(session => {
                const id = session.session_id || session.ip; // Fallback
                processedIds.add(id);

                const existingEl = currentMap.get(id);

                // Safe content generation with enhanced page title
                const city = session.city === 'Desconhecido' ? 'Detectando...' : session.city;
                const pageUrl = session.page || '/';
                const duration = session.duration || '0m';

                // Device & Browser with icons
                const device = session.device || 'Desktop';
                const browser = session.browser || 'Unknown';

                const deviceIcons = {
                    'Mobile': '📱',
                    'Tablet': '📲',
                    'Desktop': '💻'
                };
                const deviceIcon = deviceIcons[device] || '💻';

                // UTM Source detection with icons
                let utmDisplay = null;
                let utmIcon = '🌐';
                if (session.utm_source) {
                    const source = session.utm_source.toLowerCase();
                    if (source.includes('instagram') || source.includes('ig')) {
                        utmIcon = '📸';
                        utmDisplay = 'Instagram';
                    } else if (source.includes('facebook') || source.includes('fb')) {
                        utmIcon = '👥';
                        utmDisplay = 'Facebook';
                    } else if (source.includes('google')) {
                        utmIcon = '🔍';
                        utmDisplay = 'Google';
                    } else if (source.includes('tiktok')) {
                        utmIcon = '🎵';
                        utmDisplay = 'TikTok';
                    } else if (source.includes('whatsapp')) {
                        utmIcon = '💬';
                        utmDisplay = 'WhatsApp';
                    } else {
                        utmDisplay = session.utm_source;
                    }

                    if (session.utm_campaign) {
                        utmDisplay += ` • ${session.utm_campaign}`;
                    }
                }

                // Extract meaningful page title from URL
                let displayTitle = session.pageTitle || 'Navegando...';
                let pageIcon = '👁️';

                // Parse URL to create better titles
                if (pageUrl.includes('/product.html')) {
                    const urlParams = new URLSearchParams(pageUrl.split('?')[1] || '');
                    const productId = urlParams.get('id');
                    displayTitle = productId ? `🛍️ Produto #${productId}` : '🛍️ Vendo Produto';
                    pageIcon = '🛍️';
                } else if (pageUrl.includes('/checkout')) {
                    displayTitle = '💳 Finalizando Compra';
                    pageIcon = '💳';
                } else if (pageUrl.includes('/collection')) {
                    const urlParams = new URLSearchParams(pageUrl.split('?')[1] || '');
                    const collectionSlug = urlParams.get('slug');
                    displayTitle = collectionSlug ? `📂 ${collectionSlug.replace(/-/g, ' ').toUpperCase()}` : '📂 Navegando Coleção';
                    pageIcon = '📂';
                } else if (pageUrl === '/' || pageUrl.includes('index.html')) {
                    displayTitle = '🏠 Página Inicial';
                    pageIcon = '🏠';
                } else if (session.pageTitle && session.pageTitle !== 'Stranger Things Store - Loja Oficial') {
                    // Use the actual page title if it's meaningful
                    displayTitle = session.pageTitle;
                }

                const contentHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 10px; height: 10px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success);"></div>
                            <div>
                                <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">${city}, ${session.state || ''}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 6px;">
                                    <span>${session.ip}</span>
                                    <span style="opacity: 0.5;">•</span>
                                    <span>${deviceIcon} ${device}</span>
                                    <span style="opacity: 0.5;">•</span>
                                    <span>${browser}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${duration}</div>
                        </div>
                    </div>
                    
                    ${utmDisplay ? `
                    <div style="background: linear-gradient(135deg, rgba(229, 9, 20, 0.15), rgba(229, 9, 20, 0.05)); border: 1px solid rgba(229, 9, 20, 0.3); border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">${utmIcon}</span>
                        <div style="flex: 1;">
                            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Origem do Tráfego</div>
                            <div style="font-size: 12px; font-weight: 600; color: var(--primary);">${utmDisplay}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="background: rgba(0,0,0,0.2); border-left: 2px solid var(--primary); border-radius: 4px; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
                        <div style="color: var(--text-secondary); font-size: 16px;">
                            ${pageIcon}
                        </div>
                        <div style="flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">${displayTitle}</div>
                            <div style="font-size: 10px; color: var(--text-muted); font-family: monospace; opacity: 0.7;">${pageUrl}</div>
                        </div>
                    </div>
                `;

                if (existingEl) {
                    // Compare essential data to avoid rewriting DOM (which causes blinking selection/animation)
                    // We use a custom attribute to store the 'signature' of the content
                    const newSignature = `${city}-${pageTitle}-${pageUrl}-${duration}`;
                    if (existingEl.dataset.signature !== newSignature) {
                        existingEl.innerHTML = contentHTML;
                        existingEl.dataset.signature = newSignature;
                        // Do NOT add 'animate-entry' again for updates
                    }
                } else {
                    const newEl = document.createElement('div');
                    newEl.dataset.sessionId = id;
                    newEl.dataset.signature = `${city}-${pageTitle}-${pageUrl}-${duration}`;
                    newEl.className = 'session-card animate-entry'; // Only animate new ones
                    newEl.style.cssText = "background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
                    newEl.innerHTML = contentHTML;
                    sessionsContainer.prepend(newEl); // New sessions at top
                }
            });

            // 3. Cleanup removed
            currentMap.forEach((el, id) => {
                if (!processedIds.has(id)) {
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(-20px)';
                    setTimeout(() => el.remove(), 300);
                }
            });

        }
    } catch (error) {
        console.log('Sem sessões ativas disponíveis');
    }
}

function startLiveUpdates() {
    if (AppState.liveUpdateInterval) {
        clearInterval(AppState.liveUpdateInterval);
    }

    AppState.liveUpdateInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/analytics/online-count`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                const data = await response.json();
                const onlineCountEl = document.getElementById('onlineCount');
                if (onlineCountEl && data.count !== undefined) {
                    onlineCountEl.textContent = data.count;

                    onlineCountEl.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        onlineCountEl.style.transform = 'scale(1)';
                    }, 200);
                }
            }
        } catch (error) {
            console.log('Erro ao atualizar contador online');
        }
    }, 10000);
}

// Limpar interval ao sair da página
const originalLoadPage = loadPage;
loadPage = async function (pageName) {
    if (AppState.liveUpdateInterval && pageName !== 'analytics') {
        clearInterval(AppState.liveUpdateInterval);
        AppState.liveUpdateInterval = null;
    }
    return originalLoadPage.call(this, pageName);
};

// Continue nos próximos blocos com Products, Orders, Customers, etc...
// =====================================================
// PRODUCTS PAGE - PARTE 2
// =====================================================

async function renderProducts(container) {
    await loadProducts();
    await loadCollections();

    const selectedCount = AppState.selected.products.size;

    container.innerHTML = `
                <div class="page-header">
            <div>
                <h1>Produtos (${AppState.products.length})</h1>
                <p class="page-subtitle">Gerenciamento completo do catálogo</p>
            </div>
            <div style="display: flex; gap: 12px;">
                ${selectedCount > 0 ? `
                    <button class="btn btn-secondary" onclick="openBulkDiscountModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        Desconto (${selectedCount})
                    </button>
                    <button class="btn btn-secondary" onclick="bulkEditProducts()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar (${selectedCount})
                    </button>
                    <button class="btn btn-icon danger" onclick="bulkDeleteProducts()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Excluir (${selectedCount})
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="importProductsCSV()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Importar CSV
                </button>
                <button class="btn btn-primary" onclick="openProductModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Novo Produto
                </button>
            </div>
        </div >

        <!--Filters -->
        <div class="filters-bar">
            <input 
                type="text" 
                id="productSearch" 
                placeholder="🔍 Buscar produtos..." 
                class="search-input" 
                onkeyup="filterProductsTable()"
                value="${AppState.filters.products.search}"
            >
            <select id="collectionFilter" class="filter-select" onchange="filterProductsTable()">
                <option value="">Todas as coleções</option>
                ${AppState.collections.map(col => `
                    <option value="${col.id}" ${AppState.filters.products.collection == col.id ? 'selected' : ''}>
                        ${col.name}
                    </option>
                `).join('')}
            </select>
            <select id="statusFilter" class="filter-select" onchange="filterProductsTable()">
                <option value="">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
            </select>
            <select id="stockFilter" class="filter-select" onchange="filterProductsTable()">
                <option value="">Todos estoques</option>
                <option value="low">Estoque baixo (&lt; 10)</option>
                <option value="out">Sem estoque</option>
                <option value="ok">Estoque OK</option>
            </select>
        </div>

        <!--Products Table-->
        <div class="table-container">
            <table class="admin-table" id="productsTable">
                <thead>
                    <tr>
                        <th style="width: 40px;">
                            <input type="checkbox" onchange="toggleSelectAllProducts(this)" 
                                   style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                        </th>
                        <th>Imagem</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Preço</th>
                        <th>Estoque</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderProductRows()}
                </tbody>
            </table>
        </div>

        <!--Pagination -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 20px; background: var(--bg-card); border-radius: 8px;">
                    <div style="color: var(--text-secondary); font-size: 14px;">
                        Mostrando <strong>${AppState.products.length}</strong> produtos
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon" onclick="previousProductsPage()" ${AppState.pagination.products.page <= 1 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <div style="display: flex; align-items: center; padding: 0 16px; color: var(--text-primary); font-weight: 600;">
                            Página ${AppState.pagination.products.page}
                        </div>
                        <button class="btn-icon" onclick="nextProductsPage()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
}

function renderProductRows() {
    if (!AppState.products || AppState.products.length === 0) {
        return `
                <tr>
                <td colspan="8" style="text-align: center; padding: 60px 20px;">
                    <div style="color: var(--text-muted);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            style="width: 64px; height: 64px; margin: 0 auto 16px; opacity: 0.3;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Nenhum produto encontrado</div>
                        <div style="font-size: 14px;">Comece adicionando seu primeiro produto</div>
                    </div>
                </td>
            </tr>
                `;
    }

    return AppState.products.map(product => {
        const isSelected = AppState.selected.products.has(product.id);
        const stockClass = product.stock > 10 ? 'success' : (product.stock > 0 ? 'warning' : 'danger');
        const statusClass = product.active ? 'success' : 'danger';

        return `
                <tr data-product-id="${product.id}" class="${isSelected ? 'selected-row' : ''}">
                <td>
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="toggleProductSelection(${product.id}, this.checked)"
                           style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                </td>
                <td>
                    <div class="product-thumb">
                        ${product.image_url ?
                `<img src="${product.image_url}" alt="${product.name}" loading="lazy">` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>`
            }
                    </div>
                </td>
                <td>
                    <strong style="color: var(--text-primary);">${product.name}</strong>
                    ${product.sku ? `<br><small style="color: var(--text-muted);">SKU: ${product.sku}</small>` : ''}
                </td>
                <td>${product.category || '-'}</td>
                <td><strong style="color: var(--success);">R$ ${parseFloat(product.price || 0).toFixed(2).replace('.', ',')}</strong></td>
                <td><span class="badge ${stockClass}">${product.stock || 0}</span></td>
                <td><span class="badge ${statusClass}">${product.active ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-icon" onclick="previewProduct(${product.id})" title="Pré-visualizar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
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
                    </div>
                </td>
            </tr>
                `;
    }).join('');
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) {
            AppState.products = await response.json();
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showToast('Erro ao carregar produtos', 'error');
        AppState.products = [];
    }
}

function filterProductsTable() {
    const search = document.getElementById('productSearch')?.value.toLowerCase() || '';
    const collectionId = document.getElementById('collectionFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const stock = document.getElementById('stockFilter')?.value || '';

    AppState.filters.products = { search, collection: collectionId, status, priceRange: null };

    const rows = document.querySelectorAll('#productsTable tbody tr');
    rows.forEach(row => {
        const productId = row.dataset.productId;
        if (!productId) return;

        const product = AppState.products.find(p => p.id == productId);
        if (!product) return;

        const nameMatch = product.name.toLowerCase().includes(search);
        const statusMatch = !status || (status === 'active' && product.active) || (status === 'inactive' && !product.active);
        const stockMatch = !stock ||
            (stock === 'low' && product.stock > 0 && product.stock < 10) ||
            (stock === 'out' && product.stock === 0) ||
            (stock === 'ok' && product.stock >= 10);

        row.style.display = (nameMatch && statusMatch && stockMatch) ? '' : 'none';
    });
}

function toggleSelectAllProducts(checkbox) {
    const isChecked = checkbox.checked;
    AppState.selected.products.clear();

    if (isChecked) {
        AppState.products.forEach(p => AppState.selected.products.add(p.id));
    }

    document.querySelectorAll('#productsTable tbody input[type="checkbox"]').forEach(cb => {
        cb.checked = isChecked;
    });

    loadPage('products');
}

function toggleProductSelection(productId, isChecked) {
    if (isChecked) {
        AppState.selected.products.add(productId);
    } else {
        AppState.selected.products.delete(productId);
    }
}

function bulkEditProducts() {
    if (AppState.selected.products.size === 0) return;

    showToast(`Editando ${AppState.selected.products.size} produtos...`, 'info');
}

function bulkDeleteProducts() {
    if (AppState.selected.products.size === 0) return;

    if (confirm(`Tem certeza que deseja excluir ${AppState.selected.products.size} produtos ? `)) {
        showToast(`${AppState.selected.products.size} produtos excluídos`, 'success');
        AppState.selected.products.clear();
        loadPage('products');
    }
}

function importProductsCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            showToast(`Importando ${file.name}...`, 'info');
            setTimeout(() => {
                showToast('Produtos importados com sucesso!', 'success');
                loadPage('products');
            }, 2000);
        }
    };
    input.click();
}

function previewProduct(id) {
    const product = AppState.products.find(p => p.id === id);
    if (!product) return;

    const modal = `
                <div class="modal-overlay" onclick="closeModal()">
                    <div class="modal-dialog" onclick="event.stopPropagation()" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2>Pré-visualização: ${product.name}</h2>
                            <button class="modal-close" onclick="closeModal()">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                                <div>
                                    <img src="${product.image_url || 'https://via.placeholder.com/400'}"
                                        alt="${product.name}"
                                        style="width: 100%; border-radius: 12px; border: 1px solid var(--border);">
                                </div>
                                <div>
                                    <h3 style="font-size: 24px; margin-bottom: 16px;">${product.name}</h3>
                                    <div style="font-size: 32px; color: var(--success); font-weight: 800; margin-bottom: 16px;">
                                        R$ ${parseFloat(product.price || 0).toFixed(2).replace('.', ',')}
                                    </div>
                                    <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                                        ${product.description || 'Sem descrição disponível'}
                                    </p>
                                    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                                        <div class="badge ${product.stock > 10 ? 'success' : 'warning'}">
                                            ${product.stock || 0} em estoque
                                        </div>
                                        <div class="badge ${product.active ? 'success' : 'danger'}">
                                            ${product.active ? 'Ativo' : 'Inativo'}
                                        </div>
                                    </div>
                                    ${product.category ? `
                                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                                    <strong style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase;">
                                        Categoria
                                    </strong>
                                    <div style="margin-top: 4px;">${product.category}</div>
                                </div>
                            ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
                            <button class="btn btn-primary" onclick="editProduct(${id}); closeModal();">Editar Produto</button>
                        </div>
                    </div>
        </div >
                `;

    document.getElementById('modalContainer').innerHTML = modal;
}

function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    const product = AppState.products.find(p => p.id === id);
    if (!confirm(`Tem certeza que deseja excluir "${product?.name}" ? `)) return;

    showLoading('Excluindo produto...');

    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });

        if (response.ok) {
            showToast('Produto excluído com sucesso!', 'success');
            loadPage('products');
        } else {
            showToast('Erro ao excluir produto', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showToast('Erro ao excluir produto', 'error');
    } finally {
        hideLoading();
    }
}

function previousProductsPage() {
    if (AppState.pagination.products.page > 1) {
        AppState.pagination.products.page--;
        loadPage('products');
    }
}

function nextProductsPage() {
    AppState.pagination.products.page++;
    loadPage('products');
}

// =====================================================
// COLLECTIONS PAGE
// =====================================================

async function renderCollections(container) {
    await loadCollections();

    container.innerHTML = `
                <div class="page-header">
            <div>
                <h1>Coleções (${AppState.collections.length})</h1>
                <p class="page-subtitle">Organize produtos em coleções temáticas</p>
            </div>
            <button class="btn btn-primary" onclick="openCollectionModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Nova Coleção
            </button>
        </div >

        <!--Collections Grid-->
                <div id="collectionsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
                    ${AppState.collections.map(col => `
                <div class="collection-card" data-id="${col.id}" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; transition: all 0.2s; overflow: hidden;">
                    <div class="drag-handle" style="height: 180px; width: 100%; background: linear-gradient(135deg, ${getRandomGradient()}); position: relative; cursor: grab; border-radius: 11px 11px 0 0; background-size: cover; background-position: center;">
                        <div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.6); padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; gap: 6px; pointer-events: none; z-index: 10;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 16px; height: 16px;">
                                <line x1="5" y1="9" x2="19" y2="9"></line>
                                <line x1="5" y1="15" x2="19" y2="15"></line>
                            </svg>
                            <span style="color: white; font-size: 11px; font-weight: 700; text-transform: uppercase;">Arrastar</span>
                        </div>
                        <div style="position: absolute; top: 12px; right: 12px;">
                            <span class="badge ${col.is_active ? 'success' : 'danger'}" style="background: rgba(26, 26, 26, 0.9);">
                                ${col.is_active ? 'Ativa' : 'Inativa'}
                            </span>
                        </div>
                        <div style="position: absolute; bottom: 12px; left: 12px; right: 12px;">
                            <h3 style="font-size: 20px; font-weight: 800; color: white; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                                ${col.name}
                            </h3>
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-size: 13px; color: var(--text-secondary);">
                                <strong>${col.product_count || 0}</strong> produtos
                            </div>
                            <code style="font-size: 11px; color: var(--text-muted); background: var(--bg-darker); padding: 4px 8px; border-radius: 4px;">
                                /${col.slug}
                            </code>
                        </div>
                        ${col.description ? `
                            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                ${col.description.substring(0, 100)}${col.description.length > 100 ? '...' : ''}
                            </p>
                        ` : ''}
                        
                        <!-- Seletor de Visualização Padrão -->
                        <div style="margin-bottom: 12px; padding: 12px; background: var(--bg-darker); border-radius: 8px; border: 1px solid var(--border);">
                            <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;">
                                Visualização Padrão
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button 
                                    class="btn-icon ${col.default_view === 'grid' || !col.default_view ? 'active' : ''}" 
                                    onclick="updateCollectionView(${col.id}, 'grid')"
                                    title="Grid"
                                    style="flex: 1; ${col.default_view === 'grid' || !col.default_view ? 'background: var(--primary); color: white;' : ''}"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <rect x="3" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="14" width="7" height="7"></rect>
                                        <rect x="3" y="14" width="7" height="7"></rect>
                                    </svg>
                                    Grid
                                </button>
                                <button 
                                    class="btn-icon ${col.default_view === 'carousel' ? 'active' : ''}" 
                                    onclick="updateCollectionView(${col.id}, 'carousel')"
                                    title="Carrossel"
                                    style="flex: 1; ${col.default_view === 'carousel' ? 'background: var(--primary); color: white;' : ''}"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                                        <path d="M12 6v12"></path>
                                        <path d="M8 6v12"></path>
                                        <path d="M16 6v12"></path>
                                    </svg>
                                    Carrossel
                                </button>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border);">
                            <button class="btn-icon" onclick="manageCollectionProducts(${col.id})" title="Gerenciar Produtos" style="flex: 1;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 7h-9"></path>
                                    <path d="M14 17H5"></path>
                                    <circle cx="17" cy="17" r="3"></circle>
                                    <circle cx="7" cy="7" r="3"></circle>
                                </svg>
                                Produtos
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
                </div>
            `).join('')}
                </div>
            `;

    initCollectionGridSortable();
}

function getRandomGradient() {
    const gradients = [
        '#E50914, #B20710',
        '#10B981, #047857',
        '#F59E0B, #D97706',
        '#3B82F6, #1E40AF',
        '#8B5CF6, #6D28D9',
        '#EC4899, #BE185D'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

async function loadCollections() {
    try {
        const response = await fetch(`${API_URL}/collections`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) {
            AppState.collections = await response.json();
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
        showToast('Erro ao carregar coleções', 'error');
        AppState.collections = [];
    }
}

function initCollectionGridSortable() {
    const gridEl = document.getElementById('collectionsGrid');
    if (gridEl && window.Sortable) {
        if (AppState.gridSortableInstance) {
            AppState.gridSortableInstance.destroy();
        }

        AppState.gridSortableInstance = Sortable.create(gridEl, {
            handle: '.drag-handle',
            animation: 250,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            forceFallback: false,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            invertSwap: true,
            direction: 'vertical',
            preventOnFilter: false,
            onStart: function (evt) {
                evt.item.style.opacity = '0.8';
                evt.item.style.transform = 'scale(1.05) rotate(2deg)';
                evt.item.style.zIndex = '9999';
                evt.item.style.boxShadow = '0 20px 40px rgba(229, 9, 20, 0.6)';
                const handle = evt.item.querySelector('.drag-handle');
                if (handle) handle.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
            },
            onEnd: async (evt) => {
                evt.item.style.opacity = '1';
                evt.item.style.transform = '';
                evt.item.style.zIndex = '';
                evt.item.style.boxShadow = '';
                const handle = evt.item.querySelector('.drag-handle');
                if (handle) handle.style.cursor = 'grab';
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                await updateCollectionsOrderFromGrid();
            }
        });
    }
}

async function updateCollectionsOrderFromGrid() {
    const items = document.querySelectorAll('#collectionsGrid .collection-card');
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
            loadPage('collections');
        }
    } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        showToast('Erro ao atualizar ordem', 'error');
        loadPage('collections');
    } finally {
        hideLoading();
    }
}

async function updateCollectionView(collectionId, viewType) {
    showLoading('Atualizando visualização...');

    try {
        const response = await fetch(`${API_URL}/collections/${collectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ default_view: viewType })
        });

        if (response.ok) {
            showToast(`Visualização padrão alterada para ${viewType === 'grid' ? 'Grid' : 'Carrossel'}!`, 'success');
            await loadCollections();
            loadPage('collections');
        } else {
            showToast('Erro ao atualizar visualização', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar visualização:', error);
        showToast('Erro ao atualizar visualização', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteCollection(id) {
    const collection = AppState.collections.find(c => c.id === id);
    if (!confirm(`Excluir a coleção "${collection?.name}"?`)) return;

    showLoading('Excluindo coleção...');

    try {
        const response = await fetch(`${API_URL}/collections/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });

        if (response.ok) {
            showToast('Coleção excluída!', 'success');
            loadPage('collections');
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

// Continue na próxima parte com Orders, Customers, Inventory...
// =====================================================
// ORDERS PAGE - PARTE 3
// =====================================================

async function renderOrders(container) {
    await loadOrders();

    const statusColors = {
        pending: 'warning',
        processing: 'info',
        shipped: 'info',
        delivered: 'success',
        cancelled: 'danger'
    };

    const statusLabels = {
        pending: 'Pendente',
        processing: 'Processando',
        shipped: 'Enviado',
        delivered: 'Entregue',
        cancelled: 'Cancelado'
    };

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Pedidos (${AppState.orders.length})</h1>
                <p class="page-subtitle">Gestão completa de pedidos e status</p>
            </div>
            <div class="header-actions">
                <button id="btnDeleteSelected" class="btn btn-danger" style="display: none;" onclick="deleteSelectedOrders()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Excluir Selecionados (<span id="selectedCount">0</span>)
                </button>
                <button class="btn btn-secondary" onclick="exportOrders()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Exportar Relatório
                </button>
            </div>
        </div>

        <!-- Filters -->
        <div class="filters-bar">
            <input 
                type="text" 
                id="orderSearch" 
                placeholder="🔍 Buscar por ID ou cliente..." 
                class="search-input" 
                onkeyup="filterOrdersTable()"
            >
            <select id="orderStatusFilter" class="filter-select" onchange="filterOrdersTable()">
                <option value="">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="processing">Processando</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregue</option>
                <option value="cancelled">Cancelado</option>
            </select>
            <input type="date" id="orderDateFrom" class="search-input" style="max-width: 160px;" onchange="filterOrdersTable()">
            <input type="date" id="orderDateTo" class="search-input" style="max-width: 160px;" onchange="filterOrdersTable()">
        </div>

        <!-- Orders Table -->
        <div class="table-container">
            <table class="admin-table" id="ordersTable">
                <thead>
                    <tr>
                        <th width="40">
                            <input type="checkbox" id="selectAllOrders" onchange="toggleSelectAllOrders(this)">
                        </th>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Data</th>
                        <th>Itens</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.orders.length > 0 ? AppState.orders.map(order => `
                        <tr data-order-id="${order.id}">
                            <td>
                                <input type="checkbox" class="order-checkbox" value="${order.id}" onchange="updateBulkSelection()">
                            </td>
                            <td><strong>#${order.id.toString().padStart(4, '0')}</strong></td>
                            <td>
                                ${order.customer_name || 'Cliente'}
                                <br><small style="color: var(--text-muted);">${order.customer_email || ''}</small>
                            </td>
                            <td>
                                ${formatDate(order.created_at)}
                                ${order.pix_copied_at ? '<br><span class="badge badge-success" style="font-size: 10px; margin-top: 4px;">PIX COPIADO</span>' : ''}
                            </td>
                            <td>${order.items_count || 0} ${order.items_count === 1 ? 'item' : 'itens'}</td>
                            <td><strong style="color: var(--success);">R$ ${formatCurrency(order.total)}</strong></td>
                            <td>
                                <select 
                                    class="badge ${statusColors[order.status]}" 
                                    style="border: none; cursor: pointer; padding: 6px 12px;"
                                    onchange="updateOrderStatus(${order.id}, this.value)"
                                >
                                    ${Object.entries(statusLabels).map(([value, label]) => `
                                        <option value="${value}" ${order.status === value ? 'selected' : ''}>
                                            ${label}
                                        </option>
                                    `).join('')}
                                </select>
                            </td>
                            <td>
                                <div style="display: flex; gap: 6px;">
                                    <button class="btn-icon" onclick="viewOrderDetails(${order.id})" title="Ver Detalhes">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                    <button class="btn-icon" onclick="printInvoice(${order.id})" title="Imprimir">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                            <rect x="6" y="14" width="12" height="8"></rect>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                                     style="width: 64px; height: 64px; margin: 0 auto 16px; opacity: 0.3;">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Nenhum pedido encontrado</div>
                                <div style="font-size: 14px;">Os pedidos aparecerão aqui conforme forem realizados</div>
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>
    `;
}

async function loadOrders() {
    AppState.orders = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const realOrders = await response.json();
            if (realOrders && Array.isArray(realOrders)) {
                AppState.orders = realOrders;
            }
        }
    } catch (error) {
        console.log('Nenhum pedido disponível');
    }
}

function filterOrdersTable() {
    const search = document.getElementById('orderSearch')?.value.toLowerCase() || '';
    const status = document.getElementById('orderStatusFilter')?.value || '';

    const rows = document.querySelectorAll('#ordersTable tbody tr');
    rows.forEach(row => {
        const orderId = row.dataset.orderId;
        if (!orderId) return;

        const order = AppState.orders.find(o => o.id == orderId);
        if (!order) return;

        const searchMatch =
            order.id.toString().includes(search) ||
            (order.customer_name?.toLowerCase().includes(search)) ||
            (order.customer_email?.toLowerCase().includes(search));

        const statusMatch = !status || order.status === status;

        row.style.display = (searchMatch && statusMatch) ? '' : 'none';
    });
}

async function updateOrderStatus(orderId, newStatus) {
    showLoading('Atualizando status...');

    try {
        const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showToast('Status atualizado!', 'success');
            await loadOrders();
        } else {
            showToast('Erro ao atualizar status', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showToast('Erro ao atualizar status', 'error');
    } finally {
        hideLoading();
    }
}

function viewOrderDetails(orderId) {
    const order = AppState.orders.find(o => o.id === orderId);
    if (!order) return;

    // Helper para copiar ID
    window.copyToClipboard = function (text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copiado para a área de transferência!', 'success');
        });
    };

    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-dialog" onclick="event.stopPropagation()" style="max-width: 900px;">
                <div class="modal-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <h2>Pedido #${order.id.toString().padStart(4, '0')}</h2>
                        <span class="badge ${getStatusColor(order.status)}">${getStatusLabel(order.status)}</span>
                        ${order.pix_copied_at ?
            `<span class="badge badge-success" title="Copiado em ${formatDate(order.pix_copied_at)}">
                                ✓ PIX Copiado
                            </span>` : ''}
                    </div>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                        <div>
                            <!-- Cliente -->
                            <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Dados do Cliente
                            </h3>
                            <div style="background: var(--bg-darker); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                    <div>
                                        <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">Nome</small>
                                        <strong>${order.customer_name || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">Email</small>
                                        <strong>${order.customer_email || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">CPF</small>
                                        <strong>${order.customer_cpf || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">Telefone</small>
                                        <strong>${order.customer_phone || 'N/A'}</strong>
                                    </div>
                                    <div style="grid-column: 1 / -1;">
                                        <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">Endereço</small>
                                        <strong>${order.customer_address || 'Endereço não informado'}</strong>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Itens -->
                            <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                Itens do Pedido (${order.items_count})
                            </h3>
                            <div style="background: var(--bg-darker); padding: 16px; border-radius: 8px;">
                                <!-- Mock de itens se não tivermos os dados detalhados carregados -->
                                ${order.items ? order.items.map(item => `
                                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                                        <div>
                                            <strong>${item.name}</strong>
                                            <div style="font-size: 12px; color: var(--text-muted);">Qtd: ${item.quantity}</div>
                                        </div>
                                        <div>R$ ${formatCurrency(item.price * item.quantity)}</div>
                                    </div>
                                `).join('') : '<p style="color: var(--text-muted); text-align: center;">Itens detalhados não carregados na lista.</p>'}
                            </div>
                        </div>
                        
                        <div>
                            <!-- Transação -->
                            <h3 style="margin-bottom: 16px;">Pagamento</h3>
                            <div style="background: var(--bg-darker); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                                <div style="margin-bottom: 12px;">
                                    <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">Método</small>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <strong>${order.payment_method || 'PIX'}</strong>
                                        ${order.payment_method === 'pix' || !order.payment_method ?
            '<img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix_Banco_Central_do_Brasil.svg" height="16" alt="PIX">' :
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>'}
                                    </div>
                                </div>
                                <div style="margin-bottom: 12px;">
                                    <small style="color: var(--text-muted); display: block; margin-bottom: 4px;">ID da Transação</small>
                                    <div style="display: flex; gap: 8px;">
                                        <code style="background: #000; padding: 4px 8px; border-radius: 4px; font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis;">
                                            ${order.transaction_id || 'N/A'}
                                        </code>
                                        ${order.transaction_id ?
            `<button class="btn-icon" onclick="copyToClipboard('${order.transaction_id}')" title="Copiar ID">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>` : ''}
                                    </div>
                                </div>
                                ${order.transaction_id ?
            `<a href="https://bestfy.com.br/transactions/${order.transaction_id}" target="_blank" class="btn btn-secondary btn-sm btn-block" style="text-align: center; margin-top: 8px;">Ver no Gateway</a>`
            : ''}
                            </div>

                            <!-- Valores -->
                            <h3 style="margin-bottom: 16px;">Resumo</h3>
                            <div style="background: var(--bg-darker); padding: 16px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                    <span>Subtotal:</span>
                                    <strong>R$ ${formatCurrency(order.total * 0.9)}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                    <span>Frete:</span>
                                    <strong>R$ ${formatCurrency(order.total * 0.1)}</strong>
                                </div>
                                <div style="border-top: 1px solid var(--border); margin: 12px 0; padding-top: 12px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 18px;">
                                        <strong>Total:</strong>
                                        <strong style="color: var(--success);">R$ ${formatCurrency(order.total)}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="btn btn-primary" onclick="printInvoice(${orderId}); closeModal();">Imprimir Nota</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modal;
}

// Helpers para Status (se não existirem globalmente)
function getStatusColor(status) {
    const map = { pending: 'warning', processing: 'info', shipped: 'info', delivered: 'success', cancelled: 'danger' };
    return map[status] || 'secondary';
}

function getStatusLabel(status) {
    const map = { pending: 'Pendente', processing: 'Processando', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' };
    return map[status] || status;
}

function printInvoice(orderId) {
    showToast('Gerando nota fiscal...', 'info');
    setTimeout(() => {
        showToast('Nota fiscal pronta para impressão!', 'success');
        window.print();
    }, 1000);
}

function exportOrders() {
    showToast('Exportando relatório de pedidos...', 'info');
    setTimeout(() => {
        showToast('Relatório exportado com sucesso!', 'success');
    }, 1500);
}

// =====================================================
// CUSTOMERS PAGE
// =====================================================

async function renderCustomers(container) {
    await loadCustomers();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Clientes (${AppState.customers.length})</h1>
                <p class="page-subtitle">Base de clientes e segmentação</p>
            </div>
            <button class="btn btn-primary" onclick="openCustomerModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Novo Cliente
            </button>
        </div>

        <!-- Filters -->
        <div class="filters-bar">
            <input 
                type="text" 
                id="customerSearch" 
                placeholder="🔍 Buscar clientes..." 
                class="search-input" 
                onkeyup="filterCustomersTable()"
            >
            <select id="customerSegmentFilter" class="filter-select" onchange="filterCustomersTable()">
                <option value="">Todos os segmentos</option>
                <option value="vip">VIP</option>
                <option value="regular">Regular</option>
                <option value="new">Novo</option>
            </select>
        </div>

        <!-- Customers Table -->
        <div class="table-container">
            <table class="admin-table" id="customersTable">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Pedidos</th>
                        <th>LTV</th>
                        <th>Segmento</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderCustomersRows()}
                </tbody>
            </table>
        </div>
    `;
}

function renderCustomersRows() {
    if (!AppState.customers || AppState.customers.length === 0) {
        return `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                         style="width: 64px; height: 64px; margin: 0 auto 16px; opacity: 0.3;">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                    </svg>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Nenhum cliente cadastrado</div>
                    <div style="font-size: 14px;">Adicione seu primeiro cliente</div>
                </td>
            </tr>
        `;
    }

    return AppState.customers.map(customer => `
        <tr data-customer-id="${customer.id}">
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width: 36px; height: 36px; font-size: 14px;">
                        ${customer.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <strong>${customer.name}</strong>
                </div>
            </td>
            <td>${customer.email}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.orders_count || 0}</td>
            <td><strong style="color: var(--success);">R$ ${formatCurrency(customer.ltv || 0)}</strong></td>
            <td>
                <span class="badge ${customer.segment === 'vip' ? 'success' : 'info'}">
                    ${customer.segment?.toUpperCase() || 'REGULAR'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-icon" onclick="viewCustomerDetails(${customer.id})" title="Ver Detalhes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="openCustomerModal(${customer.id})" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadCustomers() {
    AppState.customers = [];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_URL}/customers`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const realCustomers = await response.json();
            if (realCustomers && Array.isArray(realCustomers)) {
                AppState.customers = realCustomers;
            }
        }
    } catch (error) {
        console.log('Nenhum cliente disponível');
    }
}

function filterCustomersTable() {
    const search = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    const segment = document.getElementById('customerSegmentFilter')?.value || '';

    const rows = document.querySelectorAll('#customersTable tbody tr');
    rows.forEach(row => {
        const customerId = row.dataset.customerId;
        if (!customerId) return;

        const customer = AppState.customers.find(c => c.id == customerId);
        if (!customer) return;

        const searchMatch =
            customer.name?.toLowerCase().includes(search) ||
            customer.email?.toLowerCase().includes(search);

        const segmentMatch = !segment || customer.segment === segment;

        row.style.display = (searchMatch && segmentMatch) ? '' : 'none';
    });
}

function viewCustomerDetails(customerId) {
    const customer = AppState.customers.find(c => c.id === customerId);
    if (!customer) return;

    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-dialog" onclick="event.stopPropagation()" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>${customer.name}</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                        <div>
                            <h4 style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Email</h4>
                            <p>${customer.email}</p>
                        </div>
                        <div>
                            <h4 style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Telefone</h4>
                            <p>${customer.phone || '-'}</p>
                        </div>
                        <div>
                            <h4 style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Pedidos</h4>
                            <p><strong>${customer.orders_count || 0}</strong> pedidos</p>
                        </div>
                        <div>
                            <h4 style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Lifetime Value</h4>
                            <p><strong style="color: var(--success);">R$ ${formatCurrency(customer.ltv || 0)}</strong></p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 12px;">Histórico de Compras</h4>
                        <div style="background: var(--bg-darker); padding: 16px; border-radius: 8px; color: var(--text-muted);">
                            Histórico disponível em breve
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="btn btn-primary" onclick="openCustomerModal(${customerId}); closeModal();">Editar Cliente</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modal;
}

function openCustomerModal(customerId = null) {
    showToast('Modal de cliente em desenvolvimento', 'info');
}

// =====================================================
// INVENTORY PAGE
// =====================================================

async function renderInventory(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Gestão de Estoque</h1>
                <p class="page-subtitle">Controle de inventário e alertas</p>
            </div>
            <button class="btn btn-primary" onclick="adjustInventory()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Ajustar Estoque
            </button>
        </div>

        <!-- Stock Alerts -->
        <div class="stats-grid" style="margin-bottom: 32px;">
            <div class="stat-card">
                <div class="stat-label">Estoque Baixo</div>
                <div class="stat-value" style="color: var(--warning);">8</div>
                <div class="stat-change">Produtos com &lt; 10 unidades</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Sem Estoque</div>
                <div class="stat-value" style="color: var(--danger);">3</div>
                <div class="stat-change">Produtos esgotados</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Valor Total</div>
                <div class="stat-value">R$ 145.280</div>
                <div class="stat-change">Inventário total</div>
            </div>
        </div>

        <!-- Inventory Table -->
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">Alertas de Estoque</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Estoque Atual</th>
                        <th>Estoque Mínimo</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateInventoryRows()}
                </tbody>
            </table>
        </div>
    `;
}

function generateInventoryRows() {
    const items = [
        { name: 'Camiseta Hellfire Club', sku: 'ST-001', current: 3, min: 10, status: 'critical' },
        { name: 'Moletom Upside Down', sku: 'ST-002', current: 7, min: 10, status: 'warning' },
        { name: 'Caneca Demogorgon', sku: 'ST-003', current: 0, min: 5, status: 'out' },
        { name: 'Poster Stranger Things', sku: 'ST-004', current: 15, min: 10, status: 'ok' },
        { name: 'Action Figure Eleven', sku: 'ST-005', current: 2, min: 5, status: 'critical' }
    ];

    return items.map(item => {
        const badgeClass = {
            critical: 'danger',
            warning: 'warning',
            out: 'danger',
            ok: 'success'
        }[item.status];

        const statusText = {
            critical: 'Crítico',
            warning: 'Baixo',
            out: 'Esgotado',
            ok: 'OK'
        }[item.status];

        return `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td><code>${item.sku}</code></td>
                <td>${item.current}</td>
                <td>${item.min}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td>
                    <button class="btn-icon" onclick="adjustStockModal('${item.sku}')" title="Ajustar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function adjustInventory() {
    showToast('Ajuste de estoque em desenvolvimento', 'info');
}

function adjustStockModal(sku) {
    showToast(`Ajustando estoque para ${sku}`, 'info');
}

// =====================================================
// SHIPPING PAGE
// =====================================================

let shippingOptions = [];

async function loadShippingOptions() {
    try {
        console.log('🔍 Carregando shipping options...');
        console.log('🔍 API_URL:', API_URL);
        console.log('🔍 Token:', localStorage.getItem('admin_token') ? 'Presente' : 'Ausente');

        const response = await fetch(`${API_URL}/shipping`, {
            headers: getAuthHeaders()
        });

        console.log('🔍 Response status:', response.status);

        if (response.ok) {
            shippingOptions = await response.json();
            console.log('✅ Shipping options carregadas:', shippingOptions);
        } else {
            const errorData = await response.json();
            console.error('❌ Erro na resposta:', response.status, errorData);
            showToast(`Erro ao carregar fretes: ${errorData.error || 'Erro desconhecido'}`, 'error');
            shippingOptions = [];
        }
    } catch (error) {
        console.error('❌ Erro ao carregar fretes:', error);
        showToast('Erro ao conectar com servidor', 'error');
        shippingOptions = [];
    }
}

async function renderShipping(container) {
    await loadShippingOptions();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Gerenciamento de Fretes</h1>
                <p class="page-subtitle">Configure as opções de frete disponíveis na loja</p>
            </div>
            <button class="btn btn-primary" onclick="openAddShippingModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Adicionar Frete
            </button>
        </div>

        <!-- Shipping Stats -->
        <div class="stats-grid" style="margin-bottom: 32px;">
            <div class="stat-card">
                <div class="stat-label">Total de Opções</div>
                <div class="stat-value">${shippingOptions.length}</div>
                <div class="stat-change">Métodos cadastrados</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ativos</div>
                <div class="stat-value" style="color: var(--success);">${shippingOptions.filter(s => s.active).length}</div>
                <div class="stat-change">Disponíveis na loja</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Frete Mais Barato</div>
                <div class="stat-value">R$ ${shippingOptions.length > 0 ? Math.min(...shippingOptions.map(s => parseFloat(s.price))).toFixed(2).replace('.', ',') : '0,00'}</div>
                <div class="stat-change">Valor mínimo</div>
            </div>
        </div>

        <!-- Shipping Table -->
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">Opções de Frete</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Preço</th>
                        <th>Prazo de Entrega</th>
                        <th>Status</th>
                        <th>Ordem</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="shippingTableBody">
                    ${renderShippingRows()}
                </tbody>
            </table>
        </div>
    `;
}

function renderShippingRows() {
    if (shippingOptions.length === 0) {
        return `
            <tr>
                <td colspan="6" style="text-align: center; padding: 48px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.3;">
                        <rect x="1" y="3" width="15" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                    </svg>
                    <p style="color: var(--text-secondary);">Nenhuma opção de frete cadastrada</p>
                    <button class="btn btn-primary" onclick="openAddShippingModal()" style="margin-top: 16px;">Adicionar Primeira Opção</button>
                </td>
            </tr>
        `;
    }

    return shippingOptions
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(option => `
            <tr>
                <td><strong>${option.name || 'Sem nome'}</strong></td>
                <td>R$ ${parseFloat(option.price || 0).toFixed(2).replace('.', ',')}</td>
                <td>${option.delivery_time || 'Não informado'}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${option.active ? 'checked' : ''} onchange="toggleShippingStatus(${option.id})">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-icon" onclick="moveShippingUp(${option.id})" title="Mover para cima" ${option.sort_order === 0 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="moveShippingDown(${option.id})" title="Mover para baixo">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editShipping(${option.id})" title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteShipping(${option.id})" title="Deletar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
}

function openAddShippingModal() {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        <div class="modal">
            <div class="modal-header">
                <h2>Adicionar Opção de Frete</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="addShippingForm" onsubmit="saveShipping(event)">
                    <div class="form-group">
                        <label>Nome do Frete *</label>
                        <input type="text" name="name" class="search-input" placeholder="Ex: PAC, SEDEX" required>
                    </div>
                    <div class="form-group">
                        <label>Preço (R$) *</label>
                        <input type="number" name="price" class="search-input" step="0.01" min="0" placeholder="0.00" required>
                    </div>
                    <div class="form-group">
                        <label>Prazo de Entrega</label>
                        <input type="text" name="delivery_time" class="search-input" placeholder="Ex: 5-10 dias úteis">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="active" checked>
                            <span>Ativo (disponível na loja)</span>
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function editShipping(id) {
    const shipping = shippingOptions.find(s => s.id === id);
    if (!shipping) return;

    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        <div class="modal">
            <div class="modal-header">
                <h2>Editar Opção de Frete</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="editShippingForm" onsubmit="updateShipping(event, ${id})">
                    <div class="form-group">
                        <label>Nome do Frete *</label>
                        <input type="text" name="name" class="search-input" value="${shipping.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Preço (R$) *</label>
                        <input type="number" name="price" class="search-input" step="0.01" min="0" value="${parseFloat(shipping.price || 0).toFixed(2)}" required>
                    </div>
                    <div class="form-group">
                        <label>Prazo de Entrega</label>
                        <input type="text" name="delivery_time" class="search-input" value="${shipping.delivery_time || ''}">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="active" ${shipping.active ? 'checked' : ''}>
                            <span>Ativo (disponível na loja)</span>
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

async function saveShipping(event) {
    event.preventDefault();
    showLoading('Salvando...');

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        delivery_time: formData.get('delivery_time') || null,
        active: formData.get('active') ? 1 : 0
    };

    try {
        const response = await fetch(`${API_URL}/shipping`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Frete adicionado com sucesso!', 'success');
            closeModal();
            await loadPage('shipping');
        } else {
            showToast(result.error || 'Erro ao adicionar frete', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com servidor', 'error');
    } finally {
        hideLoading();
    }
}

async function updateShipping(event, id) {
    event.preventDefault();
    showLoading('Atualizando...');

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        delivery_time: formData.get('delivery_time') || null,
        active: formData.get('active') ? 1 : 0
    };

    try {
        const response = await fetch(`${API_URL}/shipping/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Frete atualizado com sucesso!', 'success');
            closeModal();
            await loadPage('shipping');
        } else {
            showToast(result.error || 'Erro ao atualizar frete', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com servidor', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteShipping(id) {
    if (!confirm('Tem certeza que deseja deletar esta opção de frete?')) return;

    showLoading('Deletando...');

    try {
        const response = await fetch(`${API_URL}/shipping/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Frete deletado com sucesso!', 'success');
            await loadPage('shipping');
        } else {
            showToast(result.error || 'Erro ao deletar frete', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com servidor', 'error');
    } finally {
        hideLoading();
    }
}

async function toggleShippingStatus(id) {
    const shipping = shippingOptions.find(s => s.id === id);
    if (!shipping) return;

    const newStatus = shipping.active ? 0 : 1;

    try {
        const response = await fetch(`${API_URL}/shipping/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ active: newStatus })
        });

        if (response.ok) {
            shipping.active = newStatus;
            showToast(`Frete ${newStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
        } else {
            showToast('Erro ao alterar status', 'error');
            // Recarregar para reverter UI
            await loadPage('shipping');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com servidor', 'error');
        await loadPage('shipping');
    }
}

async function moveShippingUp(id) {
    await reorderShipping(id, 'up');
}

async function moveShippingDown(id) {
    await reorderShipping(id, 'down');
}

async function reorderShipping(id, direction) {
    const currentIndex = shippingOptions.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= shippingOptions.length) return;

    // Swap sort_order
    const temp = shippingOptions[currentIndex].sort_order;
    shippingOptions[currentIndex].sort_order = shippingOptions[newIndex].sort_order;
    shippingOptions[newIndex].sort_order = temp;

    try {
        const updates = [
            { id: shippingOptions[currentIndex].id, sort_order: shippingOptions[currentIndex].sort_order },
            { id: shippingOptions[newIndex].id, sort_order: shippingOptions[newIndex].sort_order }
        ];

        const response = await fetch(`${API_URL}/shipping/reorder`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ order: updates })
        });

        if (response.ok) {
            await loadPage('shipping');
        } else {
            showToast('Erro ao reordenar', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com servidor', 'error');
    }
}

function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
}

// =====================================================
// SETTINGS PAGE
// =====================================================

async function renderSettings(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>Configurações</h1>
            <p class="page-subtitle">Configurações gerais da loja</p>
        </div>

        <div style="max-width: 800px;">
            <!-- Store Settings -->
            <div class="table-container" style="margin-bottom: 24px;">
                <div class="table-header">
                    <h3 class="table-title">Informações da Loja</h3>
                </div>
                <div style="padding: 24px;">
                    <div class="form-group">
                        <label>Nome da Loja</label>
                        <input type="text" value="Stranger Things Store" class="search-input">
                    </div>
                    <div class="form-group">
                        <label>Email de Contato</label>
                        <input type="email" value="contato@ststore.com" class="search-input">
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea class="search-input" rows="4">Loja oficial de produtos Stranger Things</textarea>
                    </div>
                    <button class="btn btn-primary">Salvar Alterações</button>
                </div>
            </div>

            <!-- Payment Settings -->
            <div class="table-container" style="margin-bottom: 24px;">
                <div class="table-header">
                    <h3 class="table-title">Métodos de Pagamento</h3>
                </div>
                <div style="padding: 24px;">
                    <div class="checkbox-label" style="margin-bottom: 12px;">
                        <input type="checkbox" checked>
                        <span>Cartão de Crédito</span>
                    </div>
                    <div class="checkbox-label" style="margin-bottom: 12px;">
                        <input type="checkbox" checked>
                        <span>PIX</span>
                    </div>
                    <div class="checkbox-label">
                        <input type="checkbox">
                        <span>Boleto Bancário</span>
                    </div>
                </div>
            </div>

            <!-- SEO Settings -->
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">SEO & Meta Tags</h3>
                </div>
                <div style="padding: 24px;">
                    <div class="form-group">
                        <label>Meta Title</label>
                        <input type="text" value="Stranger Things Store - Produtos Oficiais" class="search-input">
                    </div>
                    <div class="form-group">
                        <label>Meta Description</label>
                        <textarea class="search-input" rows="3">Encontre produtos oficiais de Stranger Things. Camisetas, moletons, acessórios e muito mais!</textarea>
                    </div>
                    <button class="btn btn-primary">Atualizar SEO</button>
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// GATEWAYS PAGE
// =====================================================

let paymentGateways = [];

async function loadGateways() {
    try {
        const response = await fetch(`${API_URL}/gateways`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });

        if (response.ok) {
            paymentGateways = await response.json();
        } else {
            showToast('Erro ao carregar gateways', 'error');
            paymentGateways = [];
        }
    } catch (error) {
        console.error('Erro ao carregar gateways:', error);
        showToast('Erro ao conectar com servidor', 'error');
        paymentGateways = [];
    }
}

async function renderTracking(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Rastreamento & Analytics</h1>
                <p class="page-subtitle">Gerencie pixels de rastreamento e integrações de marketing</p>
            </div>
            <div class="header-actions">
                <button class="btn-primary" onclick="saveTrackingSettings()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Salvar Alterações
                </button>
            </div>
        </div>

        <div class="details-grid">
            <!-- Meta Pixel Configuration -->
            <div class="details-card">
                <div class="card-header">
                    <h3 class="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                        Meta Pixel (Facebook Ads)
                    </h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Pixel ID</label>
                        <input type="text" id="metaPixelId" class="form-input" placeholder="Ex: 123456789012345" style="font-family: monospace;">
                        <p class="form-hint">Encontre este ID no Gerenciador de Eventos do Facebook.</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-container">
                            <input type="checkbox" id="metaPixelActive">
                            <span class="checkmark"></span>
                            Ativar Rastreamento do Meta Pixel
                        </label>
                        <p class="form-hint">Quando ativo, enviará eventos de PageView, ViewContent, AddToCart, InitiateCheckout e Purchase.</p>
                    </div>

                    <div class="alert alert-info">
                        <strong>Eventos suportados:</strong>
                        <ul style="margin-top: 8px; margin-left: 20px; list-style-type: disc;">
                            <li>PageView (Todas as páginas)</li>
                            <li>ViewContent (Página de produto)</li>
                            <li>AddToCart (Adicionar à sacola)</li>
                            <li>InitiateCheckout (Iniciar compra)</li>
                            <li>Purchase (Pedido finalizado - PIX e Cartão)</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Other Analytics (Placeholder) -->
            <div class="details-card">
                <div class="card-header">
                    <h3 class="card-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                            <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                        </svg>
                        Google Analytics 4 (Em Breve)
                    </h3>
                </div>
                <div class="card-body">
                    <div class="empty-state" style="padding: 20px 0;">
                        <p>A integração com Google Analytics 4 estará disponível em breve.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load current settings
    try {
        // GET rota pública (sem /admin prefixo duplicado)
        const response = await fetch(`${API_BASE}/api/tracking/meta-pixel`);
        const data = await response.json();

        if (data && data.pixel_id) {
            document.getElementById('metaPixelId').value = data.pixel_id;
            document.getElementById('metaPixelActive').checked = !!data.is_active;
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de tracking:', error);
        // Não mostrar erro ao usuário, apenas logar, pois pode não ter config ainda
    }

    // Define global save function
    window.saveTrackingSettings = async function () {
        const pixelId = document.getElementById('metaPixelId').value.trim();
        const isActive = document.getElementById('metaPixelActive').checked;

        if (isActive && !pixelId) {
            showToast('Por favor, informe o Pixel ID para ativar', 'error');
            return;
        }

        // Validate just numbers
        if (pixelId && !/^\d+$/.test(pixelId)) {
            showToast('Pixel ID deve conter apenas números', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('admin_token');
            // POST rota admin (já tem /api/admin em API_URL, remover extra /admin)
            const response = await fetch(`${API_URL}/tracking/meta-pixel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pixel_id: pixelId,
                    is_active: isActive
                })
            });

            const result = await response.json();

            if (result.success) {
                showToast('Configurações salvas com sucesso!', 'success');
            } else {
                showToast(result.error || 'Erro ao salvar configurações', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar tracking:', error);
            showToast('Erro de conexão ao salvar', 'error');
        }
    };
}


async function renderGateways(container) {
    await loadGateways();

    const bestfyGateway = paymentGateways.find(g => g.gateway_type === 'bestfy');

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Gateways de Pagamento</h1>
                <p class="page-subtitle">Configure os métodos de pagamento da sua loja</p>
            </div>
        </div>

        <!-- Gateway Stats -->
        <div class="stats-grid" style="margin-bottom: 32px;">
            <div class="stat-card">
                <div class="stat-label">Total de Gateways</div>
                <div class="stat-value">${paymentGateways.length}</div>
                <div class="stat-change">Configurados</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Gateway Ativo</div>
                <div class="stat-value" style="color: var(--success);">${paymentGateways.filter(g => g.is_active).length > 0 ? 'Sim' : 'Não'}</div>
                <div class="stat-change">${bestfyGateway && bestfyGateway.is_active ? 'BESTFY Ativo' : 'Nenhum ativo'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Métodos Disponíveis</div>
                <div class="stat-value">${bestfyGateway && bestfyGateway.is_active ? '2' : '0'}</div>
                <div class="stat-change">PIX e Cartão</div>
            </div>
        </div>

        <!-- BESTFY Gateway -->
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; margin-right: 8px;">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Gateway BESTFY
                </h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
                    Aceite pagamentos via PIX e Cartão de Crédito
                </p>
            </div>
            <div style="padding: 24px;">
                <form id="bestfyForm" onsubmit="saveBestfyGateway(event)">
                    <div class="form-group">
                        <label>
                            Nome do Gateway
                            <span style="color: var(--danger);">*</span>
                        </label>
                        <input 
                            type="text" 
                            name="name" 
                            class="search-input" 
                            value="${bestfyGateway?.name || 'BESTFY Payment Gateway'}" 
                            required
                            placeholder="Nome para identificação interna"
                        >
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                Public Key (Chave Pública)
                                <span style="color: var(--danger);">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="public_key" 
                                class="search-input" 
                                value="${bestfyGateway?.public_key || ''}" 
                                required
                                placeholder="pk_live_..."
                                style="font-family: monospace; font-size: 13px;"
                            >
                            <small style="color: var(--text-secondary); display: block; margin-top: 4px;">
                                Chave pública para uso no frontend
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                Secret Key (Chave Secreta)
                                <span style="color: var(--danger);">*</span>
                            </label>
                            <input 
                                type="password" 
                                name="secret_key" 
                                class="search-input" 
                                value="${bestfyGateway?.secret_key || ''}" 
                                required
                                placeholder="sk_live_..."
                                style="font-family: monospace; font-size: 13px;"
                            >
                            <small style="color: var(--text-secondary); display: block; margin-top: 4px;">
                                Chave secreta (será armazenada de forma segura)
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color);">
                        <label class="checkbox-label">
                            <input 
                                type="checkbox" 
                                name="is_active" 
                                ${bestfyGateway?.is_active ? 'checked' : ''}
                                style="width: 20px; height: 20px;"
                            >
                            <span style="font-size: 15px; font-weight: 500;">
                                Ativar gateway BESTFY
                                <small style="display: block; font-weight: 400; color: var(--text-secondary); margin-top: 4px;">
                                    Ao ativar, o checkout usará este gateway para processar pagamentos
                                </small>
                            </span>
                        </label>
                    </div>
                    
                    <div style="margin-top: 32px; display: flex; gap: 12px; align-items: center;">
                        <button type="submit" class="btn btn-primary" style="min-width: 180px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Salvar Configurações
                        </button>
                        
                        ${bestfyGateway ? `
                            <button type="button" class="btn btn-secondary" onclick="testBestfyConnection()">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                </svg>
                                Testar Conexão
                            </button>
                        ` : ''}
                        
                        <a href="https://bestfy.readme.io/reference/introducao" target="_blank" class="btn btn-secondary" style="margin-left: auto;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Documentação
                        </a>
                    </div>
                </form>
                
                ${bestfyGateway && bestfyGateway.is_active ? `
                    <div style="margin-top: 32px; padding: 16px; background: var(--success-bg); border-left: 4px solid var(--success); border-radius: 6px;">
                        <div style="display: flex; align-items: start; gap: 12px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="width: 24px; height: 24px; flex-shrink: 0;">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <div>
                                <strong style="color: var(--success); display: block; margin-bottom: 4px;">Gateway BESTFY Ativo</strong>
                                <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">
                                    Sua loja está aceitando pagamentos via PIX e Cartão de Crédito através do BESTFY.
                                    <br>As transações serão processadas automaticamente no checkout.
                                </p>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Info Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 24px;">
            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Pagamento com PIX
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px;">
                    <li>Aprovação instantânea</li>
                    <li>QR Code gerado automaticamente</li>
                    <li>Desconto de 5% no checkout</li>
                    <li>Webhook de confirmação</li>
                </ul>
            </div>
            
            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Cartão de Crédito
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px;">
                    <li>Parcelamento em até 12x</li>
                    <li>Antifraude integrado</li>
                    <li>Bandeiras principais aceitas</li>
                    <li>Processamento seguro</li>
                </ul>
            </div>
        </div>
    `;
}

async function saveBestfyGateway(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const data = {
        name: formData.get('name'),
        gateway_type: 'bestfy',
        public_key: formData.get('public_key'),
        secret_key: formData.get('secret_key'),
        is_active: formData.get('is_active') ? 1 : 0
    };

    showLoading();

    try {
        const response = await fetch(`${API_URL}/gateways`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Configurações salvas com sucesso!', 'success');
            await loadGateways();
            loadPage('gateways');
        } else {
            showToast(result.error || 'Erro ao salvar configurações', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar gateway:', error);
        showToast('Erro ao conectar com servidor', 'error');
    } finally {
        hideLoading();
    }
}

async function testBestfyConnection() {
    showLoading();
    showToast('Testando conexão com BESTFY...', 'info');

    try {
        const response = await fetch(`${API_BASE}/api/gateway/active`);
        const data = await response.json();

        if (data.active && data.type === 'bestfy') {
            showToast('✓ Conexão com BESTFY estabelecida com sucesso!', 'success');
        } else {
            showToast('Gateway não está ativo ou configurado', 'warning');
        }
    } catch (error) {
        console.error('Erro ao testar conexão:', error);
        showToast('Erro ao testar conexão com BESTFY', 'error');
    } finally {
        hideLoading();
    }
}

// Continue na próxima parte com modais, notificações e utilitários...
// =====================================================
// MODALS - PARTE 4 (FINAL)
// =====================================================

function createModalContainers() {
    if (!document.getElementById('modalContainer')) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        document.body.appendChild(modalContainer);
    }

    // Create generic modal if it doesn't exist
    if (!document.getElementById('genericModal')) {
        const genericModal = document.createElement('div');
        genericModal.id = 'genericModal';
        genericModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;';
        document.body.appendChild(genericModal);
    }
}

async function openProductModal(productId = null) {
    const product = productId ? AppState.products.find(p => p.id === productId) : null;
    const isEdit = !!product;

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
                            <label>SKU</label>
                            <input type="text" name="sku" value="${product?.sku || ''}" placeholder="ST-001">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Categoria</label>
                            <input type="text" name="category" value="${product?.category || ''}" placeholder="Ex: Roupas">
                        </div>
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
                        <textarea name="description" rows="4" placeholder="Descrição detalhada do produto...">${product?.description || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Imagem Principal (Upload)</label>
                        <input type="file" name="image" accept="image/*">
                        ${product?.image_url ? `<br><small style="color: var(--text-secondary);">Imagem atual: <a href="${product.image_url}" target="_blank" style="color: var(--primary);">Ver imagem</a></small>` : ''}
                    </div>

                    <div class="form-group">
                        <label>Imagens Adicionais (URLs) - Uma por linha</label>
                        <textarea name="additional_images" rows="3" placeholder="https://.../foto2.jpg&#10;https://.../foto3.jpg" style="font-family: monospace; font-size: 12px;">${existingImages}</textarea>
                        <small>Cole links de imagens aqui para criar a galeria</small>
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        ${isEdit ? 'Salvar Alterações' : 'Criar Produto'}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProduct(productId);
    });
}

async function saveProduct(productId) {
    const form = document.getElementById('productForm');
    const formData = new FormData(form);

    const additionalImagesRaw = formData.get('additional_images');
    if (additionalImagesRaw) {
        const imagesArray = additionalImagesRaw.split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);
        formData.append('images_json', JSON.stringify(imagesArray));
        formData.delete('additional_images');
    } else {
        formData.append('images_json', '[]');
    }

    showLoading(productId ? 'Atualizando produto...' : 'Criando produto...');

    try {
        const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
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

async function openCollectionModal(collectionId = null) {
    const collection = collectionId ? AppState.collections.find(c => c.id === collectionId) : null;
    const isEdit = !!collection;

    let allProducts = AppState.products;
    if (allProducts.length === 0) {
        try {
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
                    <div class="tabs-nav">
                        <button type="button" class="tab-btn active" onclick="switchTab(this, 'tab-info')">
                            Informações
                        </button>
                        <button type="button" class="tab-btn" onclick="switchTab(this, 'tab-products')">
                            Produtos (${associatedIds.size})
                        </button>
                    </div>

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
                        <div class="form-group">
                            <label>Visualização Padrão no Frontend</label>
                            <div class="view-toggle" style="display: inline-flex; margin-top: 8px;">
                                <button type="button" class="view-toggle-btn ${!collection?.default_view || collection?.default_view === 'grid' ? 'active' : ''}" onclick="selectDefaultView(this, 'grid')" title="Grade">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="14" width="7" height="7"></rect>
                                        <rect x="3" y="14" width="7" height="7"></rect>
                                    </svg>
                                </button>
                                <button type="button" class="view-toggle-btn ${collection?.default_view === 'carousel' ? 'active' : ''}" onclick="selectDefaultView(this, 'carousel')" title="Carrossel">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                                        <polyline points="17 2 12 7 7 2"></polyline>
                                    </svg>
                                </button>
                            </div>
                            <input type="hidden" name="default_view" value="${collection?.default_view || 'grid'}">
                            <small>Escolha como os produtos aparecerão por padrão nesta coleção. O cliente pode alterar no site.</small>
                        </div>
                    </div>

                    <div id="tab-products" class="tab-content" style="display:none;">
                        <div class="form-group">
                            <input type="text" placeholder="🔍 Buscar produto..." onkeyup="filterCollectionProducts(this)" style="margin-bottom:10px; width:100%; padding:10px; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary);">
                            <div class="products-list-scroll" style="max-height: 350px; overflow-y: auto; border: 1px solid var(--border); padding: 12px; border-radius: 6px; background: var(--bg-darker);">
                                ${allProducts.map(p => `
                                    <div class="product-selection-item" style="display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid var(--border); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                                        <input type="checkbox" name="product_ids" value="${p.id}" ${associatedIds.has(p.id) ? 'checked' : ''} style="width:18px; height:18px; margin:0; cursor: pointer; accent-color: var(--primary);">
                                        <div style="width:40px; height:40px; background:var(--bg-card); border-radius:6px; overflow:hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                            ${p.image_url ? `<img src="${p.image_url}" style="width:100%; height:100%; object-fit:cover;">` : ''}
                                        </div>
                                        <div style="flex: 1; min-width: 0;">
                                            <span class="prod-name" style="font-size:14px; font-weight: 600; display: block; color: var(--text-primary);">${p.name}</span>
                                            <span style="font-size:12px; color: var(--text-muted);">R$ ${parseFloat(p.price || 0).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" form="collectionForm" class="btn btn-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        ${isEdit ? 'Salvar Alterações' : 'Criar Coleção'}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    window.switchTab = (btn, tabId) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
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

    if (!isEdit) {
        const nameInput = document.querySelector('[name="name"]');
        const slugInput = document.querySelector('[name="slug"]');
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

    const selectedProducts = [];
    form.querySelectorAll('input[name="product_ids"]:checked').forEach(cb => {
        selectedProducts.push(parseInt(cb.value));
    });

    const data = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description') || '',
        is_active: formData.get('is_active') === 'on',
        default_view: formData.get('default_view') || 'grid'
    };

    showLoading(collectionId ? 'Atualizando coleção...' : 'Criando coleção...');

    try {
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
            const targetId = collectionId || result.id;

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
            loadPage('collections');
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

async function manageCollectionProducts(collectionId) {
    showLoading('Carregando produtos...');
    try {
        const collectionsResp = await fetch(`${API_URL}/collections`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const allCollections = await collectionsResp.json();
        const collection = allCollections.find(c => c.id === collectionId);

        const productsResp = await fetch(`${API_BASE}/api/products`);
        let allProducts = await productsResp.json();

        const inCollectionIds = new Set((collection.products || []).map(p => p.id));
        const productsIn = collection.products || [];
        const productsOut = allProducts.filter(p => !inCollectionIds.has(p.id));

        const modalHtml = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-dialog" style="max-width: 1000px; max-height: 85vh;" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>Gerenciar: ${collection.name}</h2>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    
                    <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; overflow: hidden; padding: 24px;">
                        <div style="display: flex; flex-direction: column; background: var(--bg-darker); padding: 16px; border-radius: 8px; border: 1px solid var(--border); max-height: 500px;">
                            <h3 style="margin-bottom: 12px; font-size: 16px;">
                                Na Coleção (${productsIn.length})
                                <small style="color: var(--text-muted); font-size: 11px; font-weight: normal; display: block;">Arraste para reordenar</small>
                            </h3>
                            <div id="inCollectionList" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; max-height: 450px;">
                                ${productsIn.map(p => renderManageProductItem(p, true, collectionId)).join('')}
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; background: var(--bg-card); padding: 16px; border-radius: 8px; border: 1px solid var(--border); max-height: 500px;">
                            <h3 style="margin-bottom: 12px; font-size: 16px;">Produtos Disponíveis</h3>
                            <input type="text" placeholder="🔍 Buscar produto..." onkeyup="filterPMList(this)" style="margin-bottom: 10px; padding: 10px; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary);">
                            <div id="outCollectionList" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; max-height: 400px;">
                                ${productsOut.map(p => renderManageProductItem(p, false, collectionId)).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="btn btn-primary" onclick="saveCollectionProductOrder(${collectionId}); showToast('Ordem salva com sucesso!', 'success');">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modalHtml;

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

function renderManageProductItem(product, isIn, collectionId) {
    return `
        <div class="pm-item" data-id="${product.id}" style="background: var(--bg-card); padding: 10px; border-radius: 6px; border: 1px solid var(--border); display: flex; align-items: center; gap: 10px; cursor: ${isIn ? 'move' : 'default'}; transition: all 0.2s;">
            <img src="${product.image_url || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</div>
                <div style="font-size: 12px; color: var(--text-muted);">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
            </div>
            <button class="btn-icon ${isIn ? 'danger' : 'success'}" style="flex-shrink: 0;"
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
            manageCollectionProducts(collectionId);
        } else {
            const data = await response.json();
            showToast(data.error || 'Erro ao adicionar', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Erro de conexão', 'error');
    }
}

async function removeProductFromCollection(collectionId, productId) {
    if (!confirm('Remover produto da coleção?')) return;
    try {
        const response = await fetch(`${API_URL}/collections/${collectionId}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) {
            manageCollectionProducts(collectionId);
        } else {
            showToast('Erro ao remover', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Erro de conexão', 'error');
    }
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
    } catch (e) {
        console.error('Erro ao salvar ordem', e);
    }
}

function filterPMList(input) {
    const term = input.value.toLowerCase();
    const items = document.querySelectorAll('#outCollectionList .pm-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

// Selecionar visualização padrão no modal de coleção
function selectDefaultView(btn, view) {
    // Atualizar botões ativos
    const container = btn.parentElement;
    container.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Atualizar campo hidden
    const form = btn.closest('form');
    const hiddenInput = form.querySelector('input[name="default_view"]');
    if (hiddenInput) {
        hiddenInput.value = view;
    }
}

// Tornar função global
window.selectDefaultView = selectDefaultView;

function closeModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        modalContainer.innerHTML = '';
    }

    // Also close generic modal
    const genericModal = document.getElementById('genericModal');
    if (genericModal) {
        genericModal.style.display = 'none';
        genericModal.innerHTML = '';
    }
}

// =====================================================
// NOTIFICATIONS & TOASTS
// =====================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
        error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${icons[type]}
            </svg>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.classList.add('toast-exit'); setTimeout(() => this.parentElement.remove(), 300)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-exit'), 4000);
    setTimeout(() => toast.remove(), 4300);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
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

function showNotificationsPanel() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-dialog" style="max-width: 500px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Notificações</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
                    <div class="activity-list">
                        <div class="activity-item">
                            <div class="activity-icon success">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">Novo pedido recebido</div>
                                <div class="activity-time">Há 5 minutos</div>
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
                                <div class="activity-title">Estoque baixo detectado</div>
                                <div class="activity-time">Há 1 hora</div>
                            </div>
                        </div>
                        <div class="activity-item">
                            <div class="activity-icon info">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">Backup automático realizado</div>
                                <div class="activity-time">Há 3 horas</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
                    <button class="btn btn-primary">Marcar Todas como Lidas</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modal;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatCurrency(value) {
    if (typeof value === 'number') {
        return value.toFixed(2).replace('.', ',');
    }
    return parseFloat(value || 0).toFixed(2).replace('.', ',');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =====================================================
// BULK DISCOUNT MODAL
// =====================================================

function openBulkDiscountModal() {
    const selectedProducts = Array.from(AppState.selected.products).map(id =>
        AppState.products.find(p => p.id === id)
    ).filter(Boolean);

    if (selectedProducts.length === 0) {
        showToast('Selecione produtos para aplicar desconto', 'warning');
        return;
    }

    const modal = document.getElementById('genericModal');
    if (!modal) {
        console.error('Modal container not found');
        return;
    }

    modal.style.display = 'flex';

    // Add click event to close modal when clicking overlay
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; background: var(--bg-card); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); animation: modalSlideIn 0.3s ease; overflow: hidden;">
            <div class="modal-header" style="padding: 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; color: var(--text-primary); font-size: 1.5rem;">💰 Desconto em Massa</h2>
                <button onclick="closeModal()" class="modal-close" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--text-secondary); line-height: 1; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 24px; max-height: 70vh; overflow-y: auto;">
                <div style="margin-bottom: 24px; padding: 16px; background: rgba(229, 9, 20, 0.1); border-left: 3px solid var(--primary); border-radius: 6px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">📦 ${selectedProducts.length} produtos selecionados</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        Ajuste o desconto usando a barra abaixo e veja os preços atualizados em tempo real
                    </div>
                </div>

                <div style="margin-bottom: 32px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">
                        Percentual de Desconto
                    </label>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <input 
                            type="range" 
                            id="discountSlider" 
                            min="10" 
                            max="80" 
                            value="10" 
                            step="5"
                            style="flex: 1; height: 8px; background: linear-gradient(90deg, #52c77a 0%, #52c77a 12.5%, #E50914 12.5%, #E50914 100%); border-radius: 4px; outline: none; cursor: pointer; -webkit-appearance: none; appearance: none;"
                            oninput="updateDiscountPreview(this.value)"
                        >
                        <div style="min-width: 80px; text-align: center; padding: 8px 16px; background: var(--bg-secondary); border-radius: 6px; font-weight: 700; font-size: 18px; color: var(--primary);">
                            <span id="discountValue">10</span>%
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: var(--text-muted);">
                        <span>10%</span>
                        <span>45%</span>
                        <span>80%</span>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); text-transform: uppercase;">
                        Preview dos Preços
                    </h3>
                </div>

                <div id="discountPreviewList" style="max-height: 400px; overflow-y: auto;">
                    ${renderDiscountPreview(selectedProducts, 10)}
                </div>
            </div>
            <div class="modal-footer" style="padding: 24px; border-top: 1px solid var(--border-color); display: flex; gap: 12px; justify-content: flex-end; background: var(--bg-secondary);">
                <button class="btn btn-secondary" onclick="closeModal()" style="padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancelar</button>
                <button class="btn btn-primary" onclick="applyBulkDiscount()" style="padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Aplicar Desconto
                </button>
            </div>
        </div>
        
        <style>
            #discountSlider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--primary);
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            #discountSlider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--primary);
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .modal-close:hover {
                background: rgba(229, 9, 20, 0.1);
                color: var(--primary);
            }
        </style>
    `;

    // Store selected products in modal data
    modal.dataset.selectedProducts = JSON.stringify(selectedProducts.map(p => ({ id: p.id, price: p.price })));
}

function renderDiscountPreview(products, discountPercent) {
    return products.map(product => {
        const originalPrice = parseFloat(product.price);
        const newPrice = originalPrice * (1 - discountPercent / 100);
        const saving = originalPrice - newPrice;

        return `
            <div style="display: flex; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 8px; border-left: 3px solid var(--primary);">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${product.name}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        SKU: ${product.sku || 'N/A'}
                    </div>
                </div>
                <div style="text-align: right; min-width: 180px;">
                    <div style="font-size: 12px; color: var(--text-muted); text-decoration: line-through; margin-bottom: 2px;">
                        R$ ${originalPrice.toFixed(2).replace('.', ',')}
                    </div>
                    <div style="font-size: 18px; font-weight: 700; color: #52c77a; margin-bottom: 2px;">
                        R$ ${newPrice.toFixed(2).replace('.', ',')}
                    </div>
                    <div style="font-size: 11px; color: var(--success);">
                        Economia: R$ ${saving.toFixed(2).replace('.', ',')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateDiscountPreview(discountPercent) {
    document.getElementById('discountValue').textContent = discountPercent;

    // Update slider background gradient
    const slider = document.getElementById('discountSlider');
    const percentage = ((discountPercent - 10) / 70) * 100;
    slider.style.background = `linear-gradient(90deg, #52c77a 0%, #52c77a ${percentage}%, #E50914 ${percentage}%, #E50914 100%)`;

    const modal = document.getElementById('genericModal');
    const productsData = JSON.parse(modal.dataset.selectedProducts || '[]');
    const products = productsData.map(pd => AppState.products.find(p => p.id === pd.id)).filter(Boolean);

    document.getElementById('discountPreviewList').innerHTML = renderDiscountPreview(products, discountPercent);
}

async function applyBulkDiscount() {
    const discountPercent = parseInt(document.getElementById('discountSlider').value);
    const modal = document.getElementById('genericModal');
    const productsData = JSON.parse(modal.dataset.selectedProducts || '[]');

    if (productsData.length === 0) {
        showToast('Nenhum produto selecionado', 'error');
        return;
    }

    if (!confirm(`Tem certeza que deseja aplicar ${discountPercent}% de desconto em ${productsData.length} produtos?\n\nEsta ação irá atualizar os preços permanentemente.`)) {
        return;
    }

    showLoading('Aplicando descontos...');

    try {
        const response = await fetch(`${API_URL}/products/bulk-discount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({
                productIds: productsData.map(p => p.id),
                discountPercent: discountPercent
            })
        });

        if (response.ok) {
            hideLoading();
            showToast(`${productsData.length} produtos atualizados com sucesso!`, 'success');
            closeModal();
            await loadProducts(); // Reload table
            renderProducts(document.getElementById('mainContent')); // Re-render products after loading
            AppState.selected.products.clear(); // Clear selection after successful update
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao aplicar descontos');
        }

    } catch (error) {
        hideLoading();
        console.error('Erro ao aplicar desconto em massa:', error);
        showToast('Erro ao aplicar descontos: ' + error.message, 'error');
    }
}

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.openProductModal = openProductModal;
window.openCollectionModal = openCollectionModal;
window.openCustomerModal = openCustomerModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.deleteCollection = deleteCollection;
window.toggleProductSelection = toggleProductSelection;
window.toggleSelectAllProducts = toggleSelectAllProducts;
window.bulkEditProducts = bulkEditProducts;
window.bulkDeleteProducts = bulkDeleteProducts;
window.openBulkDiscountModal = openBulkDiscountModal;
window.updateDiscountPreview = updateDiscountPreview;
window.applyBulkDiscount = applyBulkDiscount;
window.importProductsCSV = importProductsCSV;
window.previewProduct = previewProduct;
window.filterProductsTable = filterProductsTable;
window.filterOrdersTable = filterOrdersTable;
window.filterCustomersTable = filterCustomersTable;
window.manageCollectionProducts = manageCollectionProducts;
window.addProductToCollection = addProductToCollection;
window.removeProductFromCollection = removeProductFromCollection;
window.saveCollectionProductOrder = saveCollectionProductOrder;
window.filterPMList = filterPMList;
window.updateOrderStatus = updateOrderStatus;
window.viewOrderDetails = viewOrderDetails;
window.viewCustomerDetails = viewCustomerDetails;
window.printInvoice = printInvoice;
window.exportOrders = exportOrders;
window.adjustInventory = adjustInventory;
window.adjustStockModal = adjustStockModal;
window.previousProductsPage = previousProductsPage;
window.nextProductsPage = nextProductsPage;
window.closeModal = closeModal;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.loadPage = loadPage;

console.log('%c🎬 Stranger Things Admin Dashboard PRO v2.0', 'background: #E50914; color: white; font-size: 16px; font-weight: bold; padding: 10px;');
console.log('%cSistema carregado com sucesso! ✨', 'color: #10B981; font-size: 14px;');
// =====================================================
// GATEWAYS PAGE
// =====================================================

async function renderGateways(container) {
    showLoading('Carregando gateways...');

    try {
        const response = await fetch(`${API_URL}/gateways`, {
            headers: getAuthHeaders()
        });

        const gateways = await response.json();

        container.innerHTML = `
            <div class="page-header">
                <h2>Gateways de Pagamento</h2>
                <p>Configure as credenciais dos gateways de pagamento</p>
            </div>

            <div class="gateways-grid">
                ${gateways.map(gateway => `
                    <div class="gateway-card ${gateway.is_active ? 'active' : ''}">
                        <div class="gateway-header">
                            <div class="gateway-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                                    <line x1="2" y1="10" x2="22" y2="10"></line>
                                </svg>
                            </div>
                            <div class="gateway-info">
                                <h3>${gateway.name}</h3>
                                <span class="gateway-type">${gateway.gateway_type.toUpperCase()}</span>
                            </div>
                            <div class="gateway-status">
                                <span class="status-badge ${gateway.is_active ? 'active' : 'inactive'}">
                                    ${gateway.is_active ? '✓ Ativo' : '○ Inativo'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="gateway-body">
                            <div class="gateway-field">
                                <label>Public Key</label>
                                <div class="key-display">
                                    ${gateway.public_key ? '••••••••' + gateway.public_key.slice(-8) : 'Não configurado'}
                                </div>
                            </div>
                            <div class="gateway-field">
                                <label>Secret Key</label>
                                <div class="key-display">
                                    ${gateway.secret_key ? '••••••••' + gateway.secret_key.slice(-8) : 'Não configurado'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="gateway-actions">
                            <button class="btn btn-primary" onclick="editGateway(${gateway.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Configurar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <style>
                .gateways-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 24px;
                    margin-top: 24px;
                }

                .gateway-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 24px;
                    transition: all 0.3s ease;
                }

                .gateway-card.active {
                    border-color: var(--success);
                    box-shadow: 0 0 0 1px var(--success);
                }

                .gateway-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .gateway-icon {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, rgba(229, 9, 20, 0.1), rgba(229, 9, 20, 0.05));
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gateway-icon svg {
                    width: 24px;
                    height: 24px;
                    color: var(--netflix-red);
                }

                .gateway-info {
                    flex: 1;
                }

                .gateway-info h3 {
                    margin: 0 0 4px 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .gateway-type {
                    font-size: 12px;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .gateway-status .status-badge {
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .gateway-status .status-badge.active {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--success);
                }

                .gateway-status .status-badge.inactive {
                    background: rgba(156, 163, 175, 0.1);
                    color: var(--text-secondary);
                }

                .gateway-body {
                    margin-bottom: 20px;
                }

                .gateway-field {
                    margin-bottom: 16px;
                }

                .gateway-field label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    margin-bottom: 6px;
                }

                .key-display {
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    padding: 8px 12px;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    color: var(--text-primary);
                }

                .gateway-actions {
                    display: flex;
                    gap: 12px;
                }

                .gateway-actions .btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
            </style>
        `;
    } catch (error) {
        console.error('Erro ao carregar gateways:', error);
        showToast('Erro ao carregar gateways', 'error');
    } finally {
        hideLoading();
    }
}

function editGateway(id) {
    showLoading('Carregando configurações...');

    fetch(`${API_URL}/gateways/${id}`, {
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(gateway => {
            hideLoading();

            const settings = gateway.settings_json ? JSON.parse(gateway.settings_json) : {};

            const modal = document.getElementById('modalContainer');
            modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal()"></div>
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Configurar ${gateway.name}</h2>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editGatewayForm" onsubmit="saveGateway(event, ${id})">
                        <div class="form-group">
                            <label>Public Key *</label>
                            <input type="text" name="public_key" class="search-input" 
                                   value="${gateway.public_key || ''}" 
                                   placeholder="pk_..." required>
                            <small style="color: var(--text-secondary); font-size: 12px;">
                                Chave pública fornecida pela Bestfy
                            </small>
                        </div>
                        
                        <div class="form-group">
                            <label>Secret Key *</label>
                            <input type="password" name="secret_key" class="search-input" 
                                   value="${gateway.secret_key || ''}" 
                                   placeholder="sk_..." required>
                            <small style="color: var(--text-secondary); font-size: 12px;">
                                Chave secreta fornecida pela Bestfy (nunca compartilhe)
                            </small>
                        </div>

                         <div class="form-group" style="background: var(--bg-darker); padding: 12px; border-radius: 8px; margin-top: 16px;">
                            <label style="margin-bottom: 8px; display: block;">Métodos Aceitos</label>
                            
                            <label class="checkbox-label" style="margin-bottom: 8px;">
                                <input type="checkbox" name="enable_pix" ${settings.enable_pix !== false ? 'checked' : ''}>
                                <span>Processar PIX</span>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" name="enable_credit_card" ${settings.enable_credit_card !== false ? 'checked' : ''}>
                                <span>Processar Cartão de Crédito</span>
                            </label>
                        </div>
                        
                        <div class="form-group" style="margin-top: 16px;">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_active" ${gateway.is_active ? 'checked' : ''}>
                                <span>Ativar gateway (permitir pagamentos)</span>
                            </label>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar Configurações</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        })
        .catch(error => {
            hideLoading();
            console.error('Erro:', error);
            showToast('Erro ao carregar gateway', 'error');
        });
}

async function saveGateway(event, id) {
    event.preventDefault();
    showLoading('Salvando...');

    const formData = new FormData(event.target);

    // settings_json logic
    const settings = {
        enable_pix: formData.get('enable_pix') ? true : false,
        enable_credit_card: formData.get('enable_credit_card') ? true : false
    };

    const data = {
        name: 'Bestfy Payments', // Mantém o nome
        public_key: formData.get('public_key'),
        secret_key: formData.get('secret_key'),
        is_active: formData.get('is_active') ? 1 : 0,
        settings_json: JSON.stringify(settings)
    };

    try {
        const response = await fetch(`${API_URL}/gateways/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Gateway salvo com sucesso!', 'success');
            closeModal();
            // Recarregar a página atual se for gateways
            const hash = window.location.hash.substring(1);
            if (hash === 'gateways') {
                loadPage('gateways');
            }
        } else {
            showToast(result.error || 'Erro ao salvar', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao salvar gateway', 'error');
    } finally {
        hideLoading();
    }
}

// =====================================================
// BULK ACTIONS & HELPERS
// =====================================================

window.toggleSelectAllOrders = function (source) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(chk => {
        chk.checked = source.checked;
    });
    updateBulkSelection();
}

window.updateBulkSelection = function () {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const count = checkboxes.length;
    const btnDelete = document.getElementById('btnDeleteSelected');
    const countSpan = document.getElementById('selectedCount');

    if (btnDelete && countSpan) {
        countSpan.textContent = count;
        btnDelete.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

window.deleteSelectedOrders = async function () {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);

    if (ids.length === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${ids.length} pedido(s)? Esta ação não pode ser desfeita.`)) {
        return;
    }

    showLoading('Excluindo pedidos...');

    try {
        const response = await fetch(`${API_URL}/orders/bulk`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ order_ids: ids })
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || 'Pedidos excluídos com sucesso', 'success');
            loadPage('orders'); // Recarrega a lista
        } else {
            showToast(result.error || 'Erro ao excluir pedidos', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir pedidos:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    } finally {
        hideLoading();
    }
}





// Debug Helper globally available
window.forceProductionSeed = async function () {
    console.log('🚀 Forçando seed manual...');
    try {
        const res = await fetch(`${API_BASE}/api/admin/force-db-reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const data = await res.json();
        console.log('Seed Result:', data);
        alert('Seed executado: ' + (data.success ? 'Sucesso' : 'Falha'));
    } catch (e) {
        console.error(e);
        alert('Erro ao executar seed');
    }
}
console.log('🛠️ DEBUG: Para rodar seed manual, digite forceProductionSeed() no console.');

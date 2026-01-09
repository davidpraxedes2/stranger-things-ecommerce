if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.origin;
    window.API_URL = `${window.API_BASE}/api`;
}
var API_BASE = window.API_BASE;
var API_URL = window.API_URL;

// Products Data (loaded from API)
let products = [];
let collections = [];

// ===== SISTEMA DE ANALYTICS - TEMPO REAL (HEARTBEAT) =====

async function initRealTimeTracking() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('analytics_session_id', sessionId);
    }

    let userLocation = JSON.parse(localStorage.getItem('user_location_cache') || 'null');

    // Fetch Location if missing
    if (!userLocation) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                userLocation = {
                    city: data.city,
                    region: data.region_code,
                    country: data.country_code,
                    lat: data.latitude,
                    lon: data.longitude
                };
                localStorage.setItem('user_location_cache', JSON.stringify(userLocation));
            }
        } catch (e) { console.warn('Loc Fail', e); }
    }

    // Extract UTM parameters (capture once per session)
    const getUTMParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            source: urlParams.get('utm_source') || null,
            medium: urlParams.get('utm_medium') || null,
            campaign: urlParams.get('utm_campaign') || null,
            term: urlParams.get('utm_term') || null,
            content: urlParams.get('utm_content') || null
        };
    };

    // Detect device type and browser
    const getDeviceInfo = () => {
        const ua = navigator.userAgent;

        // Device detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
        let deviceType = 'Desktop';
        if (isTablet) deviceType = 'Tablet';
        else if (isMobile) deviceType = 'Mobile';

        // Browser detection
        let browser = 'Unknown';
        if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('SamsungBrowser') > -1) browser = 'Samsung';
        else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
        else if (ua.indexOf('Trident') > -1) browser = 'IE';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';
        else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';

        return { deviceType, browser };
    };

    const utmParams = getUTMParams();
    const deviceInfo = getDeviceInfo();

    const sendHeartbeat = () => {
        const payload = {
            session_id: sessionId,
            page: window.location.pathname + window.location.search,
            pageTitle: document.title,
            action: 'view',
            location: userLocation,
            utm: utmParams,
            device: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            ip: null // Server handles IP
        };

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${API_URL || '/api'}/analytics/heartbeat`, blob);
        } else {
            fetch(`${API_URL || '/api'}/analytics/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => { }); // Silent fail
        }
    };

    // Initial Ping
    sendHeartbeat();
    // Loop Ping (every 10s)
    setInterval(sendHeartbeat, 10000);

    // Ping on visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') sendHeartbeat();
    });
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealTimeTracking);
} else {
    initRealTimeTracking();
}

// Meta Pixel: Track PageView handled in index.html inline script
// if (typeof window.metaPixel !== 'undefined') {
//     window.metaPixel.trackPageView();
// }


// Debounce helper para otimizar eventos
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load collections from API
async function loadCollections() {
    console.log('🔄 loadCollections INICIADA');
    try {
        console.log('📡 Fazendo fetch de collections...');
        const response = await fetch(`${API_URL}/collections`);
        console.log('📡 Response recebida:', response.status);
        if (response.ok) {
            collections = await response.json();
            console.log(`✅ ${collections.length} coleções carregadas`);
        } else {
            console.warn('⚠️ Collections API retornou status:', response.status);
            collections = [];
        }
    } catch (error) {
        console.error('❌ Erro ao carregar coleções:', error);
        collections = [];
    }
    console.log('🔄 loadCollections CONCLUÍDA');
}

// Render collections with products
async function renderCollectionsSections() {
    console.log('🎨🎨🎨 renderCollectionsSections CHAMADA 🎨🎨🎨');

    try {
        const container = document.getElementById('collectionsContainer');
        if (!container) {
            console.log('ℹ️ Container #collectionsContainer não encontrado (provavelmente não é a Home).');
            return;
        }

        // Limpar skeletons
        container.innerHTML = '';

        // Verificar se temos coleções configuradas com produtos (Backend-driven)
        const activeCollections = collections.filter(c => c.products && c.products.length > 0);

        if (activeCollections.length > 0) {
            console.log('✅✅✅ RENDERIZANDO COLEÇÕES CONFIGURADAS NO ADMIN');

            const html = activeCollections.map((col, index) => {
                // Determinar visualização inicial:
                // 1. Preferência do usuário (localStorage) - mais alta prioridade
                // 2. Configuração do admin (default_view do backend)
                // 3. Fallback hard-coded ('grid')
                const userPreference = localStorage.getItem(`collection_${col.id}_view`);
                const initialView = userPreference || col.default_view || 'grid';

                const isGridActive = initialView === 'grid';
                const isCarouselActive = initialView === 'carousel';

                // Pagination: mostrar apenas 10 produtos inicialmente
                const INITIAL_PRODUCTS = 10;
                const initialProducts = col.products.slice(0, INITIAL_PRODUCTS);
                const hasMore = col.products.length > INITIAL_PRODUCTS;

                return `
                <section class="products-section collection-section animate-entry" data-collection-id="${col.id}">
                    <div class="container">
                        <div class="section-header">
                            <div>
                                <h2 class="section-title">${(col.name || '').replace(/[<>]/g, '').toUpperCase()}</h2>
                                ${col.description ? `<p class="section-subtitle">${(col.description || '').replace(/[<>]/g, '')}</p>` : ''}
                            </div>
                            <div class="section-header-actions">
                                <a href="collection.html?slug=${col.slug}" class="view-all-link">
                                    Ver Todos (${col.products.length}) →
                                </a>
                                <div class="view-toggle">
                                    <button class="view-toggle-btn ${isGridActive ? 'active' : ''}" data-view="grid" data-collection="${col.id}" title="Visualização em Grade">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="14" width="7" height="7"></rect>
                                            <rect x="3" y="14" width="7" height="7"></rect>
                                        </svg>
                                    </button>
                                    <button class="view-toggle-btn ${isCarouselActive ? 'active' : ''}" data-view="carousel" data-collection="${col.id}" title="Visualização em Carrossel">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                                            <polyline points="17 2 12 7 7 2"></polyline>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Grid View -->
                        <div class="products-grid collection-view-grid" data-collection="${col.id}" style="display: ${isGridActive ? 'grid' : 'none'};">
                            ${initialProducts.map(p => renderProductCard(p)).join('')}
                        </div>
                        
                        ${hasMore && isGridActive ? `
                        <div class="show-more-container" data-collection="${col.id}">
                            <button class="show-more-btn" data-collection="${col.id}" data-loaded="${INITIAL_PRODUCTS}" data-total="${col.products.length}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                                <span>Mostrar Mais</span>
                            </button>
                        </div>
                        ` : ''}
                        
                        <!-- Carousel View -->
                        <div class="products-carousel collection-view-carousel" data-collection="${col.id}" style="display: ${isCarouselActive ? 'block' : 'none'};">
                            <button class="carousel-nav-btn carousel-prev" data-collection="${col.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <div class="carousel-track-container">
                                <div class="carousel-track" data-collection="${col.id}">
                                    ${col.products.map(p => renderProductCard(p)).join('')}
                                </div>
                            </div>
                            <button class="carousel-nav-btn carousel-next" data-collection="${col.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </section>
                `;
            }).join('');

            container.innerHTML = html;

            // Inicializar controles de carrossel
            initializeCollectionToggles();

        } else {
            // Fallback: Mostrar tudo em "Destaques" se não houver coleções configuradas
            console.log('⚠️ Nenhuma coleção configurada com produtos. Usando fallback DESTAQUES.');

            if (products.length === 0) {
                container.innerHTML = '<div class="text-center py-5"><p>Nenhum produto encontrado no momento.</p></div>';
                return;
            }

            const displayProducts = products.slice(0, 12);

            const html = `
                <section class="products-section collection-section animate-entry" data-collection-id="destaques">
                    <div class="container">
                        <div class="section-header">
                            <div>
                                <h2 class="section-title">DESTAQUES</h2>
                            </div>
                            ${products.length > 12 ? `
                                <a href="#produtos" class="btn btn-secondary">
                                    VER TODOS (${products.length})
                                </a>
                            ` : ''}
                        </div>
                        <div class="products-grid">
                            ${displayProducts.map(product => renderProductCard(product)).join('')}
                        </div>
                    </div>
                </section>
            `;
            container.innerHTML = html;
        }

        console.log('✅ Renderização concluída');

        // Hide loader when collections are rendered - com retry mechanism
        hidePageLoaderWithRetry();

    } catch (error) {
        console.error('❌❌❌ ERRO EM renderCollectionsSections:', error);
    }
}

// Initialize collection view toggles and carousel navigation
function initializeCollectionToggles() {
    // Toggle entre grid e carousel
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const view = this.dataset.view;
            const collectionId = this.dataset.collection;

            // Salvar preferência do usuário no localStorage
            localStorage.setItem(`collection_${collectionId}_view`, view);

            // Atualizar botões ativos
            const toggleContainer = this.parentElement;
            toggleContainer.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Toggle views
            const gridView = document.querySelector(`.collection-view-grid[data-collection="${collectionId}"]`);
            const carouselView = document.querySelector(`.collection-view-carousel[data-collection="${collectionId}"]`);

            if (view === 'grid') {
                gridView.style.display = 'grid';
                carouselView.style.display = 'none';
            } else {
                gridView.style.display = 'none';
                carouselView.style.display = 'block';
            }
        });
    });

    // Navegação do carrossel
    document.querySelectorAll('.carousel-prev, .carousel-next').forEach(btn => {
        btn.addEventListener('click', function () {
            const collectionId = this.dataset.collection;
            const track = document.querySelector(`.carousel-track[data-collection="${collectionId}"]`);
            const isPrev = this.classList.contains('carousel-prev');

            if (!track) return;

            const cardWidth = track.querySelector('.product-card').offsetWidth;
            const gap = 16; // spacing-md
            const scrollAmount = (cardWidth + gap) * 3; // Scroll 3 cards por vez

            const currentScroll = track.scrollLeft;
            const targetScroll = isPrev
                ? Math.max(0, currentScroll - scrollAmount)
                : Math.min(track.scrollWidth - track.offsetWidth, currentScroll + scrollAmount);

            track.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        });
    });

    // "Mostrar Mais" button functionality
    document.querySelectorAll('.show-more-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const collectionId = this.dataset.collection;
            const loaded = parseInt(this.dataset.loaded);
            const total = parseInt(this.dataset.total);
            const LOAD_MORE_COUNT = 10;

            // Encontrar a coleção nos dados
            const collection = collections.find(c => c.id == collectionId);
            if (!collection) return;

            // Calcular próximos produtos
            const nextBatch = collection.products.slice(loaded, loaded + LOAD_MORE_COUNT);
            const newLoaded = loaded + nextBatch.length;

            // Adicionar produtos ao grid
            const gridView = document.querySelector(`.collection-view-grid[data-collection="${collectionId}"]`);
            if (gridView) {
                const newCards = nextBatch.map(p => renderProductCard(p)).join('');
                gridView.insertAdjacentHTML('beforeend', newCards);
            }

            // Atualizar contador
            this.dataset.loaded = newLoaded;

            // Esconder botão se não houver mais produtos
            if (newLoaded >= total) {
                this.parentElement.style.display = 'none';
            }
        });
    });
}

// Helper para esconder page loader com retry (caso script não tenha carregado ainda)
function hidePageLoaderWithRetry(maxAttempts = 5, interval = 200) {
    let attempts = 0;

    const tryHide = () => {
        attempts++;

        if (window.hidePageLoader && typeof window.hidePageLoader === 'function') {
            console.log('🙈 Hiding page loader (tentativa ' + attempts + ')');
            window.hidePageLoader();
            return true;
        }

        if (attempts < maxAttempts) {
            console.log('⏳ Page loader não disponível, tentando novamente... (' + attempts + '/' + maxAttempts + ')');
            setTimeout(tryHide, interval);
        } else {
            console.warn('⚠️ Page loader não encontrado após ' + maxAttempts + ' tentativas');
            // Fallback: esconder manualmente se elemento existir
            const loader = document.getElementById('pageLoader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    document.body.classList.remove('loading');
                }, 300);
            }
        }
    };

    tryHide();
}

// Render single product card
function renderProductCard(product) {
    const price = parseFloat(product.price) || 0;
    const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
    const hasDiscount = originalPrice && originalPrice > price;
    const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    // Calcular parcelamento e PIX (Home)
    const installmentValue = (price / 3).toFixed(2).replace('.', ',');
    const pixDiscount = (price * 0.95).toFixed(2).replace('.', ',');

    // Sanitizar dados do produto para prevenir XSS
    const safeName = (product.name || '').replace(/[<>]/g, '');
    const safeDescription = (product.description || '').replace(/[<>]/g, '');
    const safeImageUrl = (product.image_url || '').replace(/[<>"']/g, '');
    const safeId = parseInt(product.id) || 0;

    return `
        <a href="product.html?id=${safeId}" class="product-card animate-entry" data-product-id="${safeId}">
            <div class="product-image-wrapper">
                ${hasDiscount && discountPercent > 0 ? `<span class="product-badge discount">-${discountPercent}%</span>` : ''}
                <div class="product-image">
                    ${product.image_url ?
            `<img src="${safeImageUrl}" alt="${safeName}" loading="lazy">` :
            '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; height: 100%;">📦</div>'
        }
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${safeName}</h3>
                <p class="product-description">${safeDescription}</p>
                <div class="product-price">
                    <span class="product-price-old">R$ ${(price * 1.6).toFixed(2).replace('.', ',')}</span>
                    <span>R$ ${price.toFixed(2).replace('.', ',')}</span>
                </div>
                
                <!-- Parcelamento e PIX (Home - sutil) -->
                <div class="product-installments-home" style="margin-top: 8px; font-size: 0.9em; color: var(--text-gray);">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; min-width: 16px; opacity: 0.8;">
                            <rect x="4" y="12" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="4"/>
                            <rect x="4" y="18" width="40" height="6" fill="currentColor" fill-opacity="0.3"/>
                            <rect x="8" y="28" width="12" height="4" rx="1" fill="currentColor"/>
                        </svg>
                        <span style="font-weight: 400;">3x R$ ${installmentValue} sem juros</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <img src="https://files.passeidireto.com/2889edc1-1a70-456a-a32c-e3f050102347/2889edc1-1a70-456a-a32c-e3f050102347.png" alt="PIX" style="width: 16px; height: 16px; object-fit: contain;">
                        <span style="color: #46d369; font-weight: 500;">R$ ${pixDiscount} no PIX</span>
                    </div>
                </div>

            </div>
        </a>
    `;
}

// Show all products (opcional - pode abrir página filtrada)
function showAllProducts(collectionSlug) {
    // Por enquanto, scroll para seção de todos os produtos
    const allProductsSection = document.getElementById('produtos');
    if (allProductsSection) {
        allProductsSection.style.display = 'block';
        allProductsSection.scrollIntoView({ behavior: 'smooth' });
        renderProducts(document.getElementById('productsGrid'));
    }
}

// Helper para categorizar produtos no frontend (já que o backend foi revertido)
function enrichProductsFrontend(products) {
    if (!products) return products;

    // Mapeamento de keywords para coleções
    const keywords = {
        'Camisetas': ['camiseta', 't-shirt', 'shirt', 'manga'],
        'Moletons & Hoodies': ['moletom', 'hoodie', 'casaco', 'jaqueta'],
        'Kids': ['infantil', 'kids', 'criança', 'bebe', 'baby'],
        'Hellfire Club': ['hellfire', 'club', 'eddie'],
        'Personagens': ['eleven', 'dustin', 'lucas', 'mike', 'will', 'hopper', 'joyce', 'max', 'demogorgon', 'vecna'],
        'Acessórios': ['boné', 'chapéu', 'meia', 'chaveiro', 'pin', 'colar', 'pulseira', 'mochila', 'bolsa', 'copo', 'garrafa', 'caneca', 'tênis']
    };

    return products.map(product => {
        let pCollections = product.collections || [];

        if (typeof pCollections === 'string') {
            try { pCollections = JSON.parse(pCollections); }
            catch { pCollections = [pCollections]; }
        }

        const lowerName = (product.name || '').toLowerCase();
        const lowerDesc = (product.description || '').toLowerCase();
        const lowerCat = (product.category || '').toLowerCase();

        for (const [collectionName, terms] of Object.entries(keywords)) {
            if (terms.some(term => lowerName.includes(term) || lowerDesc.includes(term) || lowerCat.includes(term))) {
                if (!pCollections.includes(collectionName)) {
                    pCollections.push(collectionName);
                }
            }
        }

        if (pCollections.length === 0) {
            pCollections.push('Camisetas'); // Fallback seguro
        }

        return { ...product, collections: pCollections };
    });
}

// Load products from API
async function loadProductsFromAPI() {
    const fullUrl = `${API_URL}/products`;

    console.log('🚀 INICIANDO CARREGAMENTO DE PRODUTOS');
    console.log('🌐 URL:', fullUrl);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            products = Array.isArray(data) ? data : [];
            // Enriquecer produtos com categorias no frontend
            products = enrichProductsFrontend(products);
            console.log(`✅ ${products.length} produtos carregados da API`);
            console.log('📦 Primeiro produto:', products[0]);

            // CARREGAR COLLECTIONS PRIMEIRO (para garantir ordem correta)
            console.log('📞 Carregando collections ANTES de renderizar...');
            await loadCollections();
            console.log('✅ Collections carregadas');

            // AGORA renderizar COM collections (ordem correta garantida)
            console.log('🎨 Renderizando produtos com ordem correta...');
            renderCollectionsSections();
            console.log('✅ Renderização concluída');

            console.log('📞 Chamando loadCartFromAPI()...');
            await loadCartFromAPI();
            console.log('✅ loadCartFromAPI() concluído');

            // Should be hidden by renderCollectionsSections, but ensure it here too
            if (window.hidePageLoader) window.hidePageLoader();

        } else {
            console.warn('⚠️ API retornou status não-ok:', response.status);
            products = [];
        }
    } catch (error) {
        console.error('❌ Erro ao conectar com API:', error.message);
        products = [];
    } finally {
        // Garantir renderização final apenas se ainda não foi renderizada (erro no carregamento)
        console.log('🔄 FINALLY: Verificando estado de renderização');
        console.log('📊 Total de produtos:', products.length);

        // Se não temos produtos, renderizar mensagem vazia
        if (products.length === 0) {
            console.log('⚠️ Nenhum produto - garantindo renderização de fallback');
            renderCollectionsSections();
        }

        // Garantir que loader seja escondido mesmo em caso de erro
        if (window.hidePageLoader) window.hidePageLoader();
    }
}

// Cart Management - usando variáveis do product-cart.js
// cart, sessionId e getCartHeaders já estão definidos em product-cart.js

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const continueShopping = document.getElementById('continueShopping');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mainNav = document.getElementById('mainNav');
const navLinks = document.querySelectorAll('.nav-link');

// Page Transition Effect
function initPageTransitions() {
    // Interceptar todos os links internos
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');

        // Apenas links internos (não externos, não âncoras, não javascript:)
        if (href &&
            !href.startsWith('http') &&
            !href.startsWith('//') &&
            !href.startsWith('#') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:')) {

            link.addEventListener('click', function (e) {
                // Não aplicar transição para links que abrem em nova aba
                if (link.target === '_blank' || e.ctrlKey || e.metaKey) {
                    return;
                }

                e.preventDefault();

                // Mostrar page loader antes de navegar
                if (window.showPageLoader) {
                    window.showPageLoader();
                }

                // Aplicar fade-out
                document.body.classList.add('fade-out');

                // Navegar após a transição
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            });
        }
    });

    // Fade-in quando a página carrega
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.3s ease-in-out';
        document.body.style.opacity = '1';
    }, 10);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar transições de página
    initPageTransitions();
    // NÃO renderizar produtos aqui - esperar loadProductsFromAPI() carregar primeiro
    // Os produtos serão renderizados automaticamente quando loadProductsFromAPI() terminar

    // Render featured products será feito depois que os produtos carregarem

    // Initialize cart UI
    updateCartUI();

    // Announcement bar
    const announcementBar = document.querySelector('.announcement-bar');
    const announcementClose = document.querySelector('.announcement-close');
    const header = document.querySelector('.header');
    const body = document.body;

    // Função para calcular altura real da announcement bar
    function getAnnouncementBarHeight() {
        if (!announcementBar || announcementBar.classList.contains('hidden')) {
            return 0;
        }
        return announcementBar.offsetHeight;
    }

    // Função para atualizar o estado da announcement bar
    function updateAnnouncementState() {
        if (!announcementBar || !header || !body) return;

        const announcementHeight = getAnnouncementBarHeight();

        if (announcementHeight > 0) {
            header.classList.add('has-announcement');
            body.classList.add('has-announcement');
            // Ajustar posição do header baseado na altura real
            header.style.top = `${announcementHeight}px`;
            // REMOVIDO: Não ajustar padding dinamicamente - CSS cuida disso
            // body.style.paddingTop = `${announcementHeight}px`;

            // REMOVIDO: Não ajustar hero banner dinamicamente
            // const heroBanner = document.querySelector('.hero-banner');
            // if (heroBanner) {
            //     heroBanner.style.paddingTop = `calc(var(--header-height-mobile) + ${announcementHeight}px + var(--spacing-2xl))`;
            // }
        } else {
            header.classList.remove('has-announcement');
            body.classList.remove('has-announcement');
            header.style.top = '0';
            // REMOVIDO: Não ajustar padding dinamicamente
            // body.style.paddingTop = '0';

            // REMOVIDO: Não resetar hero banner
            // const heroBanner = document.querySelector('.hero-banner');
            // if (heroBanner) {
            //     heroBanner.style.paddingTop = 'calc(var(--header-height-mobile) + var(--spacing-2xl))';
            // }
        }
    }

    if (announcementClose && announcementBar) {
        announcementClose.addEventListener('click', () => {
            announcementBar.classList.add('hidden');
            updateAnnouncementState();
        });
    }

    // Verificar estado inicial
    updateAnnouncementState();

    // Observar mudanças de tamanho da announcement bar
    if (announcementBar && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            updateAnnouncementState();
        });
        resizeObserver.observe(announcementBar);
    }

    // Search toggle - funcionalidade movida para search.js
    // Mantido apenas para compatibilidade, o search.js cuida de tudo

    // Filter toggle
    const filterToggle = document.getElementById('filterToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    const filtersClose = document.getElementById('filtersClose');

    if (filterToggle && filtersSidebar) {
        filterToggle.addEventListener('click', () => {
            filtersSidebar.classList.toggle('active');
        });
    }

    if (filtersClose && filtersSidebar) {
        filtersClose.addEventListener('click', () => {
            filtersSidebar.classList.remove('active');
        });
    }

    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input[type="email"]').value;
            showNotification(`Email ${email} cadastrado com sucesso! Você receberá 15% OFF na primeira compra.`, 'success');
            newsletterForm.reset();
        });
    }

    // Mobile Menu Toggle
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNavClose = document.getElementById('mobileNavClose');

    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.add('active');
            if (mobileNavOverlay) {
                mobileNavOverlay.classList.add('active');
            }
            document.body.classList.add('no-scroll');
        });
    }

    if (mobileNavClose && mainNav) {
        mobileNavClose.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    if (mobileNavOverlay && mainNav) {
        mobileNavOverlay.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    // Dropdown toggle for mobile
    const navItems = document.querySelectorAll('.nav-item.has-dropdown');
    navItems.forEach(item => {
        const link = item.querySelector('.nav-link');
        if (link) {
            link.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    item.classList.toggle('active');
                }
            });
        }
    });

    // Close mobile menu when clicking on nav link
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeMobileMenu();
                }
            });
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            mainNav && mainNav.classList.contains('active') &&
            !mainNav.contains(e.target) &&
            mobileMenuToggle && !mobileMenuToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });

    // Cart Drawer Controls
    if (cartBtn) {
        cartBtn.addEventListener('click', openCartDrawer);
    }

    if (closeCart) {
        closeCart.addEventListener('click', closeCartDrawer);
    }

    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCartDrawer);
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // Validar se há itens no carrinho
            if (!window.cart || window.cart.length === 0) {
                showNotification('Seu carrinho está vazio!', 'error');
                return;
            }

            // Fechar o drawer com animação
            if (cartDrawer) {
                cartDrawer.classList.add('closing');
            }
            if (cartOverlay) {
                cartOverlay.classList.add('closing');
            }

            // Aguardar animação do drawer e mostrar loading profissional
            setTimeout(() => {
                // Remover classes do drawer
                if (cartDrawer) {
                    cartDrawer.classList.remove('active', 'closing');
                }
                if (cartOverlay) {
                    cartOverlay.classList.remove('active', 'closing');
                }
                document.body.classList.remove('no-scroll');

                // Mostrar loading profissional
                const loadingHTML = `
                    <div id="checkoutLoadingOverlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,0,0,0.98) 100%); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease;">
                        <div style="text-align: center; padding: 2rem;">
                            <!-- Spinner animado -->
                            <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 2.5rem;">
                                <div style="position: absolute; width: 100%; height: 100%; border: 4px solid rgba(229,9,20,0.1); border-radius: 50%;"></div>
                                <div style="position: absolute; width: 100%; height: 100%; border: 4px solid transparent; border-top-color: #E50914; border-radius: 50%; animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;"></div>
                                <div style="position: absolute; width: 80%; height: 80%; top: 10%; left: 10%; border: 3px solid transparent; border-top-color: #FF1744; border-radius: 50%; animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse;"></div>
                                <div style="position: absolute; width: 60%; height: 60%; top: 20%; left: 20%; background: radial-gradient(circle, rgba(229,9,20,0.3) 0%, transparent 70%); border-radius: 50%; animation: pulse 2s ease-in-out infinite;"></div>
                            </div>
                            
                            <!-- Texto -->
                            <h2 style="font-family: 'Teko', sans-serif; font-size: 2.5rem; color: #E50914; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 1rem; text-shadow: 0 0 30px rgba(229,9,20,0.6), 0 0 60px rgba(229,9,20,0.4); animation: glow 2s ease-in-out infinite;">PROCESSANDO...</h2>
                            <p style="color: rgba(255,255,255,0.7); font-size: 1.1rem; letter-spacing: 1px;">Preparando seu checkout</p>
                            
                            <!-- Barra de progresso falsa -->
                            <div style="width: 200px; height: 3px; background: rgba(229,9,20,0.2); margin: 2rem auto 0; border-radius: 3px; overflow: hidden;">
                                <div style="width: 70%; height: 100%; background: linear-gradient(90deg, transparent, #E50914, transparent); animation: shimmer 1.5s infinite;"></div>
                            </div>
                        </div>
                        <style>
                            @keyframes fadeIn { 
                                from { opacity: 0; backdrop-filter: blur(0px); } 
                                to { opacity: 1; backdrop-filter: blur(10px); } 
                            }
                            @keyframes spin { 
                                to { transform: rotate(360deg); } 
                            }
                            @keyframes pulse {
                                0%, 100% { opacity: 0.5; transform: scale(1); }
                                50% { opacity: 1; transform: scale(1.1); }
                            }
                            @keyframes glow {
                                0%, 100% { text-shadow: 0 0 20px rgba(229,9,20,0.4), 0 0 40px rgba(229,9,20,0.2); }
                                50% { text-shadow: 0 0 30px rgba(229,9,20,0.8), 0 0 60px rgba(229,9,20,0.4), 0 0 90px rgba(229,9,20,0.2); }
                            }
                            @keyframes shimmer {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(300%); }
                            }
                        </style>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', loadingHTML);

                // Redirecionar após 1 segundo
                setTimeout(() => {
                    window.location.href = 'checkout.html';
                }, 1000);
            }, 300);
        });
    }

    if (continueShopping) {
        continueShopping.addEventListener('click', closeCartDrawer);
    }

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Prevent body scroll when drawer/menu is open
    const updateBodyScroll = () => {
        const isDrawerOpen = cartDrawer && cartDrawer.classList.contains('active');
        const isMenuOpen = mainNav && mainNav.classList.contains('active');

        if (isDrawerOpen || isMenuOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    };

    // Observe drawer and menu state
    if (cartDrawer && mainNav) {
        const observer = new MutationObserver(updateBodyScroll);
        observer.observe(cartDrawer, { attributes: true, attributeFilter: ['class'] });
        observer.observe(mainNav, { attributes: true, attributeFilter: ['class'] });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });

    // Load products from API on page load
    // Load products from API on page load - ONLY IF ON HOME OR PRODUCT PAGE
    // Collection page has its own loader
    const isCollectionPage = window.location.pathname.includes('collection');
    console.log('📍 Current Path:', window.location.pathname, '| isCollectionPage:', isCollectionPage);

    if (!isCollectionPage) {
        loadProductsFromAPI();
    } else {
        console.log('ℹ️ script.js: Skipping loadProductsFromAPI on collection page.');
    }
    updateCartUI();
});

// Mobile Menu Functions
function toggleMobileMenu() {
    if (mainNav) {
        const isActive = mainNav.classList.toggle('active');
        const mobileNavOverlay = document.getElementById('mobileNavOverlay');

        if (mobileMenuToggle) {
            mobileMenuToggle.classList.toggle('active');
        }

        if (mobileNavOverlay) {
            if (isActive) {
                mobileNavOverlay.classList.add('active');
                document.body.classList.add('no-scroll');
            } else {
                mobileNavOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        }
    }
}

function closeMobileMenu() {
    if (mainNav) {
        mainNav.classList.remove('active');
        const mobileNavOverlay = document.getElementById('mobileNavOverlay');
        if (mobileNavOverlay) {
            mobileNavOverlay.classList.remove('active');
        }
        if (mobileMenuToggle) {
            mobileMenuToggle.classList.remove('active');
        }
        document.body.classList.remove('no-scroll');
    }
}

// Cart Drawer Functions
function openCartDrawer() {
    if (cartDrawer) {
        cartDrawer.classList.add('active');
        if (cartOverlay) {
            cartOverlay.classList.add('active');
        }
        document.body.classList.add('no-scroll');
    }
}

function closeCartDrawer() {
    if (cartDrawer) {
        cartDrawer.classList.remove('active');
        if (cartOverlay) {
            cartOverlay.classList.remove('active');
        }
        document.body.classList.remove('no-scroll');
    }
}

// Render Products
function renderProducts(container = productsGrid, limit = null) {
    if (!container) {
        console.warn('⚠️ renderProducts: container não fornecido');
        return;
    }

    if (!products || products.length === 0) {
        console.warn('⚠️ renderProducts: nenhum produto disponível');
        container.innerHTML = '<p class="no-products">Nenhum produto disponível no momento.</p>';
        return;
    }

    const productsToRender = limit ? products.slice(0, limit) : products;
    console.log(`🎨 Renderizando ${productsToRender.length} produtos no container:`, container.id || 'sem id');

    container.innerHTML = productsToRender.map(product => {
        // Converter preços para números (PostgreSQL retorna DECIMAL como string)
        const price = parseFloat(product.price) || 0;
        const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
        const hasDiscount = originalPrice && originalPrice > price;
        const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

        return `
        <a href="product.html?id=${product.id}" class="product-card" data-product-id="${product.id}" data-preload="true">
            <div class="product-image-wrapper">
                ${hasDiscount && discountPercent > 0 ? `<span class="product-badge discount">-${discountPercent}%</span>` : ''}
                <div class="product-image">
                    ${product.image_url ?
                `<img src="${product.image_url}" alt="${product.name}">` :
                '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; height: 100%;">👕</div>'
            }
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-price">
                    <span class="product-price-old">R$ ${(price * 1.6).toFixed(2).replace('.', ',')}</span>
                    <span>R$ ${price.toFixed(2).replace('.', ',')}</span>
                </div>
                <button class="add-to-cart" onclick="event.preventDefault(); addToCart(${product.id});">
                    ADICIONAR AO CARRINHO
                </button>
            </div>
        </a>
        `;
    }).join('');
}

// Helper to get cart headers
window.getCartHeaders = function () {
    const headers = { 'Content-Type': 'application/json' };
    const sessionId = sessionStorage.getItem('analytics_session_id');
    if (sessionId) headers['X-Session-ID'] = sessionId;
    return headers;
};

// Load Cart from API
async function loadCartFromAPI() {
    try {
        const response = await fetch(`${API_URL}/cart?session_id=${window.sessionId}`, {
            headers: window.getCartHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            window.cart = data.items || [];
            updateCartUI();
        }
    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
    }
}

// Add to Cart
async function addToCart(productId, quantity = 1, selectedVariant = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: window.getCartHeaders(),
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity,
                selected_variant: selectedVariant,
                price: product.price,
                session_id: window.sessionId
            })
        });

        const data = await response.json();

        if (response.ok) {
            await loadCartFromAPI();
            showNotification(`${product.name} adicionado à sacola!`);

            // Meta Pixel: Track AddToCart event
            if (typeof window.metaPixel !== 'undefined') {
                window.metaPixel.trackAddToCart({
                    id: productId,
                    product_id: productId,
                    name: product.name,
                    price: product.price,
                    quantity: quantity
                });
            }

            openCartDrawer();
        } else {
            showNotification(data.error || 'Erro ao adicionar produto', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao conectar com o servidor', 'error');
    }
}

// Remove from Cart
async function removeFromCart(cartItemId) {
    try {
        const response = await fetch(`${API_URL}/cart/remove/${cartItemId}`, {
            method: 'DELETE',
            headers: window.getCartHeaders()
        });

        if (response.ok) {
            await loadCartFromAPI();
            if ((window.cart || []).length === 0) {
                closeCartDrawer();
            }
        } else {
            showNotification('Erro ao remover item', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao remover item', 'error');
    }
}

// Update Quantity
async function updateQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
        await removeFromCart(cartItemId);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cart/update/${cartItemId}`, {
            method: 'PUT',
            headers: window.getCartHeaders(),
            body: JSON.stringify({ quantity: quantity, session_id: window.sessionId })
        });

        if (response.ok) {
            await loadCartFromAPI();
        } else {
            showNotification('Erro ao atualizar quantidade', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao atualizar quantidade', 'error');
    }
}

// Update Cart UI
function updateCartUI() {
    const cart = window.cart || [];
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
        cartCountEl.textContent = totalItems;
        cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);

    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) {
        cartTotalEl.textContent = total.toFixed(2).replace('.', ',');
    }

    const cartItemsEl = document.getElementById('cartItems');
    if (cartItemsEl) {
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 64px; height: 64px; stroke: var(--text-gray); opacity: 0.5;">
                            <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="empty-cart-text">Sua sacola está vazia</div>
                    <a href="index.html#produtos" class="btn btn-primary" onclick="closeCartDrawer()">VER PRODUTOS</a>
                </div>
            `;
        } else {
            cartItems.innerHTML = cart.map(item => {
                // Sanitizar dados do item do carrinho para prevenir XSS
                const safeName = (item.name || '').replace(/[<>]/g, '');
                const safeImageUrl = (item.image_url || '').replace(/[<>"']/g, '');
                const safeId = parseInt(item.id) || 0;
                const quantity = parseInt(item.quantity) || 1;
                const price = parseFloat(item.price) || 0;

                return `
                <div class="cart-item" data-cart-item-id="${safeId}">
                    <div class="cart-item-image">
                        ${item.image_url ?
                        `<img src="${safeImageUrl}" alt="${safeName}">` :
                        '<div style="font-size: 2rem;">👕</div>'
                    }
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${safeName}</div>
                        <div class="cart-item-price">R$ ${(price * quantity).toFixed(2).replace('.', ',')}</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn quantity-decrease" data-item-id="${safeId}" data-quantity="${quantity - 1}" aria-label="Diminuir quantidade">-</button>
                            <span class="quantity-value">${quantity}x</span>
                            <button class="quantity-btn quantity-increase" data-item-id="${safeId}" data-quantity="${quantity + 1}" aria-label="Aumentar quantidade">+</button>
                        </div>
                        <button class="remove-item" data-item-id="${safeId}">REMOVER</button>
                    </div>
                </div>
                `;
            }).join('');

            // Event delegation para botões do carrinho
            setupCartEventDelegation();
        }
    }
}

// Setup event delegation para botões do carrinho (evita inline onclick)
function setupCartEventDelegation() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;

    // Remover listener anterior se existir
    if (cartItemsContainer._hasCartListener) return;
    cartItemsContainer._hasCartListener = true;

    cartItemsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const itemId = parseInt(target.dataset.itemId);
        if (!itemId) return;

        // Botão de diminuir quantidade
        if (target.classList.contains('quantity-decrease')) {
            const quantity = parseInt(target.dataset.quantity);
            updateQuantity(itemId, quantity);
        }

        // Botão de aumentar quantidade
        if (target.classList.contains('quantity-increase')) {
            const quantity = parseInt(target.dataset.quantity);
            updateQuantity(itemId, quantity);
        }

        // Botão de remover
        if (target.classList.contains('remove-item')) {
            removeFromCart(itemId);
        }
    });
}

// Checkout
async function handleCheckout() {
    const cart = window.cart || [];
    if (cart.length === 0) {
        showNotification('Sua sacola está vazia!', 'error');
        return;
    }

    const customerName = prompt('Digite seu nome:');
    if (!customerName) return;

    const customerEmail = prompt('Digite seu email:');
    if (!customerEmail) return;

    const customerPhone = prompt('Digite seu telefone (opcional):') || '';

    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const items = cart.map(item => ({
        product_id: item.product_id || item.id,
        quantity: item.quantity || 1,
        price: item.price || 0
    }));

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                items: items,
                total: total
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Pedido realizado com sucesso! Aguarde nosso contato.', 'success');
            // Limpar carrinho no backend
            await fetch(`${API_URL}/cart/clear`, {
                method: 'DELETE',
                headers: getCartHeaders()
            });
            await loadCartFromAPI();
            closeCartDrawer();
        } else {
            showNotification(data.error || 'Erro ao realizar pedido', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao conectar com o servidor', 'error');
    }
}

// Notification
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 16px;
        background: var(--dark-gray);
        border: 2px solid var(--netflix-red);
        color: var(--text-white);
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: var(--neon-glow);
        z-index: 3000;
        font-family: var(--font-teko);
        font-size: 14px;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations for notifications
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        .notification-error {
            border-color: var(--deep-red) !important;
        }
        .notification-success {
            border-color: var(--netflix-red) !important;
        }
    `;
    document.head.appendChild(style);
}

// Load related products on product page
if (document.getElementById('relatedProducts')) {
    const relatedContainer = document.getElementById('relatedProducts');
    const urlParams = new URLSearchParams(window.location.search);
    const currentProductId = parseInt(urlParams.get('id')) || 1;
    const relatedProducts = products.filter(p => p.id !== currentProductId).slice(0, 4);

    relatedContainer.innerHTML = relatedProducts.map(product => `
        <a href="product.html?id=${product.id}" class="product-card">
            <div class="product-image">
                ${product.emoji}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">R$ ${parseFloat(product.price || 0).toFixed(2).replace('.', ',')}</p>
                <button class="add-to-cart" onclick="event.preventDefault(); addToCart(${product.id});">
                    ADICIONAR AO CARRINHO
                </button>
            </div>
        </a>
    `).join('');
}

// Make functions globally available
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.closeCartDrawer = closeCartDrawer;
window.products = products;

// --- Hero Slider Logic ---
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('sliderDots');
let slideInterval;

function initSlider() {
    if (!slides.length) return;

    // Create dots
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `slider-dot ${index === 0 ? 'active' : ''}`;
            dot.onclick = () => goToSlide(index);
            dotsContainer.appendChild(dot);
        });
    }

    // Start auto slide
    startSlideTimer();
}

function updateSlider() {
    slides.forEach(slide => slide.classList.remove('active'));
    slides[currentSlide].classList.add('active');

    const dots = document.querySelectorAll('.slider-dot');
    if (dots.length) {
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentSlide].classList.add('active');
    }
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateSlider();
    resetSlideTimer();
}

function previousSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateSlider();
    resetSlideTimer();
}

function goToSlide(index) {
    currentSlide = index;
    updateSlider();
    resetSlideTimer();
}

function startSlideTimer() {
    stopSlideTimer();
    slideInterval = setInterval(nextSlide, 5000);
}

function stopSlideTimer() {
    if (slideInterval) clearInterval(slideInterval);
}

function resetSlideTimer() {
    stopSlideTimer();
    startSlideTimer();
}

// Initialize slider when DOM is loaded
document.addEventListener('DOMContentLoaded', initSlider);

// Make slider functions global
window.nextSlide = nextSlide;
window.previousSlide = previousSlide;
window.goToSlide = goToSlide;

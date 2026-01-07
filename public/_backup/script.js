// API Base URL - usar window para evitar conflitos com outros scripts
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.origin;
    window.API_URL = `${window.API_BASE}/api`;
}
const API_BASE = window.API_BASE;
const API_URL = window.API_URL;

// Products Data (loaded from API)
let products = [];
let collections = [];

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
    try {
        const response = await fetch(`${API_URL}/collections`);
        if (response.ok) {
            collections = await response.json();
            console.log(`✅ ${collections.length} coleções carregadas`);
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
        collections = [];
    }
}

// Render collections with products
async function renderCollectionsSections() {
    const container = document.getElementById('collectionsContainer');
    
    console.log('🎨 renderCollectionsSections chamada');
    console.log('   Container:', container ? 'OK' : 'NÃO ENCONTRADO');
    console.log('   Collections:', collections.length);
    console.log('   Products:', products.length);
    
    if (!container) {
        console.error('❌ Container #collectionsContainer não encontrado!');
        return;
    }
    
    if (collections.length === 0) {
        console.warn('⚠️ Nenhuma coleção carregada');
        return;
    }
    
    if (products.length === 0) {
        console.warn('⚠️ Nenhum produto carregado');
        return;
    }
    
    let html = '';
    let sectionsCreated = 0;
    
    collections.forEach(collection => {
        // Filtrar produtos desta coleção
        const collectionProducts = products.filter(p => 
            p.collections && p.collections.includes(collection.name)
        );
        
        console.log(`   📦 ${collection.name}: ${collectionProducts.length} produtos`);
        
        if (collectionProducts.length === 0) return;
        
        // Limitar a 8 produtos por coleção na home
        const displayProducts = collectionProducts.slice(0, 8);
        sectionsCreated++;
        
        html += `
            <section class="products-section collection-section" data-collection-id="${collection.id}">
                <div class="container">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">${collection.name.toUpperCase()}</h2>
                            <p class="section-subtitle">${collection.description}</p>
                        </div>
                        ${collectionProducts.length > 8 ? `
                            <a href="#" class="btn btn-secondary" onclick="event.preventDefault(); showAllProducts('${collection.slug}')">
                                VER TODOS (${collectionProducts.length})
                            </a>
                        ` : ''}
                    </div>
                    <div class="products-grid">
                        ${displayProducts.map(product => renderProductCard(product)).join('')}
                    </div>
                </div>
            </section>
        `;
    });
    
    container.innerHTML = html;
    console.log(`✅ ${sectionsCreated} seções de coleções renderizadas`);
}

// Render single product card
function renderProductCard(product) {
    const price = parseFloat(product.price) || 0;
    const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
    const hasDiscount = originalPrice && originalPrice > price;
    const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    
    return `
        <a href="product.html?id=${product.id}" class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper">
                ${hasDiscount && discountPercent > 0 ? `<span class="product-badge discount">-${discountPercent}%</span>` : ''}
                <div class="product-image">
                    ${product.image_url ? 
                        `<img src="${product.image_url}" alt="${product.name}" loading="lazy">` : 
                        '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; height: 100%;">📦</div>'
                    }
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-price">
                    ${hasDiscount ? `<span class="product-price-old">R$ ${originalPrice.toFixed(2).replace('.', ',')}</span>` : ''}
                    <span>R$ ${price.toFixed(2).replace('.', ',')}</span>
                </div>
                <button class="add-to-cart" onclick="event.preventDefault(); addToCart(${product.id});">
                    ADICIONAR AO CARRINHO
                </button>
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

// Load products from API
async function loadProductsFromAPI() {
    const fullUrl = `${API_URL}/products`;
    
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
            console.log(`✅ ${products.length} produtos carregados`);
            
            // Carregar coleções e renderizar seções
            await loadCollections();
            renderCollectionsSections();
            
        } else {
            products = [];
        }
    } catch (error) {
        console.error('Erro ao conectar com API:', error.message);
        products = [];
    }
}

// Cart Management
let cart = [];
let sessionId = localStorage.getItem('cart_session_id') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
if (!localStorage.getItem('cart_session_id')) {
    localStorage.setItem('cart_session_id', sessionId);
}

// Função auxiliar para headers com session ID
function getCartHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
    };
}

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
            
            link.addEventListener('click', function(e) {
                // Não aplicar transição para links que abrem em nova aba
                if (link.target === '_blank' || e.ctrlKey || e.metaKey) {
                    return;
                }
                
                e.preventDefault();
                
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

    // Account toggle (placeholder)
    const accountToggle = document.getElementById('accountToggle');
    if (accountToggle) {
        accountToggle.addEventListener('click', () => {
            alert('Área de conta em desenvolvimento');
        });
    }

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
            window.location.href = 'checkout.html';
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
    loadProductsFromAPI();
    updateCartUI();
});

// Mobile Menu Functions
function toggleMobileMenu() {
    if (mainNav) {
        mainNav.classList.toggle('active');
        if (mobileMenuToggle) {
            mobileMenuToggle.classList.toggle('active');
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
                    ${hasDiscount ? `<span class="product-price-old">R$ ${originalPrice.toFixed(2).replace('.', ',')}</span>` : ''}
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

// Load Cart from API
async function loadCartFromAPI() {
    try {
        const response = await fetch(`${API_URL}/cart?session_id=${sessionId}`, {
            headers: getCartHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            cart = data.items || [];
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
            headers: getCartHeaders(),
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity,
                selected_variant: selectedVariant,
                price: product.price,
                session_id: sessionId
            })
        });

        const data = await response.json();

        if (response.ok) {
            await loadCartFromAPI();
            showNotification(`${product.name} adicionado à sacola!`);
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
            headers: getCartHeaders()
        });

        if (response.ok) {
            await loadCartFromAPI();
            if (cart.length === 0) {
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
            headers: getCartHeaders(),
            body: JSON.stringify({ quantity: quantity, session_id: sessionId })
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
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    if (cartTotal) {
        cartTotal.textContent = total.toFixed(2).replace('.', ',');
    }

    if (cartItems) {
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
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        ${item.image_url ? 
                            `<img src="${item.image_url}" alt="${item.name}">` : 
                            '<div style="font-size: 2rem;">👕</div>'
                        }
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">R$ ${((item.price || 0) * (item.quantity || 1)).toFixed(2).replace('.', ',')}</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${(item.quantity || 1) - 1})" aria-label="Diminuir quantidade">-</button>
                            <span class="quantity-value">${item.quantity || 1}x</span>
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${(item.quantity || 1) + 1})" aria-label="Aumentar quantidade">+</button>
                        </div>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">REMOVER</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Checkout
async function handleCheckout() {
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

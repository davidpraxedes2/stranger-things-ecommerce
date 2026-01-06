// Cart functionality for product page
// Use API_BASE and API_URL from product-page.js if available, otherwise declare them
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.origin;
    window.API_URL = `${window.API_BASE}/api`;
}
const API_BASE = window.API_BASE;
const API_URL = window.API_URL;

let sessionId = localStorage.getItem('cart_session_id') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
if (!localStorage.getItem('cart_session_id')) {
    localStorage.setItem('cart_session_id', sessionId);
}

function getCartHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
    };
}

let cart = [];

// Load cart from API
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

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Update cart total
    const total = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    if (cartTotal) {
        cartTotal.textContent = total.toFixed(2).replace('.', ',');
    }

    // Render cart items
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
                            `<img src="${item.image_url}" alt="${item.name || 'Produto'}">` : 
                            '<div style="font-size: 2rem;">👕</div>'
                        }
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name || 'Produto'}</div>
                        <div class="cart-item-price">R$ ${((item.price || 0) * (item.quantity || 1)).toFixed(2).replace('.', ',')}</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${(item.quantity || 1) - 1})" aria-label="Diminuir quantidade">-</button>
                            <span class="quantity-value">${item.quantity || 1}x</span>
                            <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${(item.quantity || 1) + 1})" aria-label="Aumentar quantidade">+</button>
                        </div>
                        <button class="remove-item" onclick="removeCartItem(${item.id})">REMOVER</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Open cart drawer
function openCartDrawer() {
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartDrawer) {
        cartDrawer.classList.add('active');
        if (cartOverlay) cartOverlay.classList.add('active');
        document.body.classList.add('no-scroll');
    }
}

// Close cart drawer
function closeCartDrawer() {
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartDrawer) {
        cartDrawer.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

// Update quantity
async function updateCartQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
        await removeCartItem(cartItemId);
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
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Remove item
async function removeCartItem(cartItemId) {
    try {
        const response = await fetch(`${API_URL}/cart/remove/${cartItemId}`, {
            method: 'DELETE',
            headers: getCartHeaders()
        });

        if (response.ok) {
            await loadCartFromAPI();
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Make functions globally available
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.updateCartQuantity = updateCartQuantity;
window.removeCartItem = removeCartItem;
window.loadCartFromAPI = loadCartFromAPI;

// Mobile menu controls
document.addEventListener('DOMContentLoaded', () => {
    loadCartFromAPI();

    // Cart drawer controls
    const cartBtn = document.getElementById('cartBtn');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const continueShopping = document.getElementById('continueShopping');

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

    // Mobile menu
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');

    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.add('active');
            if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
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

    function closeMobileMenu() {
        if (mainNav) {
            mainNav.classList.remove('active');
            if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    }
});


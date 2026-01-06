// Product Page Script
// Expose API_BASE and API_URL on window for use in other scripts
window.API_BASE = window.location.origin;
window.API_URL = `${window.API_BASE}/api`;
const API_BASE = window.API_BASE;
const API_URL = window.API_URL;

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = parseInt(urlParams.get('id')) || null;

let currentProduct = null;
let currentQuantity = 1;
let selectedImages = [];
let currentImageIndex = 0;
let selectedVariant = null;
let availableVariants = [];

// Session ID for cart (same as main script)
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

// Make loadCartFromAPI available globally for product-page
window.reloadCart = function() {
    if (typeof loadCartFromAPI === 'function') {
        loadCartFromAPI();
    }
};

// Load product data
async function loadProduct() {
    if (!productId) {
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = 'Produto não encontrado';
        const loadingEl = document.getElementById('productLoading');
        if (loadingEl) loadingEl.style.display = 'none';
        const infoContainer = document.getElementById('productInfoContainer');
        if (infoContainer) infoContainer.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            currentProduct = product;
            renderProduct(product);
        } else {
            const titleEl = document.getElementById('productTitle');
            if (titleEl) titleEl.textContent = 'Produto não encontrado';
            const loadingEl = document.getElementById('productLoading');
            if (loadingEl) loadingEl.style.display = 'none';
            const infoContainer = document.getElementById('productInfoContainer');
            if (infoContainer) infoContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = 'Erro ao carregar produto';
        const loadingEl = document.getElementById('productLoading');
        if (loadingEl) loadingEl.style.display = 'none';
        const infoContainer = document.getElementById('productInfoContainer');
        if (infoContainer) infoContainer.style.display = 'block';
    }
}

// Render product
function renderProduct(product) {
    // Hide loading and show containers when data loads
    const loadingEl = document.getElementById('productLoading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    const imagesContainer = document.getElementById('productImagesContainer');
    const infoContainer = document.getElementById('productInfoContainer');
    if (imagesContainer) imagesContainer.style.display = 'flex';
    if (infoContainer) infoContainer.style.display = 'block';
    
    // Set title
    const titleEl = document.getElementById('productTitle');
    if (titleEl) {
        titleEl.textContent = product.name || 'Produto';
    }

    // Set price - convert to number (PostgreSQL returns DECIMAL as string)
    const priceEl = document.getElementById('productPrice');
    if (priceEl) {
        const price = parseFloat(product.price) || 0;
        const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
        const hasDiscount = originalPrice && originalPrice > price;
        
        if (hasDiscount) {
            priceEl.innerHTML = `
                <span class="product-price-old" style="font-size: 1.5rem; text-decoration: line-through; color: var(--text-light-gray); margin-right: 0.5rem;">
                    R$ ${originalPrice.toFixed(2).replace('.', ',')}
                </span>
                <span>R$ ${price.toFixed(2).replace('.', ',')}</span>
            `;
        } else {
            priceEl.textContent = `R$ ${price.toFixed(2).replace('.', ',')}`;
        }
    }

    // Set description
    const descEl = document.getElementById('productDescription');
    if (descEl) {
        descEl.innerHTML = `<p>${(product.description || 'Produto de alta qualidade.').replace(/\n/g, '</p><p>')}</p>`;
    }

    // Set images
    let images = [];
    if (product.images_json) {
        try {
            images = JSON.parse(product.images_json);
        } catch (e) {
            images = [];
        }
    }
    
    // Add main image if available
    if (product.image_url) {
        images.unshift(product.image_url);
    }
    
    // Use images array if available (from API)
    if (product.images && Array.isArray(product.images)) {
        images = product.images;
    }
    
    // Remove duplicates
    images = [...new Set(images)];
    
    if (images.length === 0) {
        images = ['👕']; // Fallback
    }

    selectedImages = images;
    renderImages(images);

    // Set up variants (default sizes if no variants in product)
    setupVariants(product);

    // Load related products
    loadRelatedProducts();
}

// Setup variants
function setupVariants(product) {
    // Convert price to number (PostgreSQL returns DECIMAL as string)
    const productPrice = parseFloat(product.price) || 0;
    // Default variants (tamanhos)
    const defaultVariants = [
        { id: 'P', name: 'P', price: productPrice, available: true },
        { id: 'M', name: 'M', price: productPrice, available: true },
        { id: 'G', name: 'G', price: productPrice, available: true },
        { id: 'GG', name: 'GG', price: productPrice, available: true },
        { id: 'XG', name: 'XG', price: productPrice, available: true }
    ];

    availableVariants = defaultVariants;
    selectedVariant = defaultVariants[1]; // Default: M

    renderVariants();
}

// Render variants
function renderVariants() {
    const variantSelector = document.getElementById('variantSelector');
    const variantOptions = document.getElementById('variantOptions');

    if (!variantSelector || !variantOptions) return;

    if (availableVariants.length === 0) {
        variantSelector.style.display = 'none';
        return;
    }

    variantSelector.style.display = 'block';

    variantOptions.innerHTML = availableVariants.map(variant => `
        <button 
            class="variant-option ${variant.id === selectedVariant?.id ? 'selected' : ''} ${!variant.available ? 'disabled' : ''}"
            data-variant-id="${variant.id}"
            ${!variant.available ? 'disabled' : ''}
        >
            ${variant.name}
        </button>
    `).join('');

    // Add click handlers
    variantOptions.querySelectorAll('.variant-option:not(.disabled)').forEach(option => {
        option.addEventListener('click', () => {
            const variantId = option.getAttribute('data-variant-id');
            const variant = availableVariants.find(v => v.id === variantId);
            if (variant) {
                selectedVariant = variant;
                renderVariants(); // Re-render to update selected state
            }
        });
    });
}

// Render images
function renderImages(images) {
    const mainImageEl = document.getElementById('mainImage');
    const thumbnailsEl = document.getElementById('thumbnails');

    if (!mainImageEl || images.length === 0) return;

    // Set main image
    if (typeof images[0] === 'string' && images[0].startsWith('http')) {
        mainImageEl.innerHTML = `<img src="${images[0]}" alt="${currentProduct?.name || 'Produto'}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        mainImageEl.textContent = images[0];
    }

    // Render thumbnails
    if (thumbnailsEl && images.length > 1) {
        thumbnailsEl.innerHTML = images.map((img, index) => {
            if (typeof img === 'string' && img.startsWith('http')) {
                return `
                    <div class="product-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img src="${img}" alt="Thumbnail ${index + 1}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                    </div>
                `;
            } else {
                return `
                    <div class="product-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                        ${img}
                    </div>
                `;
            }
        }).join('');

        // Add click handlers
        document.querySelectorAll('.product-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.getAttribute('data-index'));
                changeImage(index);
            });
        });
    } else if (thumbnailsEl) {
        thumbnailsEl.innerHTML = '';
    }
}

// Change main image
function changeImage(index) {
    if (index < 0 || index >= selectedImages.length) return;

    currentImageIndex = index;
    const mainImageEl = document.getElementById('mainImage');
    if (!mainImageEl) return;
    
    const img = selectedImages[index];

    if (typeof img === 'string' && img.startsWith('http')) {
        mainImageEl.innerHTML = `<img src="${img}" alt="${currentProduct?.name || 'Produto'}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        mainImageEl.textContent = img;
    }

    // Update active thumbnail
    document.querySelectorAll('.product-thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// Quantity controls and page initialization
document.addEventListener('DOMContentLoaded', () => {
    const increaseQty = document.getElementById('increaseQty');
    const decreaseQty = document.getElementById('decreaseQty');
    const quantityValue = document.getElementById('quantityValue');
    const addToCartBtn = document.getElementById('addToCartBtn');

    if (increaseQty) {
        increaseQty.addEventListener('click', () => {
            currentQuantity++;
            if (quantityValue) quantityValue.textContent = currentQuantity;
        });
    }

    if (decreaseQty) {
        decreaseQty.addEventListener('click', () => {
            if (currentQuantity > 1) {
                currentQuantity--;
                if (quantityValue) quantityValue.textContent = currentQuantity;
            }
        });
    }

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async () => {
            if (!currentProduct) return;

            // Check if variant is selected
            if (availableVariants.length > 0 && !selectedVariant) {
                showNotification('Por favor, selecione um tamanho', 'error');
                return;
            }

            try {
                const variantInfo = selectedVariant ? `${selectedVariant.name}` : null;
                const productPrice = parseFloat(currentProduct.price) || 0;
                const price = selectedVariant?.price || productPrice;

                const response = await fetch(`${API_URL}/cart/add`, {
                    method: 'POST',
                    headers: getCartHeaders(),
                    body: JSON.stringify({
                        product_id: currentProduct.id,
                        quantity: currentQuantity,
                        selected_variant: variantInfo,
                        price: price,
                        session_id: sessionId
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
                    showNotification(`${currentProduct.name}${variantText} adicionado à sacola!`, 'success');
                    
                    // Update cart in cart drawer if open
                    if (typeof window.reloadCart === 'function') {
                        window.reloadCart();
                    }
                    
                    // Reset quantity
                    currentQuantity = 1;
                    if (quantityValue) quantityValue.textContent = '1';
                } else {
                    showNotification(data.error || 'Erro ao adicionar produto', 'error');
                }
            } catch (error) {
                console.error('Erro:', error);
                showNotification('Erro ao conectar com o servidor', 'error');
            }
        });
    }

    // Load product on page load
    loadProduct();
});

// Load related products
async function loadRelatedProducts() {
    try {
        const response = await fetch(`${API_URL}/products?limit=4`);
        if (response.ok) {
            const products = await response.json();
            const relatedContainer = document.getElementById('relatedProducts');
            if (relatedContainer && products.length > 0) {
                // Filter out current product
                const filtered = products.filter(p => p.id !== currentProduct?.id).slice(0, 4);
                renderRelatedProducts(filtered, relatedContainer);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar produtos relacionados:', error);
    }
}

// Render related products
function renderRelatedProducts(products, container) {
    container.innerHTML = products.map(product => {
        // Convert prices to numbers (PostgreSQL returns DECIMAL as string)
        const price = parseFloat(product.price) || 0;
        const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
        const hasDiscount = originalPrice && originalPrice > price;
        const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
        
        return `
        <a href="product.html?id=${product.id}" class="product-card">
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
                <p class="product-description">${(product.description || '').substring(0, 60)}...</p>
                <div class="product-price">
                    ${hasDiscount && originalPrice ? `<span class="product-price-old">R$ ${originalPrice.toFixed(2).replace('.', ',')}</span>` : ''}
                    <span>R$ ${price.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        </a>
        `;
    }).join('');
}

// Notification function
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

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
        z-index: 3000;
        font-family: var(--font-teko);
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

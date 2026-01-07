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
window.reloadCart = function () {
    if (typeof window.loadCartFromAPI === 'function') {
        window.loadCartFromAPI();
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

// Generate installments table
function generateInstallmentsTable(price) {
    const accordion = document.getElementById('installmentsAccordion');
    const tableBody = document.getElementById('installmentsTableBody');
    const toggle = document.getElementById('installmentsToggle');


    if (!accordion || !tableBody || !toggle) return;

    // Configuração: até 12x, sem juros até 3x, juros de 2.5% ao mês após
    const maxInstallments = 12;
    const noInterestLimit = 3;
    const monthlyRate = 0.025; // 2.5% ao mês

    let tableHTML = '';

    for (let i = 1; i <= maxInstallments; i++) {
        let installmentValue;
        let totalValue;
        let interestLabel;

        if (i <= noInterestLimit) {
            // Sem juros
            installmentValue = price / i;
            totalValue = price;
            interestLabel = '<span class="no-interest">sem juros</span>';
        } else {
            // Com juros compostos
            const rate = monthlyRate;
            totalValue = price * Math.pow(1 + rate, i);
            installmentValue = totalValue / i;
            interestLabel = '<span class="with-interest">com juros</span>';
        }

        tableHTML += `
            <tr>
                <td class="installment-count">${i}x ${interestLabel}</td>
                <td class="installment-value">R$ ${installmentValue.toFixed(2).replace('.', ',')}</td>
                <td class="installment-total">R$ ${totalValue.toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
    }

    tableBody.innerHTML = tableHTML;
    accordion.style.display = 'block';

    // Toggle accordion
    toggle.addEventListener('click', () => {
        accordion.classList.toggle('expanded');
    });
}

// Render product
function renderProduct(product) {
    // Hide loading and show containers when data loads
    const loadingEl = document.getElementById('productLoading');
    if (loadingEl) {
        loadingEl.style.display = 'none';

        // Also ensure skeleton classes are removed just in case
        loadingEl.classList.remove('skeleton');
    }

    const imagesContainer = document.getElementById('productImagesContainer');
    const infoContainer = document.getElementById('productInfoContainer');
    if (imagesContainer) imagesContainer.style.display = 'flex';
    if (infoContainer) infoContainer.style.display = 'block';

    // Set title
    const titleEl = document.getElementById('productTitle');
    if (titleEl) {
        titleEl.classList.remove('skeleton-text');
        titleEl.style.width = 'auto'; // Reset width
        titleEl.style.height = 'auto'; // Reset height
        titleEl.textContent = product.name || 'Produto';
    }

    // Set price - convert to number (PostgreSQL returns DECIMAL as string)
    const priceEl = document.getElementById('productPrice');
    const installmentsEl = document.getElementById('productInstallments');

    if (priceEl) {
        const price = parseFloat(product.price) || 0;
        const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
        const hasDiscount = originalPrice && originalPrice > price;

        // Remove skeleton class
        priceEl.classList.remove('skeleton-text');
        priceEl.style.width = 'auto';
        priceEl.style.height = 'auto';

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

        // Adicionar informações de parcelamento
        if (installmentsEl && price > 0) {
            const installmentValue = (price / 3).toFixed(2).replace('.', ',');
            const pixDiscount = (price * 0.95).toFixed(2).replace('.', ',');

            installmentsEl.innerHTML = `
                <div class="installment-line" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; color: var(--text-gray);">
                    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; min-width: 20px;">
                        <rect x="4" y="12" width="40" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="3"/>
                        <rect x="4" y="18" width="40" height="6" fill="currentColor" fill-opacity="0.3"/>
                        <rect x="8" y="28" width="12" height="4" rx="1" fill="currentColor"/>
                    </svg>
                    <span>3x de R$ ${installmentValue} sem juros</span>
                </div>
                <div class="pix-line" style="display: flex; align-items: center; gap: 8px; color: #46d369; font-weight: 500;">
                    <img src="https://files.passeidireto.com/2889edc1-1a70-456a-a32c-e3f050102347/2889edc1-1a70-456a-a32c-e3f050102347.png" alt="PIX" style="width: 20px; height: 20px; object-fit: contain;">
                    <span>R$ ${pixDiscount} no PIX (5% OFF)</span>
                </div>
            `;
            installmentsEl.style.display = 'flex';
        }

        // Gerar tabela de parcelamento
        // Gerar tabela de parcelamento
        if (price > 0) {
            generateInstallmentsTable(price);
        }
    }

    // Set description
    const descEl = document.getElementById('productDescription');
    if (descEl) {
        descEl.innerHTML = `<p>${(product.description || 'Produto de alta qualidade.').replace(/\n/g, '</p><p>')}</p>`;
    }

    console.log('🔍 DEBUG RENDER PRODUCT:', product);
    console.log('📸 images_json:', product.images_json);
    console.log('📸 product.images:', product.images);

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

    // Use images array if available (from API), BUT only if we don't already have images from JSON
    // Or if the API provides more images than we found in JSON
    if (product.images && Array.isArray(product.images) && product.images.length > images.length) {
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

    // Hide global page loader if available
    if (window.hidePageLoader) {
        window.hidePageLoader();
    }
}

// Setup variants
function setupVariants(product) {
    // Check if product has variants enabled (default to false if unsupported/missing)
    if (!product.has_variants) {
        availableVariants = [];
        selectedVariant = null;
        renderVariants();
        return;
    }

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

    // Set main image with navigation buttons
    const mainImageHTML = typeof images[0] === 'string' && images[0].startsWith('http')
        ? `<img src="${images[0]}" alt="${currentProduct?.name || 'Produto'}">`
        : `<div style="font-size: 8rem; display: flex; align-items: center; justify-content: center; height: 100%;">${images[0]}</div>`;

    const navButtons = images.length > 1 ? `
        <button class="carousel-nav prev" onclick="previousImage()">&#8249;</button>
        <button class="carousel-nav next" onclick="nextImage()">&#8250;</button>
    ` : '';

    // Remove skeleton class
    mainImageEl.classList.remove('skeleton');
    mainImageEl.style.minHeight = 'auto'; // Reset min-height if needed

    mainImageEl.innerHTML = mainImageHTML + navButtons;

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
        thumbnailsEl.classList.remove('skeleton-container'); // If applies
    }
}

// Change main image
function changeImage(index) {
    if (index < 0 || index >= selectedImages.length) return;

    currentImageIndex = index;
    const mainImageEl = document.getElementById('mainImage');
    if (!mainImageEl) return;

    const img = selectedImages[index];

    const mainImageHTML = typeof img === 'string' && img.startsWith('http')
        ? `<img src="${img}" alt="${currentProduct?.name || 'Produto'}">`
        : `<div style="font-size: 8rem; display: flex; align-items: center; justify-content: center; height: 100%;">${img}</div>`;

    const navButtons = selectedImages.length > 1 ? `
        <button class="carousel-nav prev" onclick="previousImage()">&#8249;</button>
        <button class="carousel-nav next" onclick="nextImage()">&#8250;</button>
    ` : '';

    mainImageEl.innerHTML = mainImageHTML + navButtons;

    // Update active thumbnail
    document.querySelectorAll('.product-thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// Navigate carousel
function nextImage() {
    const nextIndex = (currentImageIndex + 1) % selectedImages.length;
    changeImage(nextIndex);
}

function previousImage() {
    const prevIndex = (currentImageIndex - 1 + selectedImages.length) % selectedImages.length;
    changeImage(prevIndex);
}

// Make navigation functions global
window.nextImage = nextImage;
window.previousImage = previousImage;

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
            console.log('🛒 Botão adicionar ao carrinho clicado!');

            if (!currentProduct) {
                console.error('❌ Produto não carregado');
                return;
            }

            console.log('📦 Produto:', currentProduct.name);
            console.log('🔢 Quantidade:', currentQuantity);
            console.log('📏 Variante selecionada:', selectedVariant);

            // Check if variant is selected
            if (availableVariants.length > 0 && !selectedVariant) {
                console.warn('⚠️ Nenhuma variante selecionada');
                showNotification('Por favor, selecione um tamanho', 'error');
                return;
            }

            try {
                const variantInfo = selectedVariant ? `${selectedVariant.name}` : null;
                const productPrice = parseFloat(currentProduct.price) || 0;
                const price = selectedVariant?.price || productPrice;

                const requestData = {
                    product_id: currentProduct.id,
                    quantity: currentQuantity,
                    selected_variant: variantInfo,
                    price: price,
                    session_id: sessionId
                };

                console.log('📤 Enviando para API:', requestData);

                const response = await fetch(`${API_URL}/cart/add`, {
                    method: 'POST',
                    headers: getCartHeaders(),
                    body: JSON.stringify(requestData)
                });

                const data = await response.json();
                console.log('📥 Resposta da API:', data);

                if (response.ok) {
                    const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
                    showNotification(`${currentProduct.name}${variantText} adicionado à sacola!`, 'success');

                    console.log('✅ Produto adicionado com sucesso!');

                    // Update cart in cart drawer if open
                    if (typeof window.loadCartFromAPI === 'function') {
                        console.log('🔄 Atualizando carrinho...');
                        await window.loadCartFromAPI();
                    } else {
                        console.warn('⚠️ Função loadCartFromAPI não encontrada');
                    }

                    // Reset quantity
                    currentQuantity = 1;
                    if (quantityValue) quantityValue.textContent = '1';
                } else {
                    console.error('❌ Erro ao adicionar:', data);
                    showNotification(data.error || 'Erro ao adicionar produto', 'error');
                }
            } catch (error) {
                console.error('❌ Erro na requisição:', error);
                showNotification('Erro ao conectar com o servidor', 'error');
            }
        });
    }

    // Load product on page load
    loadProduct();

    // Load cart from API on page load
    if (typeof window.loadCartFromAPI === 'function') {
        window.loadCartFromAPI();
    }

    // CEP Calculator event listeners
    const cepInput = document.getElementById('cepInput');
    const cepCalculateBtn = document.getElementById('cepCalculateBtn');

    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            e.target.value = formatCep(e.target.value);
        });

        cepInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                calculateShipping();
            }
        });
    }

    if (cepCalculateBtn) {
        cepCalculateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            calculateShipping();
        });
    }
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

// CEP Calculator
let shippingOptionsCache = null;

async function calculateShipping() {
    console.log('🚚 Calculando frete...');
    const cepInput = document.getElementById('cepInput');
    const cepResults = document.getElementById('cepResults');
    const cep = cepInput.value.replace(/\D/g, '');

    console.log('📍 CEP digitado:', cep);

    if (cep.length !== 8) {
        showCepError('CEP inválido. Digite 8 dígitos.');
        return;
    }

    // Mostrar loading
    cepResults.innerHTML = `
        <div class="cep-loading">
            <div class="cep-loading-spinner"></div>
            Buscando informações de frete...
        </div>
    `;
    cepResults.style.display = 'block';

    // Marcar o tempo de início para garantir delay mínimo
    const startTime = Date.now();
    const minLoadingTime = 1200; // 1.2 segundos mínimo

    try {
        // Buscar opções de frete (usar cache se disponível)
        if (!shippingOptionsCache) {
            console.log('🚚 Buscando opções de frete do servidor...');
            const shippingResponse = await fetch(`${API_URL}/shipping-options`);

            if (!shippingResponse.ok) {
                throw new Error('Erro ao buscar opções de frete');
            }

            shippingOptionsCache = await shippingResponse.json();
            console.log('📋 Opções de frete carregadas:', shippingOptionsCache);
        }

        console.log('🔍 Buscando CEP na ViaCEP...');
        // Buscar informações do CEP via ViaCEP
        const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const cepData = await cepResponse.json();

        console.log('📦 Dados do CEP:', cepData);

        if (cepData.erro) {
            showCepError('CEP não encontrado.');
            return;
        }

        // Calcular tempo decorrido e aguardar o restante se necessário
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, minLoadingTime - elapsed);

        console.log(`⏱️ Tempo decorrido: ${elapsed}ms, aguardando mais ${remainingDelay}ms`);

        // Aguardar o delay mínimo antes de renderizar
        await new Promise(resolve => setTimeout(resolve, remainingDelay));

        // Renderizar resultados
        renderShippingResults(cepData, shippingOptionsCache);

    } catch (error) {
        console.error('❌ Erro ao calcular frete:', error);
        showCepError('Erro ao calcular frete. Tente novamente.');
    }
}

function showCepError(message) {
    const cepResults = document.getElementById('cepResults');
    cepResults.innerHTML = `<div class="cep-error">${message}</div>`;
    cepResults.style.display = 'block';
}

function renderShippingResults(cepData, shippingOptions) {
    const cepResults = document.getElementById('cepResults');
    const location = `${cepData.localidade} - ${cepData.uf}`;

    console.log('📊 Renderizando resultados de frete');
    console.log('   Total de opções:', shippingOptions.length);
    console.log('   Opções ativas:', shippingOptions.filter(o => o.active).length);

    const optionsHTML = shippingOptions
        .filter(option => {
            console.log(`   - ${option.name}: active=${option.active}, price=${option.price}`);
            return option.active;
        })
        .map(option => {
            const price = parseFloat(option.price) || 0;
            const priceDisplay = price === 0 ? 'GRÁTIS' : `R$ ${price.toFixed(2).replace('.', ',')}`;
            const priceClass = price === 0 ? 'free' : '';

            console.log(`   ✅ Renderizando: ${option.name} - ${priceDisplay}`);

            // Ícone padrão ou do banco
            const iconSvg = option.icon_svg || `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10z"/>
                </svg>
            `;

            return `
                <div class="shipping-option">
                    <div class="shipping-option-info">
                        <div class="shipping-icon">${iconSvg}</div>
                        <div class="shipping-details">
                            <div class="shipping-name">${option.name}</div>
                            <div class="shipping-time">${option.delivery_time}</div>
                        </div>
                    </div>
                    <div class="shipping-price ${priceClass}">${priceDisplay}</div>
                </div>
            `;
        })
        .join('');

    cepResults.innerHTML = `
        <div class="cep-location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Enviar para: ${location}
        </div>
        <div class="shipping-options">
            ${optionsHTML}
        </div>
    `;
    cepResults.style.display = 'block';

    console.log('✅ Resultados renderizados');
}

// Máscara de CEP
function formatCep(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
        return numbers;
    }
    return numbers.substring(0, 5) + '-' + numbers.substring(5, 8);
}

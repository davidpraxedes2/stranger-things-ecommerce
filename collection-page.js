// Collection Page JavaScript
// API Base URL
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.origin;
    window.API_URL = `${window.API_BASE}/api`;
}

const API_URL = window.API_URL;

// Get collection slug from URL
const urlParams = new URLSearchParams(window.location.search);
const collectionSlug = urlParams.get('slug');

let currentCollection = null;
let collectionProducts = [];

// Load collection and products
async function loadCollectionPage() {
    if (!collectionSlug) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Load all collections
        const collectionsResponse = await fetch(`${API_URL}/collections`);
        if (!collectionsResponse.ok) {
            throw new Error('Erro ao carregar coleções');
        }
        const collections = await collectionsResponse.json();
        
        // Find the collection by slug
        currentCollection = collections.find(c => c.slug === collectionSlug);
        
        if (!currentCollection) {
            console.error('Coleção não encontrada:', collectionSlug);
            window.location.href = 'index.html';
            return;
        }

        // Load all products
        const productsResponse = await fetch(`${API_URL}/products`);
        if (!productsResponse.ok) {
            throw new Error('Erro ao carregar produtos');
        }
        const allProducts = await productsResponse.json();

        // Filter products by collection
        collectionProducts = allProducts.filter(p => 
            p.collections && p.collections.includes(currentCollection.name)
        );

        // Render page
        renderCollectionHeader();
        renderCollectionProducts();

    } catch (error) {
        console.error('Erro ao carregar coleção:', error);
        document.getElementById('collectionTitle').textContent = 'Erro ao carregar coleção';
        document.getElementById('collectionDescription').textContent = 'Não foi possível carregar os produtos desta coleção.';
    }
}

// Render collection header
function renderCollectionHeader() {
    document.getElementById('collectionTitle').textContent = currentCollection.name.toUpperCase();
    document.getElementById('collectionDescription').textContent = currentCollection.description || '';
    document.getElementById('collectionCount').textContent = `${collectionProducts.length} ${collectionProducts.length === 1 ? 'PRODUTO' : 'PRODUTOS'}`;
    document.getElementById('pageTitle').textContent = `${currentCollection.name} - Stranger Things Store`;
}

// Render collection products
function renderCollectionProducts() {
    const container = document.getElementById('collectionProducts');
    
    if (!container) return;

    if (collectionProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-3xl); color: var(--text-gray);">
                <p style="font-size: var(--fs-xl);">Nenhum produto encontrado nesta coleção.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = collectionProducts.map(product => {
        const price = parseFloat(product.price) || 0;
        const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
        const hasDiscount = originalPrice && originalPrice > price;
        const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
        
        // Calcular parcelamento (até 3x sem juros)
        const installmentValue = (price / 3).toFixed(2).replace('.', ',');
        const pixDiscount = (price * 0.95).toFixed(2).replace('.', ','); // 5% desconto no PIX
        
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
                    <div class="product-payment-info">
                        <div class="payment-installment">3x de R$ ${installmentValue} sem juros</div>
                        <div class="payment-pix">R$ ${pixDiscount} no PIX (5% OFF)</div>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadCollectionPage();
    
    // Load cart from API on page load
    if (typeof window.loadCartFromAPI === 'function') {
        window.loadCartFromAPI();
    }
});

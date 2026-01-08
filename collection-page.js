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
let currentView = null; // 'grid' ou 'carousel'

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

        // Definir visualização inicial baseada no default_view do admin
        currentView = currentCollection.default_view || 'grid';

        // Load all products
        const productsResponse = await fetch(`${API_URL}/products`);
        if (!productsResponse.ok) {
            throw new Error('Erro ao carregar produtos');
        }
        const allProducts = await productsResponse.json();

        // Filter products by collection - com validação robusta
        collectionProducts = allProducts.filter(p => {
            // Verificar se p.collections existe e é array
            if (!p.collections) return false;
            
            // Se for string, tentar fazer parse
            let collections = p.collections;
            if (typeof collections === 'string') {
                try {
                    collections = JSON.parse(collections);
                } catch (e) {
                    // Se parse falhar, tratar como string única
                    collections = [collections];
                }
            }
            
            // Verificar se é array antes de usar includes
            if (!Array.isArray(collections)) {
                collections = [collections];
            }
            
            return collections.includes(currentCollection.name);
        });

        // Render page
        renderCollectionHeader();
        renderViewToggle();
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

// Renderizar botões de alternância de visualização
function renderViewToggle() {
    const header = document.querySelector('.collection-header .container');
    
    // Remover toggle anterior se existir
    const existingToggle = document.getElementById('viewToggle');
    if (existingToggle) {
        existingToggle.remove();
    }
    
    const toggleHTML = `
        <div id="viewToggle" style="display: flex; justify-content: center; gap: 12px; margin-top: 24px;">
            <button 
                class="view-toggle-btn ${currentView === 'grid' ? 'active' : ''}" 
                onclick="changeView('grid')"
                style="padding: 12px 24px; background: ${currentView === 'grid' ? 'var(--netflix-red)' : 'transparent'}; color: white; border: 2px solid var(--netflix-red); border-radius: 4px; cursor: pointer; font-family: var(--font-teko); font-size: 16px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Grid
            </button>
            <button 
                class="view-toggle-btn ${currentView === 'carousel' ? 'active' : ''}" 
                onclick="changeView('carousel')"
                style="padding: 12px 24px; background: ${currentView === 'carousel' ? 'var(--netflix-red)' : 'transparent'}; color: white; border: 2px solid var(--netflix-red); border-radius: 4px; cursor: pointer; font-family: var(--font-teko); font-size: 16px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                    <path d="M12 6v12"></path>
                    <path d="M8 6v12"></path>
                    <path d="M16 6v12"></path>
                </svg>
                Carrossel
            </button>
        </div>
    `;
    
    header.insertAdjacentHTML('beforeend', toggleHTML);
}

// Função para trocar visualização (chamada pelos botões)
function changeView(newView) {
    currentView = newView;
    renderViewToggle();
    renderCollectionProducts();
}

// Tornar a função global
window.changeView = changeView;

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

    // Alterar classe do container baseado na visualização
    if (currentView === 'carousel') {
        container.className = 'products-carousel';
        container.style.display = 'flex';
        container.style.overflowX = 'auto';
        container.style.gap = '20px';
        container.style.scrollSnapType = 'x mandatory';
        container.style.scrollBehavior = 'smooth';
        container.style.paddingBottom = '20px';
    } else {
        container.className = 'products-grid';
        container.style.display = '';
        container.style.overflowX = '';
        container.style.gap = '';
        container.style.scrollSnapType = '';
        container.style.scrollBehavior = '';
    }

    container.innerHTML = collectionProducts.map(product => {
        const price = parseFloat(product.price) || 0;
        const originalPrice = product.original_price ? parseFloat(product.original_price) : null;
        const hasDiscount = originalPrice && originalPrice > price;
        const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
        
        // Calcular parcelamento (até 3x sem juros)
        const installmentValue = (price / 3).toFixed(2).replace('.', ',');
        const pixDiscount = (price * 0.95).toFixed(2).replace('.', ','); // 5% desconto no PIX
        
        const cardStyle = currentView === 'carousel' ? 'min-width: 300px; scroll-snap-align: start;' : '';
        
        return `
            <a href="product.html?id=${product.id}" class="product-card" data-product-id="${product.id}" style="${cardStyle}">
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

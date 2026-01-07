// Search functionality - Compartilhado entre index.html e product.html
(function() {
    'use strict';
    
    let productsForSearch = [];
    let searchInitialized = false;
    
    // Debounce helper
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
    
    // Carregar produtos para busca
    async function loadProductsForSearch() {
        try {
            const API_URL = window.API_URL || `${window.location.origin}/api`;
            const response = await fetch(`${API_URL}/products`);
            if (response.ok) {
                productsForSearch = await response.json();
                console.log(`✅ ${productsForSearch.length} produtos carregados para busca`);
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar produtos para busca:', error);
        }
        return false;
    }
    
    // Função de busca em tempo real
    function performSearch(query, resultsContainer) {
        if (!resultsContainer) return;
        
        const trimmedQuery = query.trim().toLowerCase();
        
        // Esconder se vazio
        if (trimmedQuery === '') {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Mostrar loading
        resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="search-loading-spinner"></div>
                Buscando...
            </div>
        `;
        resultsContainer.style.display = 'block';
        
        // Filtrar produtos
        const filtered = productsForSearch.filter(product => {
            const name = (product.name || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const tags = Array.isArray(product.tags) ? product.tags.join(' ').toLowerCase() : '';
            
            return name.includes(trimmedQuery) || 
                   description.includes(trimmedQuery) || 
                   tags.includes(trimmedQuery);
        });
        
        // Limitar a 8 resultados
        const displayResults = filtered.slice(0, 8);
        
        // Renderizar resultados
        if (displayResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    Nenhum produto encontrado para "${query}"
                </div>
            `;
        } else {
            resultsContainer.innerHTML = displayResults.map(product => {
                const price = parseFloat(product.price) || 0;
                const imageUrl = product.image_url || '';
                const imageHTML = imageUrl ? 
                    `<img src="${imageUrl}" alt="${product.name}">` : 
                    '<div>👕</div>';
                
                return `
                    <a href="product.html?id=${product.id}" class="search-result-item">
                        <div class="search-result-image">${imageHTML}</div>
                        <div class="search-result-info">
                            <div class="search-result-name">${product.name}</div>
                            <div class="search-result-price">R$ ${price.toFixed(2).replace('.', ',')}</div>
                        </div>
                    </a>
                `;
            }).join('');
        }
    }
    
    // Inicializar busca
    async function initializeSearch() {
        if (searchInitialized) {
            console.log('🔍 Busca já inicializada');
            return;
        }
        
        console.log('🔍 Inicializando busca...');
        
        const searchToggle = document.getElementById('searchToggle');
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        const searchSubmit = document.getElementById('searchSubmit');
        const searchResults = document.getElementById('searchResults');
        
        console.log('🔍 Elementos encontrados:', {
            searchToggle: !!searchToggle,
            searchBar: !!searchBar,
            searchInput: !!searchInput,
            searchSubmit: !!searchSubmit,
            searchResults: !!searchResults
        });
        
        if (!searchToggle || !searchBar || !searchInput || !searchResults) {
            console.warn('⚠️ Elementos de busca não encontrados - tentando novamente em 500ms');
            setTimeout(initializeSearch, 500);
            return;
        }
        
        // Carregar produtos
        console.log('🔍 Carregando produtos para busca...');
        await loadProductsForSearch();
        
        // Toggle search bar
        searchToggle.addEventListener('click', (e) => {
            console.log('🔍 Lupa clicada!');
            e.preventDefault();
            searchBar.classList.toggle('active');
            if (searchBar.classList.contains('active')) {
                console.log('🔍 Abrindo barra de busca');
                searchInput.focus();
            } else {
                console.log('🔍 Fechando barra de busca');
                // Limpar busca ao fechar
                searchInput.value = '';
                searchResults.style.display = 'none';
            }
        });
        
        // Debounced search para evitar muitas buscas
        const debouncedSearch = debounce((value) => {
            performSearch(value, searchResults);
        }, 300);
        
        // Input com debounce
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        // Enter para buscar imediatamente
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(searchInput.value, searchResults);
            }
        });
        
        // Botão de busca
        if (searchSubmit) {
            searchSubmit.addEventListener('click', (e) => {
                e.preventDefault();
                performSearch(searchInput.value, searchResults);
            });
        }
        
        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!searchBar.contains(e.target) && !searchToggle.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        searchInitialized = true;
        console.log('✅ Busca inicializada com sucesso!');
    }
    
    // Inicializar quando DOM e window estiverem prontos
    function tryInitialize() {
        console.log('🔍 tryInitialize chamada - readyState:', document.readyState);
        
        if (document.readyState === 'loading') {
            console.log('🔍 DOM ainda carregando, aguardando DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', initializeSearch);
        } else {
            console.log('🔍 DOM pronto, inicializando agora...');
            initializeSearch();
        }
        
        // Garantir também no load completo
        window.addEventListener('load', () => {
            console.log('🔍 Window load event - verificando inicialização');
            if (!searchInitialized) {
                console.log('🔍 Busca não inicializada, tentando novamente...');
                initializeSearch();
            }
        });
    }
    
    // Executar imediatamente
    tryInitialize();
    
    // Expor função para uso externo se necessário
    window.initializeSearch = initializeSearch;
})();

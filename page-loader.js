// Page Loader - Spinner durante navegação entre páginas
(function() {
    'use strict';

    let pageLoader = null;
    let isNavigating = false;
    
    // Obter referência do loader
    function getLoader() {
        if (!pageLoader) {
            pageLoader = document.getElementById('pageLoader');
        }
        return pageLoader;
    }
    
    // Mostrar spinner
    function showLoader() {
        const loader = getLoader();
        if (loader) {
            isNavigating = true;
            loader.style.display = 'flex';
            loader.style.opacity = '0';
            // Forçar reflow
            requestAnimationFrame(() => {
                loader.classList.add('active');
                loader.style.opacity = '1';
            });
        }
    }

    // Esconder spinner
    function hideLoader() {
        const loader = getLoader();
        if (loader && !isNavigating) {
            loader.classList.remove('active');
            setTimeout(() => {
                if (loader) {
                    loader.style.display = 'none';
                    loader.style.opacity = '0';
                }
            }, 300);
        }
    }

    // Interceptar cliques em links
    function initPageLoader() {
        // Interceptar TODOS os cliques primeiro (capture phase)
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            
            // Verificar se é link interno válido
            if (href && 
                !href.startsWith('http') && 
                !href.startsWith('//') && 
                !href.startsWith('#') && 
                !href.startsWith('javascript:') &&
                !href.startsWith('mailto:') &&
                !href.startsWith('tel:') &&
                link.target !== '_blank' &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.shiftKey) {
                
                // Prevenir navegação imediata
                e.preventDefault();
                e.stopImmediatePropagation();
                
                // Mostrar spinner
                showLoader();
                
                // Navegar após garantir que spinner apareceu
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
                
                return false;
            }
        }, true); // CAPTURE PHASE - executa ANTES de qualquer outro handler

        // Esconder loader quando página nova carregar
        if (document.readyState === 'complete') {
            isNavigating = false;
            setTimeout(hideLoader, 1000);
        } else {
            window.addEventListener('load', function() {
                isNavigating = false;
                setTimeout(hideLoader, 800);
            });
            
            // Fallback
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    if (!isNavigating) {
                        hideLoader();
                    }
                }, 1000);
            });
        }
    }

    // Inicializar imediatamente
    if (document.readyState === 'loading') {
        // Se ainda está carregando, esperar DOM
        document.addEventListener('DOMContentLoaded', initPageLoader);
        // Mas mostrar loader se já estiver carregando
        setTimeout(() => {
            if (document.readyState !== 'complete') {
                isNavigating = false;
                hideLoader();
            }
        }, 500);
    } else {
        // DOM já carregou, inicializar e esconder loader
        initPageLoader();
        isNavigating = false;
        setTimeout(hideLoader, 500);
    }

    // Expor funções globalmente
    window.showPageLoader = showLoader;
    window.hidePageLoader = hideLoader;
})();

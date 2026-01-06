// Page Loader - Spinner durante navegação entre páginas
(function() {
    'use strict';

    let pageLoader = null;
    
    // Obter referência do loader
    function getLoader() {
        if (!pageLoader) {
            pageLoader = document.getElementById('pageLoader');
        }
        return pageLoader;
    }
    
    // Mostrar spinner INSTANTANEAMENTE
    function showLoader() {
        const loader = getLoader();
        if (loader) {
            // Remover qualquer classe/esconder
            loader.classList.remove('active');
            loader.style.display = 'flex';
            loader.style.opacity = '1';
            loader.style.visibility = 'visible';
            // Forçar display e aparecer IMEDIATAMENTE
            loader.offsetWidth; // Force reflow
            loader.classList.add('active');
        }
    }

    // Esconder spinner
    function hideLoader() {
        const loader = getLoader();
        if (loader) {
            loader.classList.remove('active');
            setTimeout(() => {
                if (loader && !loader.classList.contains('active')) {
                    loader.style.display = 'none';
                    loader.style.opacity = '0';
                }
            }, 300);
        }
    }

    // Interceptar cliques em links - ANTES de tudo
    function initPageLoader() {
        // Usar capture phase para executar ANTES de qualquer outro handler
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
                
                // PARAR TUDO - prevenir qualquer outra ação
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // MOSTRAR SPINNER IMEDIATAMENTE (sem delays)
                showLoader();
                
                // Navegar após garantir que spinner foi renderizado
                setTimeout(() => {
                    window.location.href = href;
                }, 300); // Delay maior para garantir visibilidade
                
                return false;
            }
        }, true); // CAPTURE PHASE

        // Esconder loader quando página carregar
        if (document.readyState === 'complete') {
            setTimeout(hideLoader, 500);
        } else {
            window.addEventListener('load', function() {
                setTimeout(hideLoader, 500);
            });
            
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(hideLoader, 800);
            });
        }
    }

    // Inicializar IMEDIATAMENTE quando script carregar
    // Não esperar DOM se já estiver pronto
    if (document.body) {
        initPageLoader();
        setTimeout(hideLoader, 500);
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                initPageLoader();
                setTimeout(hideLoader, 500);
            });
        } else {
            initPageLoader();
            setTimeout(hideLoader, 500);
        }
    }

    // Expor funções globalmente
    window.showPageLoader = showLoader;
    window.hidePageLoader = hideLoader;
})();

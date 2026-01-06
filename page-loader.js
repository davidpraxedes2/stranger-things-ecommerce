// Page Loader - Spinner durante navegação entre páginas
(function() {
    'use strict';

    const pageLoader = document.getElementById('pageLoader');
    
    // Mostrar spinner ao iniciar navegação
    function showLoader() {
        if (pageLoader) {
            pageLoader.classList.add('active');
        }
    }

    // Esconder spinner quando página carregar
    function hideLoader() {
        if (pageLoader) {
            pageLoader.classList.remove('active');
        }
    }

    // Interceptar todos os links internos
    function initPageLoader() {
        // Mostrar loader imediatamente ao clicar em links
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            
            // Apenas links internos (não externos, não âncoras, não javascript:)
            if (href && 
                !href.startsWith('http') && 
                !href.startsWith('//') && 
                !href.startsWith('#') && 
                !href.startsWith('javascript:') &&
                !href.startsWith('mailto:') &&
                !href.startsWith('tel:') &&
                link.target !== '_blank' &&
                !e.ctrlKey &&
                !e.metaKey) {
                
                // Mostrar spinner imediatamente
                showLoader();
            }
        }, true); // Use capture phase para pegar antes de qualquer outro handler

        // Esconder loader quando página carregar completamente
        if (document.readyState === 'complete') {
            hideLoader();
        } else {
            window.addEventListener('load', hideLoader);
            // Fallback: esconder após 2 segundos mesmo se load não disparar
            setTimeout(hideLoader, 2000);
        }

        // Esconder loader quando DOM estiver pronto (para páginas que carregam rápido)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                // Aguardar um pouco para garantir que conteúdo está renderizado
                setTimeout(hideLoader, 300);
            });
        } else {
            setTimeout(hideLoader, 300);
        }
    }

    // Inicializar quando script carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageLoader);
    } else {
        initPageLoader();
    }

    // Expor funções globalmente para uso manual se necessário
    window.showPageLoader = showLoader;
    window.hidePageLoader = hideLoader;
})();


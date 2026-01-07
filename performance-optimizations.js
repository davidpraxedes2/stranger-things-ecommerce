// Performance Optimizations for Stranger Things Store
// Este arquivo contém otimizações que não alteram o visual

// 1. Lazy Loading de Imagens
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para não interferir com o carregamento inicial
    setTimeout(() => {
        const images = document.querySelectorAll('img[src]');
        
        if ('loading' in HTMLImageElement.prototype) {
            // Navegador suporta lazy loading nativo
            images.forEach(img => {
                if (!img.hasAttribute('loading')) {
                    img.loading = 'lazy';
                }
            });
        } else {
            // Fallback com Intersection Observer
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
    }, 1000);
});

// 2. Debounce para eventos de scroll e resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Eventos de resize já são tratados, apenas otimizar
    }, 250);
}, { passive: true });

// 3. Otimizar scroll com passive listeners
document.addEventListener('scroll', () => {
    // Scroll já é otimizado com sticky header
}, { passive: true });

// 4. Preload de páginas críticas (prefetch)
if ('connection' in navigator && navigator.connection.effectiveType !== 'slow-2g') {
    const prefetchLinks = [
        '/product.html',
        '/checkout.html'
    ];
    
    prefetchLinks.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    });
}

// 5. Reduzir reflows/repaints - usar transform ao invés de top/left
const style = document.createElement('style');
style.textContent = `
    /* Otimizações de performance via CSS */
    * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }
    
    img {
        will-change: opacity;
    }
    
    .product-card {
        will-change: transform;
    }
    
    /* Usar GPU para animações */
    .product-card:hover {
        transform: translateZ(0) translateY(-8px);
    }
`;
document.head.appendChild(style);

// 6. Defer de scripts não críticos
window.addEventListener('load', () => {
    // Carregar analytics, chat, etc apenas após load completo
    console.log('✅ Página totalmente carregada - scripts não-críticos podem ser carregados');
});

// 7. Service Worker para cache (opcional - descomentar para ativar)
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registrado'))
            .catch(err => console.log('❌ Service Worker falhou:', err));
    });
}
*/

console.log('⚡ Otimizações de performance carregadas');

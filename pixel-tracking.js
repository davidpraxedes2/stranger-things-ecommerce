// Meta Pixel Tracking Library
// Gerencia eventos do Facebook Pixel para rastreamento de conversões

class MetaPixelTracker {
    constructor() {
        this.pixelId = null;
        this.isInitialized = false;
        this.eventQueue = [];
    }

    // Inicializar o pixel com ID do admin
    async init() {
        try {
            // Buscar configuração do pixel do backend
            const response = await fetch('/api/tracking/meta-pixel');
            const data = await response.json();

            if (data.pixel_id && data.is_active) {
                this.pixelId = data.pixel_id;
                this.loadPixelScript();
                this.processQueue();
            } else {
                console.log('📊 Meta Pixel não configurado ou inativo');
            }
        } catch (error) {
            console.warn('Erro ao carregar configuração do Meta Pixel:', error);
        }
    }

    // Carregar script do Facebook Pixel
    loadPixelScript() {
        if (this.isInitialized) return;

        // Facebook Pixel Code
        !function (f, b, e, v, n, t, s) {
            if (f.fbq) return; n = f.fbq = function () {
                n.callMethod ?
                n.callMethod.apply(n, arguments) : n.queue.push(arguments)
            };
            if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
            n.queue = []; t = b.createElement(e); t.async = !0;
            t.src = v; s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s)
        }(window, document, 'script',
            'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', this.pixelId);
        this.isInitialized = true;
        console.log('✅ Meta Pixel inicializado:', this.pixelId);
    }

    // Processar eventos que foram enfileirados antes da inicialização
    processQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.trackEvent(event.name, event.params);
        }
    }

    // Rastrear evento
    trackEvent(eventName, params = {}) {
        if (!this.isInitialized) {
            // Enfileirar evento se o pixel ainda não foi inicializado
            this.eventQueue.push({ name: eventName, params });
            return;
        }

        try {
            if (typeof fbq !== 'undefined') {
                fbq('track', eventName, params);
                console.log(`📊 Evento rastreado: ${eventName}`, params);
            }
        } catch (error) {
            console.error('Erro ao rastrear evento:', error);
        }
    }

    // Eventos específicos com parâmetros padronizados

    trackPageView() {
        this.trackEvent('PageView');
    }

    trackViewContent(product) {
        this.trackEvent('ViewContent', {
            content_name: product.name,
            content_ids: [product.id],
            content_type: 'product',
            value: parseFloat(product.price),
            currency: 'BRL'
        });
    }

    trackAddToCart(item) {
        this.trackEvent('AddToCart', {
            content_name: item.name,
            content_ids: [item.product_id || item.id],
            content_type: 'product',
            value: parseFloat(item.price) * item.quantity,
            currency: 'BRL'
        });
    }

    trackInitiateCheckout(cart, total) {
        const contentIds = cart.map(item => item.product_id || item.id);
        const contentNames = cart.map(item => item.name).join(', ');

        this.trackEvent('InitiateCheckout', {
            content_ids: contentIds,
            contents: cart.map(item => ({
                id: item.product_id || item.id,
                quantity: item.quantity
            })),
            content_type: 'product',
            value: parseFloat(total),
            currency: 'BRL',
            num_items: cart.reduce((sum, item) => sum + item.quantity, 0)
        });
    }

    trackPurchase(orderId, total, cart) {
        const contentIds = cart.map(item => item.product_id || item.id);

        this.trackEvent('Purchase', {
            content_ids: contentIds,
            contents: cart.map(item => ({
                id: item.product_id || item.id,
                quantity: item.quantity
            })),
            content_type: 'product',
            value: parseFloat(total),
            currency: 'BRL',
            num_items: cart.reduce((sum, item) => sum + item.quantity, 0)
        });
    }
}

// Criar instância global
window.metaPixel = new MetaPixelTracker();

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.metaPixel.init());
} else {
    window.metaPixel.init();
}

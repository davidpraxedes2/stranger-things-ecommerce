(async function () {
    try {
        // Fetch Pixel configuration from backend
        // Use relative URL assuming served from same origin
        const response = await fetch('/api/tracking/meta-pixel');
        if (!response.ok) return;

        const data = await response.json();

        if (data.pixel_id && data.is_active) {
            console.log('🔹 Initializing Meta Pixel:', data.pixel_id);

            // Standard Facebook Pixel Code
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

            fbq('init', data.pixel_id);
            fbq('track', 'PageView');

            // Define Helper global for easy event tracking from other scripts
            window.metaPixel = {
                trackPurchase: (orderId, value, items) => {
                    console.log('🔹 Pixel: Purchase', { orderId, value });
                    const contentIds = items ? items.map(i => i.id || i.product_id) : [];
                    fbq('track', 'Purchase', {
                        currency: 'BRL',
                        value: value,
                        content_ids: contentIds,
                        content_type: 'product',
                        order_id: orderId
                    });
                },
                trackInitiateCheckout: (value, items) => {
                    console.log('🔹 Pixel: InitiateCheckout', { value });
                    const contentIds = items ? items.map(i => i.id || i.product_id) : [];
                    fbq('track', 'InitiateCheckout', {
                        currency: 'BRL',
                        value: value,
                        content_ids: contentIds,
                        content_type: 'product'
                    });
                },
                trackAddToCart: (item) => {
                    console.log('🔹 Pixel: AddToCart', item.name);
                    fbq('track', 'AddToCart', {
                        currency: 'BRL',
                        value: item.price,
                        content_ids: [item.id],
                        content_type: 'product',
                        content_name: item.name
                    });
                },
                trackViewContent: (product) => {
                    console.log('🔹 Pixel: ViewContent', product.name);
                    fbq('track', 'ViewContent', {
                        currency: 'BRL',
                        value: product.price,
                        content_ids: [product.id],
                        content_type: 'product',
                        content_name: product.name
                    });
                }
            };

            // Dispatch event so other scripts know Pixel is ready
            window.dispatchEvent(new Event('metaPixelReady'));
        }
    } catch (e) {
        console.warn('Pixel loader init warning:', e);
    }
})();

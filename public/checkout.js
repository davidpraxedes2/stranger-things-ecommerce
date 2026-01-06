// Checkout Script
const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api`;

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

let cartItems = [];
let cartTotal = 0;

// Load cart on page load
async function loadCart() {
    try {
        const response = await fetch(`${API_URL}/cart?session_id=${sessionId}`, {
            headers: getCartHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            cartItems = data.items || [];
            cartTotal = data.total || 0;
            renderOrderSummary();
        } else {
            // Cart is empty, redirect to home
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        window.location.href = 'index.html';
    }
}

// Render order summary
function renderOrderSummary() {
    const orderItemsEl = document.getElementById('orderItems');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    if (cartItems.length === 0) {
        window.location.href = 'index.html';
        return;
    }

    // Render items
    orderItemsEl.innerHTML = cartItems.map(item => `
        <div class="order-item">
            <div class="order-item-image">
                ${item.image_url ? 
                    `<img src="${item.image_url}" alt="${item.name || 'Produto'}">` : 
                    '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 2rem;">👕</div>'
                }
            </div>
            <div class="order-item-info">
                <div class="order-item-name">${item.name || 'Produto'}</div>
                <div class="order-item-details">Quantidade: ${item.quantity || 1}x</div>
                <div class="order-item-price">R$ ${((item.price || 0) * (item.quantity || 1)).toFixed(2).replace('.', ',')}</div>
            </div>
        </div>
    `).join('');

    // Update totals
    const subtotal = cartTotal;
    const shipping = 0; // Free shipping for now
    const total = subtotal + shipping;

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Submit order
document.addEventListener('DOMContentLoaded', () => {
    loadCart();

    const checkoutForm = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitOrder');

    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!checkoutForm.checkValidity()) {
                checkoutForm.reportValidity();
                return;
            }

            const customerData = {
                customer_name: document.getElementById('customerName').value,
                customer_email: document.getElementById('customerEmail').value,
                customer_phone: document.getElementById('customerPhone').value,
                shipping_address: `
                    ${document.getElementById('customerAddress').value}
                    ${document.getElementById('customerCity').value}, ${document.getElementById('customerState').value}
                    CEP: ${document.getElementById('customerZipCode').value}
                `.trim(),
                payment_method: document.getElementById('paymentMethod').value
            };

            const total = cartTotal;
            const items = cartItems.map(item => ({
                product_id: item.product_id || item.id,
                quantity: item.quantity || 1,
                price: item.price || 0
            }));

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'PROCESSANDO...';

                const response = await fetch(`${API_URL}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...customerData,
                        items: items,
                        total: total
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Clear cart
                    await fetch(`${API_URL}/cart/clear`, {
                        method: 'DELETE',
                        headers: getCartHeaders()
                    });

                    // Redirect to success page
                    window.location.href = `order-success.html?order_id=${data.order_id || ''}`;
                } else {
                    alert(data.error || 'Erro ao processar pedido');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'FINALIZAR PEDIDO';
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao conectar com o servidor');
                submitBtn.disabled = false;
                submitBtn.textContent = 'FINALIZAR PEDIDO';
            }
        });
    }
});


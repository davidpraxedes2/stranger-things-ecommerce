// Checkout JS - Stranger Things Store
const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api`;
const sessionId = localStorage.getItem('cart_session_id');

let cart = [];

// Função de notificação (necessária para feedback ao usuário)
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 16px;
        background: var(--dark-gray, #1a1a1a);
        border: 2px solid ${type === 'success' ? 'var(--netflix-red, #e50914)' : type === 'error' ? '#ef4444' : '#f59e0b'};
        color: var(--text-white, #ffffff);
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 3000;
        font-family: 'Teko', sans-serif;
        font-size: 16px;
        font-weight: 500;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Mostrar spinner
function showSpinner() {
    const spinner = document.getElementById('checkoutSpinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

// Esconder spinner
function hideSpinner() {
    const spinner = document.getElementById('checkoutSpinner');
    if (spinner) {
        setTimeout(() => {
            spinner.classList.add('hidden');
        }, 400);
    }
}

async function loadCart() {
    showSpinner();
    
    if (!sessionId) {
        hideSpinner();
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cart?session_id=${sessionId}`, {
            headers: { 'x-session-id': sessionId }
        });
        
        if (response.ok) {
            const data = await response.json();
            cart = data.items || [];
            renderCheckout();
            hideSpinner();
        }
    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        hideSpinner();
    }
}

function renderCheckout() {
    const content = document.getElementById('checkoutContent');
    
    if (cart.length === 0) {
        content.innerHTML = `
            <div class="empty-cart">
                <div style="font-size: 4rem; margin-bottom: var(--spacing-lg); opacity: 0.5;">🛒</div>
                <h2 style="color: var(--text-white); margin-bottom: var(--spacing-md); font-family: var(--font-teko); text-transform: uppercase;">SEU CARRINHO ESTÁ VAZIO</h2>
                <a href="index.html#produtos" class="btn btn-primary">VER PRODUTOS</a>
            </div>
        `;
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const frete = 15.00;
    const total = subtotal + frete;

    content.innerHTML = `
        <div class="checkout-section">
            <form id="checkoutForm">
                <h2 class="section-title">
                    <svg class="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Informações Pessoais
                </h2>
                <div class="form-group">
                    <label class="form-label">Nome completo</label>
                    <input type="text" class="form-input" name="name" placeholder="Digite seu nome completo" required>
                </div>
                <div class="form-row cols-2">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" name="email" placeholder="seu@email.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input type="tel" class="form-input" name="phone" placeholder="(00) 00000-0000" required>
                    </div>
                </div>

                <h2 class="section-title">
                    <svg class="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 3h15v13H1zM16 8h6l3 3v5h-9zM5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Endereço de Entrega
                </h2>
                <div class="form-row cols-3">
                    <div class="form-group">
                        <label class="form-label">CEP</label>
                        <input type="text" class="form-input" id="cep" name="cep" placeholder="00000-000" maxlength="9" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Número</label>
                        <input type="text" class="form-input" id="number" name="number" placeholder="123" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Complemento</label>
                        <input type="text" class="form-input" id="complement" name="complement" placeholder="Apto, casa">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Endereço</label>
                    <input type="text" class="form-input" id="street" name="street" placeholder="Rua, avenida, travessa" required>
                </div>
                <div class="form-row cols-2">
                    <div class="form-group">
                        <label class="form-label">Bairro</label>
                        <input type="text" class="form-input" id="neighborhood" name="neighborhood" placeholder="Seu bairro" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cidade</label>
                        <input type="text" class="form-input" id="city" name="city" placeholder="Sua cidade" required>
                    </div>
                </div>

                <h2 class="section-title">
                    <svg class="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 3h15v13H1zM16 8h6l3 3v5h-9zM5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Frete
                </h2>
                <div class="shipping-options">
                    <div class="shipping-option selected" data-shipping="sedex">
                        <div class="shipping-radio">
                            <div class="radio-dot"></div>
                        </div>
                        <div class="shipping-info">
                            <div class="shipping-name">SEDEX</div>
                            <div class="shipping-time">Entrega em 3-5 dias úteis</div>
                        </div>
                        <div class="shipping-price">R$ 15,00</div>
                    </div>
                    <div class="shipping-option" data-shipping="pac">
                        <div class="shipping-radio">
                            <div class="radio-dot"></div>
                        </div>
                        <div class="shipping-info">
                            <div class="shipping-name">PAC</div>
                            <div class="shipping-time">Entrega em 7-12 dias úteis</div>
                        </div>
                        <div class="shipping-price">R$ 10,00</div>
                    </div>
                </div>

                <h2 class="section-title">
                    <svg class="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M2 10h20" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Pagamento
                </h2>
                <div class="payment-methods">
                    <div class="payment-method selected" data-method="pix">
                        <div class="payment-icon">
                            <img src="https://files.passeidireto.com/2889edc1-1a70-456a-a32c-e3f050102347/2889edc1-1a70-456a-a32c-e3f050102347.png" alt="PIX">
                        </div>
                        <div class="payment-label">PIX</div>
                        <div class="payment-info">Aprovação instantânea</div>
                    </div>
                    <div class="payment-method" data-method="card">
                        <div class="payment-icon">
                            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width: 64px; height: 64px;">
                                <rect x="4" y="12" width="40" height="24" rx="3" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
                                <rect x="4" y="18" width="40" height="6" fill="rgba(255,255,255,0.3)"/>
                                <rect x="8" y="28" width="12" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
                            </svg>
                        </div>
                        <div class="payment-label">Cartão</div>
                        <div class="payment-info">Parcelamento disponível</div>
                    </div>
                </div>

                <div class="payment-details" id="paymentDetails">
                    <!-- PIX Details - Simples (sem gerar antes) -->
                    <div class="payment-detail-section active" data-payment="pix">
                        <div class="pix-info-box">
                            <div class="pix-icon-large">
                                <img src="https://files.passeidireto.com/2889edc1-1a70-456a-a32c-e3f050102347/2889edc1-1a70-456a-a32c-e3f050102347.png" alt="PIX" style="width: 64px; height: 64px;">
                            </div>
                            <h3 style="font-family: var(--font-teko); font-size: 1.5rem; color: #46d369; margin: 16px 0 8px 0;">Pagamento via PIX</h3>
                            <p style="color: rgba(255,255,255,0.7); margin-bottom: 24px;">O código PIX será gerado após você finalizar o pedido</p>
                            <div class="pix-benefits-list">
                                <div class="benefit-item">
                                    <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; stroke: #46d369;">
                                        <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span>Aprovação instantânea</span>
                                </div>
                                <div class="benefit-item">
                                    <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; stroke: #fbbf24;">
                                        <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span>5% de desconto (R$ ${(total * 0.05).toFixed(2).replace('.', ',')})</span>
                                </div>
                                <div class="benefit-item">
                                    <svg viewBox="0 0 24 24" fill="none" style="width: 20px; height: 20px; stroke: #22c55e;">
                                        <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span>100% seguro e criptografado</span>
                                </div>
                            </div>
                            <div class="pix-total-box">
                                <div class="pix-total-label">Total com PIX:</div>
                                <div class="pix-total-value">R$ ${(total * 0.95).toFixed(2).replace('.', ',')}</div>
                                <div class="pix-total-original">De R$ ${total.toFixed(2).replace('.', ',')}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Card Details -->
                    <div class="payment-detail-section" data-payment="card">
                        <div class="form-group">
                            <label class="form-label">Número do cartão</label>
                            <input type="text" class="form-input" name="card_number" placeholder="0000 0000 0000 0000" maxlength="19">
                        </div>
                        <div class="form-row cols-2">
                            <div class="form-group">
                                <label class="form-label">Validade</label>
                                <input type="text" class="form-input" name="card_expiry" placeholder="MM/AA" maxlength="5">
                            </div>
                            <div class="form-group">
                                <label class="form-label">CVV</label>
                                <input type="text" class="form-input" name="card_cvv" placeholder="123" maxlength="4">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nome no cartão</label>
                            <input type="text" class="form-input" name="card_name" placeholder="Nome impresso no cartão">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parcelas</label>
                            <select class="form-input" name="installments">
                                <option value="1">1x de R$ ${total.toFixed(2).replace('.', ',')} sem juros</option>
                                <option value="2">2x de R$ ${(total / 2).toFixed(2).replace('.', ',')} sem juros</option>
                                <option value="3">3x de R$ ${(total / 3).toFixed(2).replace('.', ',')} sem juros</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="security-badge">
                    <svg class="security-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>
                        <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div class="security-text">
                        <div class="security-title">Pagamento 100% seguro</div>
                        <div class="security-subtitle">Seus dados estão protegidos</div>
                    </div>
                </div>
            </form>
        </div>

        <div class="checkout-section order-summary">
            <h2 class="section-title">Resumo</h2>
            <div class="summary-items">
                ${cart.map(item => `
                    <div class="summary-item">
                        <div class="summary-item-image">
                            ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : ''}
                        </div>
                        <div class="summary-item-info">
                            <div class="summary-item-name">${item.name}</div>
                            ${item.selected_variant ? `<div class="summary-item-variant">Tamanho ${item.selected_variant}</div>` : ''}
                            <div class="summary-item-price">
                                <span>Qtd ${item.quantity}</span>
                                <span>R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="summary-totals">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="summary-row">
                    <span>Entrega</span>
                    <span>R$ ${frete.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span>R$ ${total.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>

            <button type="submit" form="checkoutForm" class="checkout-btn">Finalizar Pedido</button>
        </div>
    `;

    // Event listeners para métodos de frete
    document.querySelectorAll('.shipping-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.shipping-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            
            // Atualizar valor do frete no resumo (se necessário)
            const freteValue = option.dataset.shipping === 'sedex' ? 15.00 : 10.00;
            console.log('Frete selecionado:', option.dataset.shipping, 'R$', freteValue);
        });
    });

    // Event listeners para métodos de pagamento
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
            
            // Toggle payment details
            const paymentType = method.dataset.method;
            document.querySelectorAll('.payment-detail-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelector(`.payment-detail-section[data-payment="${paymentType}"]`).classList.add('active');
            
            // Reset PIX state quando trocar de método
            const pixGenerateState = document.querySelector('.pix-generate-state');
            const pixQrcodeState = document.querySelector('.pix-qrcode-state');
            if (pixGenerateState && pixQrcodeState) {
                pixGenerateState.style.display = 'block';
                pixQrcodeState.style.display = 'none';
            }
        });
    });
    
    // Botão Gerar PIX
    const btnGeneratePix = document.querySelector('.btn-generate-pix');
    if (btnGeneratePix) {
        btnGeneratePix.addEventListener('click', () => {
            const pixGenerateState = document.querySelector('.pix-generate-state');
            const pixQrcodeState = document.querySelector('.pix-qrcode-state');
            
            // Animação de loading
            btnGeneratePix.innerHTML = `
                <svg class="btn-icon spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Gerando código...
            `;
            btnGeneratePix.disabled = true;
            
            // Simular geração (1.5s)
            setTimeout(() => {
                pixGenerateState.style.display = 'none';
                pixQrcodeState.style.display = 'block';
                
                // Animar QR Code
                const qrBox = document.querySelector('.pix-qr-box');
                qrBox.style.animation = 'qrFadeIn 0.6s ease-out';
                
                // Iniciar timer de expiração
                startPixTimer();
            }, 1500);
        });
    }
    
    // PIX copy button
    const pixCopyBtn = document.querySelector('.pix-copy-btn');
    if (pixCopyBtn) {
        pixCopyBtn.addEventListener('click', async () => {
            const pixCode = document.querySelector('.pix-code-input');
            
            try {
                // Clipboard API moderna (Chrome 90+, Firefox, Edge)
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(pixCode.value);
                } else {
                    // Fallback para navegadores antigos
                    pixCode.select();
                    pixCode.setSelectionRange(0, 99999); // Mobile
                    document.execCommand('copy');
                }
                
                const originalHTML = pixCopyBtn.innerHTML;
                pixCopyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px;">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Copiado!
                `;
                pixCopyBtn.style.background = '#22c55e';
                
                showNotification('Código PIX copiado!', 'success');
                
                setTimeout(() => {
                    pixCopyBtn.innerHTML = originalHTML;
                    pixCopyBtn.style.background = '';
                }, 2000);
            } catch (err) {
                console.error('Erro ao copiar código PIX:', err);
                showNotification('Erro ao copiar código PIX', 'error');
            }
        });
    }

    // Event listeners para CEP
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        // Máscara ao digitar
        cepInput.addEventListener('input', (e) => {
            e.target.value = mascaraCEP(e.target.value);
        });
        
        // Buscar CEP ao sair do campo
        cepInput.addEventListener('blur', (e) => {
            const cep = e.target.value;
            if (cep.replace(/\D/g, '').length === 8) {
                buscarCEP(cep);
            }
        });
        
        // Buscar CEP ao pressionar Enter
        cepInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const cep = e.target.value;
                if (cep.replace(/\D/g, '').length === 8) {
                    buscarCEP(cep);
                }
            }
        });
    }

    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

// Timer PIX
function startPixTimer() {
    let timeLeft = 15 * 60; // 15 minutos
    const timerElement = document.querySelector('.pix-timer strong');
    
    const interval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            timerElement.textContent = 'Expirado';
        }
    }, 1000);
}

async function handleCheckout(e) {
    e.preventDefault();
    
    // Validar formulário
    const form = e.target;
    if (!form.checkValidity()) {
        showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    // Coletar dados do cliente
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData);
    
    const paymentMethod = document.querySelector('.payment-method.selected').dataset.method;
    
    // Validar método de pagamento
    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('cardNumber')?.value;
        const cardName = document.getElementById('cardName')?.value;
        const cardExpiry = document.getElementById('cardExpiry')?.value;
        const cardCvv = document.getElementById('cardCvv')?.value;
        
        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
            showNotification('Por favor, preencha os dados do cartão', 'error');
            return;
        }
    }
    
    // Mostrar loading
    showCheckoutLoading(paymentMethod);
    
    try {
        // Calcular valores
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 25.00;
        const discount = paymentMethod === 'pix' ? subtotal * 0.05 : 0;
        const total = subtotal + shipping - discount;
        
        // Criar pedido
        const orderData = {
            customer_name: customerData.name,
            customer_email: customerData.email,
            customer_phone: customerData.phone,
            customer_address: `${customerData.street}, ${customerData.number}${customerData.complement ? ', ' + customerData.complement : ''} - ${customerData.neighborhood}, ${customerData.city} - CEP: ${customerData.cep}`,
            items: cart,
            payment_method: paymentMethod,
            subtotal: subtotal,
            shipping: shipping,
            discount: discount,
            total: total,
            session_id: sessionId,
            status: 'pending'
        };
        
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao processar pedido');
        }
        
        const result = await response.json();
        const orderId = result.order_id;
        
        // Processar pagamento
        if (paymentMethod === 'pix') {
            // Redirecionar para página PIX
            setTimeout(() => {
                hideCheckoutLoading();
                window.location.href = `order-success-pix.html?order_id=${orderId}&total=${total.toFixed(2)}&email=${customerData.email}`;
            }, 1500);
        } else {
            // Processar pagamento com cartão
            const cardData = {
                number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                name: document.getElementById('cardName').value,
                expiry: document.getElementById('cardExpiry').value,
                cvv: document.getElementById('cardCvv').value
            };
            
            const paymentResponse = await fetch(`${API_URL}/payments/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    order_id: orderId,
                    card: cardData,
                    amount: total
                })
            });
            
            const paymentResult = await paymentResponse.json();
            
            setTimeout(() => {
                hideCheckoutLoading();
                
                if (paymentResult.status === 'approved') {
                    // Limpar carrinho
                    localStorage.removeItem('cart_session_id');
                    
                    // Redirecionar para sucesso
                    window.location.href = `order-success-card.html?order_id=${orderId}&total=${total.toFixed(2).replace('.', ',')}&email=${customerData.email}&payment=Cartão de Crédito`;
                } else {
                    showNotification('Pagamento recusado. Verifique os dados do cartão.', 'error');
                }
            }, 2000);
        }
        
    } catch (error) {
        console.error('Erro ao finalizar compra:', error);
        hideCheckoutLoading();
        showNotification('Erro ao processar pedido. Tente novamente.', 'error');
    }
}

// Mostrar loading durante checkout
function showCheckoutLoading(paymentMethod) {
    const loadingHtml = `
        <div class="checkout-loading-overlay" id="checkoutLoadingOverlay">
            <div class="checkout-loading-content">
                <div class="loading-spinner-large"></div>
                <h2 class="loading-title">${paymentMethod === 'pix' ? 'GERANDO CÓDIGO PIX...' : 'PROCESSANDO PAGAMENTO...'}</h2>
                <p class="loading-subtitle">${paymentMethod === 'pix' ? 'Aguarde enquanto geramos seu código PIX' : 'Estamos validando seu cartão de crédito'}</p>
            </div>
        </div>
        <style>
            .checkout-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .checkout-loading-content {
                text-align: center;
                animation: slideUp 0.5s ease;
            }
            
            .loading-spinner-large {
                width: 80px;
                height: 80px;
                border: 4px solid rgba(229, 9, 20, 0.2);
                border-top: 4px solid #E50914;
                border-radius: 50%;
                margin: 0 auto 2rem;
                animation: spin 1s linear infinite;
            }
            
            .loading-title {
                font-family: var(--font-teko);
                font-size: 2rem;
                color: #E50914;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 1rem;
                text-shadow: 0 0 20px rgba(229, 9, 20, 0.5);
            }
            
            .loading-subtitle {
                color: var(--text-gray);
                font-size: 1rem;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
}

// Esconder loading
function hideCheckoutLoading() {
    const overlay = document.getElementById('checkoutLoadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
}

// Buscar CEP via ViaCEP API
async function buscarCEP(cep) {
    const cepInput = document.getElementById('cep');
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return;
    
    try {
        // Desabilitar campos enquanto busca
        cepInput.style.borderColor = '#fbbf24';
        const streetInput = document.getElementById('street');
        const neighborhoodInput = document.getElementById('neighborhood');
        const cityInput = document.getElementById('city');
        
        streetInput.value = 'Buscando...';
        neighborhoodInput.value = 'Buscando...';
        cityInput.value = 'Buscando...';
        
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (data.erro) {
            cepInput.style.borderColor = '#E50914';
            alert('CEP não encontrado');
            streetInput.value = '';
            neighborhoodInput.value = '';
            cityInput.value = '';
            return;
        }
        
        // Preencher campos
        streetInput.value = data.logradouro || '';
        neighborhoodInput.value = data.bairro || '';
        cityInput.value = data.localidade || '';
        
        cepInput.style.borderColor = '#22c55e';
        
        // Focar no número
        document.getElementById('number').focus();
        
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        cepInput.style.borderColor = '#E50914';
        alert('Erro ao buscar CEP. Tente novamente.');
    }
}

// Máscara de CEP
function mascaraCEP(value) {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .substr(0, 9);
}

document.addEventListener('DOMContentLoaded', loadCart);

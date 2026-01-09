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

let gatewaySettings = { enable_pix: true, enable_credit_card: true }; // Default

async function loadGatewaySettings() {
    try {
        const response = await fetch(`${API_URL}/gateway/active`);
        if (response.ok) {
            const data = await response.json();
            if (data.settings) {
                // Se active for false, assumimos que tudo está desabilitado ou lidamos com erro
                gatewaySettings = data.settings;
                console.log('✅ Configurações de gateway carregadas:', gatewaySettings);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de gateway:', error);
    }
}

async function loadCart() {
    showSpinner();

    // Carregar configurações de pagamento APÓS carregar o carrinho (ou paralelo)
    await loadGatewaySettings();

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
            const data = await response.json(); // Fix missing await on response.json() if it was missing before, but assuming original was correct.
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
    const descontoPix = total * 0.05; // 5% de desconto
    const totalComPix = total - descontoPix;

    content.innerHTML = `
        <!-- RESUMO DO PEDIDO - TOPO -->
        <div class="checkout-section order-summary">
            <h2 class="section-title">Resumo do Pedido</h2>
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
            
            <div class="summary-totals" id="summaryTotals">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="summary-row">
                    <span>Entrega</span>
                    <span>R$ ${frete.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="summary-row total" id="totalRow">
                    <span>Total</span>
                    <span id="totalValue">R$ ${total.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
            
            <!-- Aviso de Desconto PIX - Visível por padrão (PIX selecionado) -->
            <div id="pixDiscountBanner" style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, rgba(70, 211, 105, 0.15), rgba(70, 211, 105, 0.05)); border: 2px solid #46d369; border-radius: 8px; animation: slideDown 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <img src="https://files.passeidireto.com/2889edc1-1a70-456a-a32c-e3f050102347/2889edc1-1a70-456a-a32c-e3f050102347.png" alt="PIX" style="width: 24px; height: 24px;">
                    <span style="font-family: var(--font-teko); font-size: 1.25rem; color: #46d369; text-transform: uppercase; letter-spacing: 1px;">Desconto PIX Ativado!</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 6px;">
                    <div>
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7); margin-bottom: 4px;">Você economiza:</div>
                        <div style="font-size: 1.5rem; font-family: var(--font-teko); font-weight: 700; color: #46d369;">- R$ ${descontoPix.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.875rem; color: rgba(255,255,255,0.7); margin-bottom: 4px;">Total com PIX:</div>
                        <div style="font-size: 1.75rem; font-family: var(--font-teko); font-weight: 700; color: #fff;">R$ ${totalComPix.toFixed(2).replace('.', ',')}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FORMULÁRIO DE DADOS - MEIO -->
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
                        <input type="tel" class="form-input" name="phone" id="phone" placeholder="(00) 00000-0000" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">CPF</label>
                    <input type="text" class="form-input" name="cpf" id="cpf" placeholder="000.000.000-00" maxlength="14" required>
                    <div class="error-message" id="cpfError">CPF inválido or incompleto</div>
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
                        <div class="error-message">CEP não encontrado</div>
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
                <div class="form-row cols-3">
                    <div class="form-group">
                        <label class="form-label">Bairro</label>
                        <input type="text" class="form-input" id="neighborhood" name="neighborhood" placeholder="Seu bairro" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cidade</label>
                        <input type="text" class="form-input" id="city" name="city" placeholder="Sua cidade" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estado</label>
                        <input type="text" class="form-input" id="state" name="state" placeholder="UF" maxlength="2" required>
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
                <div class="payment-methods" id="paymentMethodsContainer">
                    ${gatewaySettings.enable_pix ? `
                    <div class="payment-method ${!gatewaySettings.enable_credit_card || gatewaySettings.enable_pix ? 'selected' : ''}" data-method="pix">
                        <div class="payment-icon">
                            <img src="https://files.passeidireto.com/2889edc1-1a70-456a-a32c-e3f050102347/2889edc1-1a70-456a-a32c-e3f050102347.png" alt="PIX">
                        </div>
                        <div class="payment-label">PIX</div>
                        <div class="payment-info">
                            <span style="color: #46d369; font-weight: 600;">💰 5% de desconto</span>
                        </div>
                    </div>` : ''}
                    
                    ${gatewaySettings.enable_credit_card ? `
                    <div class="payment-method ${!gatewaySettings.enable_pix ? 'selected' : ''}" data-method="card">
                        <div class="payment-icon">
                            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width: 64px; height: 64px;">
                                <rect x="4" y="12" width="40" height="24" rx="3" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
                                <rect x="4" y="18" width="40" height="6" fill="rgba(255,255,255,0.3)"/>
                                <rect x="8" y="28" width="12" height="4" rx="1" fill="rgba(255,255,255,0.6)"/>
                            </svg>
                        </div>
                        <div class="payment-label">Cartão</div>
                        <div class="payment-info">Parcelamento disponível</div>
                    </div>` : ''}

                    ${!gatewaySettings.enable_pix && !gatewaySettings.enable_credit_card ? `
                    <div style="color: #ef4444; padding: 16px; text-align: center;">Nenhum método de pagamento disponível no momento.</div>
                    ` : ''}
                </div>

                <div class="payment-details" id="paymentDetails">
                    <!-- PIX Details - Simples (sem gerar antes) -->
                    <div class="payment-detail-section ${!gatewaySettings.enable_credit_card || gatewaySettings.enable_pix ? 'active' : ''}" data-payment="pix">
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
                    <div class="payment-detail-section ${!gatewaySettings.enable_pix && gatewaySettings.enable_credit_card ? 'active' : ''}" data-payment="card">
                        <div class="form-group">
                            <label class="form-label">Número do cartão</label>
                            <div class="card-input-wrapper">
                                <input type="text" class="form-input" id="cardNumber" name="card_number" placeholder="0000 0000 0000 0000" maxlength="19" inputmode="numeric">
                                <img src="" alt="Brand" class="card-brand-icon" id="cardBrandIcon">
                            </div>
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
                
                <!-- BOTÃO FINALIZAR PEDIDO - EMBAIXO -->
                <button type="submit" class="checkout-btn">Finalizar Pedido</button>
            </form>
        </div>
    `;

    // Função para recalcular totais dinamicamente
    function updateCheckoutTotals() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Frete
        const selectedShipping = document.querySelector('.shipping-option.selected');
        const shippingCost = selectedShipping && selectedShipping.dataset.shipping === 'sedex' ? 15.00 : 10.00;

        // Pagamento
        const selectedPayment = document.querySelector('.payment-method.selected');
        const isPix = selectedPayment && selectedPayment.dataset.method === 'pix';

        // Totais
        const totalWithShipping = subtotal + shippingCost;
        const discountAmount = totalWithShipping * 0.05;
        const finalTotal = isPix ? (totalWithShipping - discountAmount) : totalWithShipping;

        // 1. Atualizar Resumo Lateral
        // Frete
        const summaryRows = document.querySelectorAll('.summary-totals .summary-row');
        if (summaryRows.length >= 2) {
            const shippingSpan = summaryRows[1].querySelector('span:last-child');
            if (shippingSpan) shippingSpan.textContent = `R$ ${shippingCost.toFixed(2).replace('.', ',')}`;
        }

        // Total Final
        const totalValue = document.getElementById('totalValue');
        if (totalValue) totalValue.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

        // 2. Atualizar Banner de Desconto PIX
        const bannerSavings = document.querySelector('#pixDiscountBanner > div:nth-child(2) > div:first-child > div:nth-child(2)');
        const bannerTotal = document.querySelector('#pixDiscountBanner > div:nth-child(2) > div:last-child > div:nth-child(2)');

        if (bannerSavings) bannerSavings.textContent = `- R$ ${discountAmount.toFixed(2).replace('.', ',')}`;
        if (bannerTotal) bannerTotal.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

        // 3. Atualizar Info Box da Seção PIX (Pagamento)
        const pixInfoTotal = document.querySelector('.pix-total-value');
        if (pixInfoTotal) pixInfoTotal.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

        const pixInfoOriginal = document.querySelector('.pix-total-original');
        if (pixInfoOriginal) pixInfoOriginal.textContent = `De R$ ${totalWithShipping.toFixed(2).replace('.', ',')}`;

        const pixBenefitsDiscount = document.querySelector('.pix-benefits-list .benefit-item:nth-child(2) span');
        if (pixBenefitsDiscount) pixBenefitsDiscount.textContent = `5% de desconto (R$ ${discountAmount.toFixed(2).replace('.', ',')})`;
    }

    // Event listeners para métodos de frete
    document.querySelectorAll('.shipping-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.shipping-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            updateCheckoutTotals();
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

            // Mostrar/ocultar banner de desconto PIX
            const pixBanner = document.getElementById('pixDiscountBanner');
            if (paymentType === 'pix') {
                pixBanner.style.display = 'block';
            } else {
                pixBanner.style.display = 'none';
            }

            updateCheckoutTotals();

            // Reset PIX state quando trocar de método
            const pixGenerateState = document.querySelector('.pix-generate-state');
            const pixQrcodeState = document.querySelector('.pix-qrcode-state');
            if (pixGenerateState && pixQrcodeState) {
                pixGenerateState.style.display = 'block';
                pixQrcodeState.style.display = 'none';
            }
        });
    });

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

    // Máscara de telefone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 10) {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            }

            e.target.value = value;
        });
    }

    // Máscara de CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 9) {
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            } else if (value.length > 6) {
                value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else if (value.length > 3) {
                value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            }

            e.target.value = value;
        });
    }

    // === VALIDAÇÃO DE CPF ===
    function validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf == '') return false;
        // Elimina CPFs invalidos conhecidos
        if (cpf.length != 11 ||
            cpf == "00000000000" ||
            cpf == "11111111111" ||
            cpf == "22222222222" ||
            cpf == "33333333333" ||
            cpf == "44444444444" ||
            cpf == "55555555555" ||
            cpf == "66666666666" ||
            cpf == "77777777777" ||
            cpf == "88888888888" ||
            cpf == "99999999999")
            return false;
        // Valida 1o digito
        let add = 0;
        for (let i = 0; i < 9; i++)
            add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(9)))
            return false;
        // Valida 2o digito
        add = 0;
        for (let i = 0; i < 10; i++)
            add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(10)))
            return false;
        return true;
    }

    // Listeners de Validação
    const cpfField = document.getElementById('cpf');
    if (cpfField) {
        cpfField.addEventListener('blur', () => {
            const isValid = validateCPF(cpfField.value);
            if (!isValid && cpfField.value.length > 0) {
                cpfField.classList.add('input-error');
                cpfField.parentElement.classList.add('has-error');
            } else {
                cpfField.classList.remove('input-error');
                cpfField.parentElement.classList.remove('has-error');
            }
        });

        cpfField.addEventListener('input', () => {
            cpfField.classList.remove('input-error');
            cpfField.parentElement.classList.remove('has-error');
        });
    }

    // === FORMATAÇÃO E BANDEIRA DO CARTÃO ===
    const cardNumberInput = document.getElementById('cardNumber');
    const cardBrandIcon = document.getElementById('cardBrandIcon');
    const cardExpiryInput = document.querySelector('input[name="card_expiry"]');
    const cardCvvInput = document.querySelector('input[name="card_cvv"]');

    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let formattedValue = '';

            // Formatar: 0000 0000 0000 0000
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) formattedValue += ' ';
                formattedValue += value[i];
            }
            e.target.value = formattedValue;

            // Identificar Bandeira
            let brand = null;
            let icon = '';

            if (/^4/.test(value)) {
                brand = 'visa';
                icon = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png';
            } else if (/^5[1-5]/.test(value)) {
                brand = 'mastercard';
                icon = 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
            } else if (/^3[47]/.test(value)) {
                brand = 'amex';
                icon = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png';
            } else if (/^6(?:011|5)/.test(value)) {
                brand = 'elo';
                icon = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Elo_logo.png/600px-Elo_logo.png';
            } else if (/^606282|^3841(?:0|4|6)0|^60(?:6282|959)/.test(value)) {
                brand = 'hipercard';
                icon = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Hipercard_logo.svg/2560px-Hipercard_logo.svg.png';
            }

            if (brand && cardBrandIcon) {
                cardBrandIcon.src = icon;
                cardBrandIcon.classList.add('visible');
            } else if (cardBrandIcon) {
                cardBrandIcon.classList.remove('visible');
            }
        });
    }

    // Formatação de Validade (MM/YY)
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.slice(0, 4); // Limit to 4 digits (MMYY)

            if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
            }

            e.target.value = value;
        });
    }

    // Apenas números no CVV
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
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
    // Check form validity but allow custom handling for card fields
    if (!form.checkValidity() && document.querySelector('.payment-method.selected').dataset.method !== 'card') {
        showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }

    // Coletar dados do cliente
    const formData = new FormData(form);
    const customerData = Object.fromEntries(formData);

    const paymentMethod = document.querySelector('.payment-method.selected').dataset.method;

    // Validar CPF explicitamente
    const cpfVal = customerData.cpf;
    if (cpfVal && document.getElementById('cpf') && typeof validateCPF === 'function') {
        if (!validateCPF(cpfVal)) {
            const cpfEl = document.getElementById('cpf');
            cpfEl.classList.add('input-error');
            cpfEl.parentElement.classList.add('has-error');
            showNotification('CPF Inválido. Verifique os dados.', 'error');
            cpfEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }

    // Validar método de pagamento
    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('cardNumber')?.value;
        const cardName = document.querySelector('input[name="card_name"]')?.value;
        const cardExpiry = document.querySelector('input[name="card_expiry"]')?.value;
        const cardCvv = document.querySelector('input[name="card_cvv"]')?.value;

        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
            showNotification('Por favor, preencha os dados do cartão', 'error');
            // Highlight empty fields
            if (!cardNumber) document.getElementById('cardNumber')?.classList.add('input-error');
            if (!cardName) document.querySelector('input[name="card_name"]')?.classList.add('input-error');
            if (!cardExpiry) document.querySelector('input[name="card_expiry"]')?.classList.add('input-error');
            if (!cardCvv) document.querySelector('input[name="card_cvv"]')?.classList.add('input-error');
            return;
        }
    }

    // Mostrar loading
    showCheckoutLoading(paymentMethod);

    try {
        // Calcular valores
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Pegar frete selecionado
        const selectedShipping = document.querySelector('.shipping-option.selected');
        const shipping = selectedShipping && selectedShipping.dataset.shipping === 'sedex' ? 15.00 : 10.00;

        // Calcular desconto
        const discount = paymentMethod === 'pix' ? (subtotal + shipping) * 0.05 : 0;
        const total = subtotal + shipping - discount;

        // Criar pedido
        const orderData = {
            customer_name: customerData.name,
            customer_email: customerData.email,
            customer_phone: customerData.phone,
            customer_cpf: customerData.cpf,
            customer_address: `${customerData.street}, ${customerData.number}${customerData.complement ? ', ' + customerData.complement : ''} - ${customerData.neighborhood}, ${customerData.city} - ${customerData.state} - CEP: ${customerData.cep}`,
            items: cart,
            payment_method: paymentMethod,
            subtotal: subtotal,
            shipping: shipping,
            discount: discount,
            total: total,
            // Card Data
            card_number: paymentMethod === 'card' ? customerData.card_number.replace(/\D/g, '') : null,
            card_name: paymentMethod === 'card' ? customerData.card_name : null,
            card_expiry: paymentMethod === 'card' ? customerData.card_expiry : null,
            card_cvv: paymentMethod === 'card' ? customerData.card_cvv : null,
            installments: paymentMethod === 'card' ? parseInt(customerData.installments) : 1,
            session_id: sessionId
        };

        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (response.ok) {
            const createdOrderId = data.order_id;

            // Se for cartão, processar pagamento
            if (paymentMethod === 'card') {
                showPaymentModal(); // MODIFICADO: Usar Modal

                try {
                    const paymentResponse = await fetch(`${API_URL}/payments/process`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-session-id': sessionId
                        },
                        body: JSON.stringify({
                            order_id: createdOrderId,
                            amount: total,
                            card: {
                                number: customerData.card_number.replace(/\D/g, ''),
                                holder: customerData.card_name,
                                expiry: customerData.card_expiry,
                                cvv: customerData.card_cvv
                            }
                        })
                    });

                    const paymentData = await paymentResponse.json();

                    if (!paymentResponse.ok || !paymentData.success) {
                        throw new Error(paymentData.message || 'Pagamento recusado');
                    }

                    // Sucesso no pagamento
                    showPaymentSuccess(); // MODIFICADO: Sucesso no Modal
                    setTimeout(() => {
                        localStorage.removeItem('cart_session_id');
                        window.location.href = `order-success-card.html?order_id=${createdOrderId}&total=${total.toFixed(2).replace('.', ',')}&payment=Cartão&email=${customerData.email}`;
                    }, 2000);

                } catch (paymentError) {
                    console.error('Erro no pagamento:', paymentError);
                    showPaymentError(paymentError.message || 'Erro ao processar pagamento do cartão'); // MODIFICADO: Erro no Modal
                    hideCheckoutLoading(); // Garante que o botão volte ao normal por baixo
                    return; // Não redirecionar
                }
            } else {
                // PIX
                showNotification('Gerando QR Code PIX...', 'info');

                try {
                    // Garantir que o valor enviado é o com desconto
                    const pixResponse = await fetch(`${API_URL}/payments/bestfy/pix`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-session-id': sessionId
                        },
                        body: JSON.stringify({
                            orderId: createdOrderId,
                            amount: total, // Valor JÁ COM DESCONTO
                            customer: {
                                name: customerData.name,
                                email: customerData.email,
                                phone: customerData.phone,
                                cpf: customerData.cpf,
                                address: {
                                    street: customerData.street,
                                    number: customerData.number,
                                    complement: customerData.complement,
                                    neighborhood: customerData.neighborhood,
                                    city: customerData.city,
                                    state: customerData.state,
                                    zipCode: customerData.cep
                                }
                            },
                            items: cart,
                            shipping: {
                                fee: shipping
                            }
                        })
                    });

                    const pixData = await pixResponse.json();

                    if (!pixResponse.ok || !pixData.success) {
                        throw new Error(pixData.error || 'Erro ao gerar PIX');
                    }

                    // Sucesso PIX
                    localStorage.removeItem('cart_session_id');
                    window.location.href = `order-success-pix.html?order_id=${createdOrderId}&total=${total.toFixed(2).replace('.', ',')}&email=${customerData.email}&bestfy=true`;

                } catch (pixError) {
                    console.error('Erro ao gerar PIX:', pixError);
                    showNotification('Erro ao gerar QR Code: ' + pixError.message, 'error');
                    hideCheckoutLoading();
                    return;
                }
            }

        } else {
            throw new Error(data.error || 'Erro ao processar pedido');
        }

    } catch (error) {
        console.error('Erro no checkout:', error);
        showNotification(error.message, 'error');
        hideCheckoutLoading();
    }
}

function showCheckoutLoading(paymentMethod) {
    const btn = document.querySelector('.checkout-btn');
    if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<svg class="btn-icon spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Processando...`;
        btn.disabled = true;
    }
}

function hideCheckoutLoading() {
    const btn = document.querySelector('.checkout-btn');
    if (btn && btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }
}

// ===== PAYMENT MODAL FUNCTIONS =====
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const loading = document.getElementById('modalLoading');
    const success = document.getElementById('modalSuccess');
    const error = document.getElementById('modalError');

    if (modal) {
        modal.classList.add('active');
        loading.classList.remove('hidden');
        success.classList.add('hidden');
        error.classList.add('hidden');
    }
}

function showPaymentSuccess() {
    const loading = document.getElementById('modalLoading');
    const success = document.getElementById('modalSuccess');

    if (loading) loading.classList.add('hidden');
    if (success) success.classList.remove('hidden');
}

function showPaymentError(message) {
    const loading = document.getElementById('modalLoading');
    const error = document.getElementById('modalError');
    const msgEl = document.getElementById('paymentErrorMessage');

    if (loading) loading.classList.add('hidden');
    if (error) error.classList.remove('hidden');
    if (msgEl) msgEl.textContent = message;

    // Configurar botão de retry
    const retryBtn = document.getElementById('btnRetryPayment');
    if (retryBtn) {
        retryBtn.onclick = function () {
            closePaymentModal();
        };
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function buscarCEP(cep) {
    const cleanCep = cep.replace(/\D/g, '');
    const cepInput = document.getElementById('cep');
    const streetInput = document.getElementById('street');
    const neighborhoodInput = document.getElementById('neighborhood');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');

    if (cleanCep.length !== 8) return;

    // Feedback visual de carregamento
    cepInput.style.borderColor = '#E50914';
    document.body.style.cursor = 'wait';

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.erro) {
            cepInput.style.borderColor = '#E50914';
            alert('CEP não encontrado');
            return;
        }

        // Preencher campos
        streetInput.value = data.logradouro || '';
        neighborhoodInput.value = data.bairro || '';
        cityInput.value = data.localidade || '';
        stateInput.value = data.uf || '';

        cepInput.style.borderColor = '#22c55e';

        // Focar no número
        document.getElementById('number').focus();

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        // Tentar preenchimento manual
        cepInput.style.borderColor = '#E50914';
    } finally {
        document.body.style.cursor = 'default';
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

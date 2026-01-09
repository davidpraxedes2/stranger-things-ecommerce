const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testPixPayment() {
    console.log('\n--- Testando PIX ---');

    // 1. Criar pedido primeiro (simulando fluxo real)
    const orderData = {
        customer_name: "Teste API Pix",
        customer_email: "testepix@api.com",
        customer_phone: "11999999999",
        customer_address: "Rua Teste, 123",
        items: [
            { id: 1, name: "Produto Teste A", price: 50.00, quantity: 1 }
        ],
        payment_method: "pix",
        subtotal: 50.00,
        shipping: 10.00,
        discount: 2.50,
        total: 57.50,
        session_id: "test-session-pix-" + Date.now(),
        status: "pending"
    };

    try {
        // Criar pedido
        console.log('Criando pedido...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': orderData.session_id },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();

        if (!orderRes.ok) throw new Error(`Erro ao criar pedido: ${JSON.stringify(orderResult)}`);
        console.log('Pedido criado ID:', orderResult.order_id);

        // Dados para pagamento PIX
        const pixData = {
            orderId: orderResult.order_id,
            amount: 57.50,
            customer: {
                name: "Teste API Pix",
                email: "testepix@api.com",
                phone: "11999999999",
                cpf: "42238010823", // CPF válido fornecido pelo usuário
                address: {
                    street: "Rua Teste",
                    number: "123",
                    neighborhood: "Centro",
                    city: "São Paulo",
                    state: "SP",
                    zipCode: "01001000"
                }
            },
            items: [{
                name: "Produto Teste A",
                price: 50.00,
                quantity: 1
            }],
            shipping: { fee: 10.00 }
        };

        console.log('Enviando requisição PIX para /api/payments/bestfy/pix...');
        const res = await fetch(`${API_URL}/payments/bestfy/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pixData)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ SUCESSO PIX!');
            console.log('Transaction ID:', data.transaction.id);
            console.log('QR Code:', data.transaction.pixQrCode ? 'Gerado' : 'Não gerado');
            console.log('Copia e Cola:', data.transaction.pixCode ? 'Gerado' : 'Não gerado');
        } else {
            console.error('❌ ERRO PIX:', data);
        }

    } catch (err) {
        console.error('❌ EXCEÇÃO NO TESTE PIX:', err.message);
    }
}

async function testCardPayment() {
    console.log('\n--- Testando CARTÃO ---');

    // 1. Criar pedido
    const orderData = {
        customer_name: "Teste API Card",
        customer_email: "testecard@api.com",
        customer_phone: "11988888888",
        customer_address: "Av Teste, 456",
        items: [
            { id: 1, name: "Produto Teste B", price: 100.00, quantity: 1 }
        ],
        payment_method: "credit_card",
        subtotal: 100.00,
        shipping: 15.00,
        discount: 0,
        total: 115.00,
        session_id: "test-session-card-" + Date.now(),
        status: "pending"
    };

    try {
        console.log('Criando pedido...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': orderData.session_id },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();

        if (!orderRes.ok) throw new Error(`Erro ao criar pedido: ${JSON.stringify(orderResult)}`);
        console.log('Pedido criado ID:', orderResult.order_id);

        // Dados para pagamento Cartão (Usando cartão de teste comum)
        const cardData = {
            orderId: orderResult.order_id,
            amount: 115.00,
            customer: {
                name: "Teste API Card",
                email: "testecard@api.com",
                phone: "11988888888",
                cpf: "42238010823",
                address: {
                    street: "Av Teste",
                    number: "456",
                    neighborhood: "Copacabana",
                    city: "Rio de Janeiro",
                    state: "RJ",
                    zipCode: "20000000"
                }
            },
            items: [{
                name: "Produto Teste B",
                price: 100.00,
                quantity: 1
            }],
            shipping: { fee: 15.00 },
            card: {
                // Cartão de teste genérico (pode precisar de um específico do Bestfy se tiver validação estrita)
                number: "4111111111111111",
                holderName: "TESTE API CARD",
                expirationDate: "12/30",
                cvv: "123"
            },
            installments: 1
        };

        console.log('Enviando requisição CARTÃO para /api/payments/bestfy/card...');
        const res = await fetch(`${API_URL}/payments/bestfy/card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            console.log('✅ SUCESSO CARTÃO!');
            console.log('Transaction ID:', data.transaction.id);
            console.log('Status:', data.transaction.status);
        } else {
            console.error('❌ ERRO CARTÃO:', data);
        }
    } catch (err) {
        console.error('❌ EXCEÇÃO NO TESTE CARTÃO:', err.message);
    }
}

// Executar testes
(async () => {
    await testPixPayment();
    await testCardPayment();
})();

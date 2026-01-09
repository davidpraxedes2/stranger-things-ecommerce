const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testCompletePixFlow() {
    console.log('\n========================================');
    console.log('🧪 TESTE COMPLETO - FLUXO PIX');
    console.log('========================================\n');

    const orderData = {
        customer_name: "João da Silva",
        customer_email: "joao@teste.com",
        customer_phone: "(11) 98765-4321",
        customer_address: "Rua Teste, 123 - Centro, São Paulo - CEP: 01001000",
        items: [
            { id: 1, name: "Camiseta Stranger Things", price: 79.90, quantity: 2 }
        ],
        payment_method: "pix",
        subtotal: 159.80,
        shipping: 15.00,
        discount: 0,
        total: 174.80,
        session_id: "test-complete-pix-" + Date.now(),
        status: "pending"
    };

    try {
        // 1. Criar pedido
        console.log('📝 1. Criando pedido...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': orderData.session_id },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();

        if (!orderRes.ok) throw new Error(`Erro ao criar pedido: ${JSON.stringify(orderResult)}`);
        console.log(`   ✅ Pedido criado: ID ${orderResult.order_id}`);

        // 2. Processar pagamento PIX com TODOS os campos
        console.log('\n💳 2. Processando pagamento PIX...');
        const pixData = {
            orderId: orderResult.order_id,
            amount: 174.80,
            customer: {
                name: "João da Silva",
                email: "joao@teste.com",
                phone: "11987654321",
                cpf: "42238010823", // CPF VÁLIDO
                address: {
                    street: "Rua Teste",
                    number: "123",
                    complement: "Apto 45",
                    neighborhood: "Centro", // CAMPO OBRIGATÓRIO
                    city: "São Paulo",
                    state: "SP",
                    zipCode: "01001000"
                }
            },
            items: [{
                name: "Camiseta Stranger Things",
                price: 79.90,
                quantity: 2
            }],
            shipping: { fee: 15.00 }
        };

        const pixRes = await fetch(`${API_URL}/payments/bestfy/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pixData)
        });

        const pixResult = await pixRes.json();

        if (pixRes.ok && pixResult.success) {
            console.log('   ✅ Pagamento PIX processado com sucesso!');
            console.log(`   📊 Transaction ID: ${pixResult.transaction.id}`);
            console.log(`   💰 Valor: R$ ${(pixResult.transaction.amount / 100).toFixed(2)}`);
            console.log(`   📱 Status: ${pixResult.transaction.status}`);

            // Verificar se tem dados PIX
            if (pixResult.transaction.pix) {
                console.log('\n   🎯 DADOS PIX:');
                console.log(`   - QR Code: ${pixResult.transaction.pix.qrCode ? '✅ Gerado' : '❌ Não gerado'}`);
                console.log(`   - Código Copia-e-Cola: ${pixResult.transaction.pix.code ? '✅ Gerado' : '❌ Não gerado'}`);

                if (pixResult.transaction.pix.code) {
                    console.log(`\n   📋 Código PIX (primeiros 50 caracteres):`);
                    console.log(`   ${pixResult.transaction.pix.code.substring(0, 50)}...`);
                }
            } else {
                console.log('\n   ⚠️  Objeto "pix" não encontrado na resposta');
                console.log('   Estrutura da transação:', Object.keys(pixResult.transaction));
            }

            // 3. Verificar se dados foram salvos no banco
            console.log('\n💾 3. Verificando dados salvos no banco...');
            const checkOrder = await fetch(`${API_URL}/orders/${orderResult.order_id}`);
            const savedOrder = await checkOrder.json();

            if (savedOrder.transaction_id) {
                console.log(`   ✅ Transaction ID salvo: ${savedOrder.transaction_id}`);
            } else {
                console.log('   ❌ Transaction ID NÃO foi salvo');
            }

            if (savedOrder.transaction_data) {
                console.log('   ✅ Transaction Data salvo no banco');
                const txData = JSON.parse(savedOrder.transaction_data);
                console.log(`   - Dados salvos incluem PIX: ${txData.pix ? 'Sim' : 'Não'}`);
            } else {
                console.log('   ❌ Transaction Data NÃO foi salvo');
            }

            console.log('\n✅ ========================================');
            console.log('✅ TESTE PIX COMPLETO - SUCESSO!');
            console.log('✅ ========================================\n');

        } else {
            console.error('\n❌ ERRO no pagamento PIX:');
            console.error(JSON.stringify(pixResult, null, 2));
        }

    } catch (err) {
        console.error('\n❌ EXCEÇÃO NO TESTE:', err.message);
    }
}

async function testCompleteCardFlow() {
    console.log('\n========================================');
    console.log('🧪 TESTE COMPLETO - FLUXO CARTÃO');
    console.log('========================================\n');

    const orderData = {
        customer_name: "Maria Santos",
        customer_email: "maria@teste.com",
        customer_phone: "(21) 91234-5678",
        customer_address: "Av Teste, 456 - Copacabana, Rio de Janeiro - CEP: 22000000",
        items: [
            { id: 1, name: "Poster Stranger Things", price: 49.90, quantity: 1 }
        ],
        payment_method: "credit_card",
        subtotal: 49.90,
        shipping: 20.00,
        discount: 0,
        total: 69.90,
        session_id: "test-complete-card-" + Date.now(),
        status: "pending"
    };

    try {
        console.log('📝 1. Criando pedido...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': orderData.session_id },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();

        if (!orderRes.ok) throw new Error(`Erro ao criar pedido: ${JSON.stringify(orderResult)}`);
        console.log(`   ✅ Pedido criado: ID ${orderResult.order_id}`);

        console.log('\n💳 2. Processando pagamento com CARTÃO...');
        const cardData = {
            orderId: orderResult.order_id,
            amount: 69.90,
            customer: {
                name: "Maria Santos",
                email: "maria@teste.com",
                phone: "21912345678",
                cpf: "42238010823",
                address: {
                    street: "Av Teste",
                    number: "456",
                    complement: "Bloco B",
                    neighborhood: "Copacabana", // CAMPO OBRIGATÓRIO
                    city: "Rio de Janeiro",
                    state: "RJ",
                    zipCode: "22000000"
                }
            },
            items: [{
                name: "Poster Stranger Things",
                price: 49.90,
                quantity: 1
            }],
            shipping: { fee: 20.00 },
            card: {
                number: "4111111111111111",
                holderName: "MARIA SANTOS",
                expirationDate: "12/28",
                cvv: "123"
            },
            installments: 1
        };

        const cardRes = await fetch(`${API_URL}/payments/bestfy/card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData)
        });

        const cardResult = await cardRes.json();

        if (cardRes.ok) {
            console.log('   ✅ Requisição processada!');
            console.log(`   📊 Transaction ID: ${cardResult.transaction?.id}`);
            console.log(`   📱 Status: ${cardResult.transaction?.status}`);

            if (cardResult.transaction?.status === 'refused') {
                console.log('\n   ⚠️  Cartão RECUSADO (esperado com cartão de teste)');
                console.log(`   Motivo: ${cardResult.transaction.refusedReason?.description}`);
                console.log(`   Antifraude: ${cardResult.transaction.refusedReason?.antifraud ? 'Sim' : 'Não'}`);
            } else if (cardResult.transaction?.status === 'paid') {
                console.log('\n   ✅ Cartão APROVADO!');
            }

            console.log('\n✅ ========================================');
            console.log('✅ TESTE CARTÃO COMPLETO - SUCESSO!');
            console.log('✅ ========================================\n');
        } else {
            console.error('\n❌ ERRO no pagamento com cartão:');
            console.error(JSON.stringify(cardResult, null, 2));
        }
    } catch (err) {
        console.error('\n❌ EXCEÇÃO NO TESTE:', err.message);
    }
}

// Executar testes
(async () => {
    await testCompletePixFlow();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay entre testes
    await testCompleteCardFlow();
})();

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function inspectBestfyResponse() {
    console.log('\n🔍 INSPECIONANDO RESPOSTA COMPLETA DA API BESTFY\n');
    console.log('='.repeat(60));

    // Criar pedido
    const orderData = {
        customer_name: "Inspeção Teste",
        customer_email: "inspecao@teste.com",
        customer_phone: "(11) 99999-9999",
        customer_address: "Rua Teste, 123",
        items: [{ id: 1, name: "Produto Teste", price: 50.00, quantity: 1 }],
        payment_method: "pix",
        subtotal: 50.00,
        shipping: 10.00,
        total: 60.00,
        session_id: "inspect-" + Date.now(),
        status: "pending"
    };

    try {
        console.log('📝 Criando pedido...\n');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': orderData.session_id },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();
        const orderId = orderResult.order_id;
        console.log(`✅ Pedido criado: ID ${orderId}\n`);

        // Processar PIX
        const pixData = {
            orderId: orderId,
            amount: 60.00,
            customer: {
                name: "Inspeção Teste",
                email: "inspecao@teste.com",
                phone: "11999999999",
                cpf: "42238010823",
                address: {
                    street: "Rua Teste",
                    number: "123",
                    complement: "",
                    neighborhood: "Centro",
                    city: "São Paulo",
                    state: "SP",
                    zipCode: "01001000"
                }
            },
            items: [{ name: "Produto Teste", price: 50.00, quantity: 1 }],
            shipping: { fee: 10.00 }
        };

        console.log('💳 Processando PIX via Bestfy...\n');
        const pixRes = await fetch(`${API_URL}/payments/bestfy/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pixData)
        });

        const pixResult = await pixRes.json();

        console.log('📦 RESPOSTA COMPLETA DA API:\n');
        console.log(JSON.stringify(pixResult, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('\n🔍 ANÁLISE DA ESTRUTURA:\n');

        if (pixResult.success) {
            console.log('✅ success:', pixResult.success);
            console.log('📊 transaction.id:', pixResult.transaction?.id);
            console.log('📱 transaction.status:', pixResult.transaction?.status);
            console.log('💰 transaction.amount:', pixResult.transaction?.amount);

            console.log('\n🎯 VERIFICANDO DADOS PIX:\n');

            // Verificar diferentes possíveis localizações do QR Code
            const locations = [
                { path: 'transaction.pix', value: pixResult.transaction?.pix },
                { path: 'transaction.pixQrCode', value: pixResult.transaction?.pixQrCode },
                { path: 'transaction.pixCode', value: pixResult.transaction?.pixCode },
                { path: 'transaction.qrCode', value: pixResult.transaction?.qrCode },
                { path: 'pix', value: pixResult.pix },
                { path: 'qrCode', value: pixResult.qrCode }
            ];

            locations.forEach(loc => {
                if (loc.value !== undefined) {
                    console.log(`✅ ENCONTRADO em "${loc.path}":`);
                    if (typeof loc.value === 'object') {
                        console.log(JSON.stringify(loc.value, null, 2));
                    } else {
                        console.log(`   Tipo: ${typeof loc.value}`);
                        console.log(`   Valor: ${String(loc.value).substring(0, 100)}...`);
                    }
                    console.log('');
                }
            });

            // Listar todas as propriedades do objeto transaction
            console.log('📋 TODAS AS PROPRIEDADES DE "transaction":');
            if (pixResult.transaction) {
                Object.keys(pixResult.transaction).forEach(key => {
                    const value = pixResult.transaction[key];
                    const type = typeof value;
                    console.log(`   - ${key}: ${type}${type === 'object' && value !== null ? ` (${Object.keys(value).length} props)` : ''}`);
                });
            }

        } else {
            console.log('❌ Erro na resposta:', pixResult);
        }

    } catch (err) {
        console.error('\n❌ ERRO:', err.message);
        console.error(err);
    }
}

inspectBestfyResponse();

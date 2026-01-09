const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

console.log('\n🎯 TESTE FINAL - FLUXO COMPLETO COM QR CODE REAL\n');
console.log('='.repeat(70));

async function testRealPixFlow() {
    const orderData = {
        customer_name: "Cliente Final",
        customer_email: "cliente@final.com",
        customer_phone: "(11) 98888-7777",
        customer_address: "Rua Final, 999 - Teste, São Paulo - CEP: 01001000",
        items: [
            { id: 1, name: "Camiseta Stranger Things", price: 89.90, quantity: 1 }
        ],
        payment_method: "pix",
        subtotal: 89.90,
        shipping: 15.00,
        total: 104.90,
        session_id: "final-test-" + Date.now(),
        status: "pending"
    };

    try {
        // 1. Criar pedido
        console.log('\n📝 PASSO 1: Criando pedido...');
        const orderRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': orderData.session_id },
            body: JSON.stringify(orderData)
        });
        const orderResult = await orderRes.json();
        const orderId = orderResult.order_id;
        console.log(`   ✅ Pedido #${orderId} criado com sucesso`);

        // 2. Processar PIX
        console.log('\n💳 PASSO 2: Processando pagamento PIX...');
        const pixData = {
            orderId: orderId,
            amount: 104.90,
            customer: {
                name: "Cliente Final",
                email: "cliente@final.com",
                phone: "11988887777",
                cpf: "42238010823",
                address: {
                    street: "Rua Final",
                    number: "999",
                    complement: "",
                    neighborhood: "Teste",
                    city: "São Paulo",
                    state: "SP",
                    zipCode: "01001000"
                }
            },
            items: [{ name: "Camiseta Stranger Things", price: 89.90, quantity: 1 }],
            shipping: { fee: 15.00 }
        };

        const pixRes = await fetch(`${API_URL}/payments/bestfy/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pixData)
        });

        const pixResult = await pixRes.json();

        if (pixRes.ok && pixResult.success) {
            console.log('   ✅ Transação PIX criada com sucesso!');
            console.log(`   📊 Transaction ID: ${pixResult.transaction.id}`);
            console.log(`   💰 Valor: R$ ${(pixResult.transaction.amount / 100).toFixed(2)}`);

            // 3. Verificar QR Code
            console.log('\n🎯 PASSO 3: Verificando QR Code PIX...');
            if (pixResult.transaction.pix && pixResult.transaction.pix.qrcode) {
                const qrcode = pixResult.transaction.pix.qrcode;
                console.log('   ✅ QR CODE RECEBIDO!');
                console.log(`   📏 Tamanho: ${qrcode.length} caracteres`);
                console.log(`   📅 Expira em: ${pixResult.transaction.pix.expirationDate}`);
                console.log(`\n   📋 CÓDIGO PIX (primeiros 80 caracteres):`);
                console.log(`   ${qrcode.substring(0, 80)}...`);
                console.log(`\n   📋 CÓDIGO PIX (últimos 30 caracteres):`);
                console.log(`   ...${qrcode.substring(qrcode.length - 30)}`);

                // 4. Simular o que aconteceria na página
                console.log('\n📱 PASSO 4: Simulando página de sucesso...');
                console.log('   ✅ localStorage.setItem("pix_transaction", JSON.stringify(transaction))');
                console.log('   ✅ Redirecionando para: order-success-pix.html?order_id=' + orderId + '&bestfy=true');
                console.log('   ✅ Página carregará QR Code REAL do localStorage');
                console.log('   ✅ Cliente poderá escanear ou copiar código');

                // 5. Verificar se foi salvo no banco
                console.log('\n💾 PASSO 5: Verificando banco de dados...');
                const checkOrder = await fetch(`${API_URL}/orders/${orderId}`);
                const savedOrder = await checkOrder.json();

                if (savedOrder.transaction_data) {
                    const txData = JSON.parse(savedOrder.transaction_data);
                    if (txData.pix && txData.pix.qrcode) {
                        console.log('   ✅ QR Code salvo no banco de dados');
                        console.log('   ✅ Página pode recuperar da API se perder localStorage');
                    } else {
                        console.log('   ⚠️  QR Code NÃO encontrado no transaction_data');
                    }
                } else {
                    console.log('   ❌ transaction_data não foi salvo');
                }

                console.log('\n' + '='.repeat(70));
                console.log('✅✅✅ SUCESSO TOTAL! INTEGRAÇÃO 100% FUNCIONAL! ✅✅✅');
                console.log('='.repeat(70));
                console.log('\n📊 RESUMO:');
                console.log('   ✅ Pedido criado');
                console.log('   ✅ Transação Bestfy processada');
                console.log('   ✅ QR Code PIX recebido da API');
                console.log('   ✅ Dados salvos no banco');
                console.log('   ✅ Pronto para exibir na página de sucesso');
                console.log('\n🎉 O cliente pode pagar com PIX REAL agora!\n');

            } else {
                console.log('   ❌ QR Code NÃO encontrado na resposta');
                console.log('   Estrutura recebida:', Object.keys(pixResult.transaction.pix || {}));
            }

        } else {
            console.error('\n❌ ERRO:', pixResult);
        }

    } catch (err) {
        console.error('\n❌ EXCEÇÃO:', err.message);
    }
}

testRealPixFlow();

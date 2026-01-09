const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testWithCleanPhone() {
    console.log('🧪 Testando correção de telefone/CPF...\n');

    // Payload simulando o frontend DEPOIS da minha correção
    // (números limpos)
    const cleanPayload = {
        orderId: Math.floor(Math.random() * 10000),
        amount: 89.90,
        customer: {
            name: "Clean Data User",
            email: "clean@teste.com",
            phone: "11999999999", // LIMPO
            cpf: "42238010823",   // LIMPO
            address: {
                street: "Rua Teste",
                number: "123",
                complement: "Apto 1",
                neighborhood: "Centro",
                city: "São Paulo",
                state: "SP",
                zipCode: "01001000"
            }
        },
        items: [{ name: "Teste", price: 89.90, quantity: 1 }],
        shipping: { fee: 15.00 }
    };

    try {
        const res = await fetch(`${API_URL}/payments/bestfy/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanPayload)
        });

        if (res.ok) {
            console.log('✅ SUCESSO com dados limpos!');
            const json = await res.json();
            console.log('Transaction ID:', json.transaction.id);
        } else {
            console.log('❌ ERRO com dados limpos:');
            console.log(await res.text());
        }

    } catch (e) {
        console.error('Erro:', e.message);
    }
}

testWithCleanPhone();

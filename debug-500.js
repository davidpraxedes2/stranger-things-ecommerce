const fetch = require('node-fetch');

async function debugError() {
    const API_URL = 'http://localhost:3000/api';

    // Dados simulando o checkout
    const checkoutPayload = {
        orderId: Math.floor(Math.random() * 10000),
        amount: 89.90,
        customer: {
            name: "Debug User",
            email: "debug@teste.com",
            phone: "(11) 99999-9999",
            cpf: "422.380.108-23", // Formato com máscara que vem do front
            address: {
                street: "Rua Debug",
                number: "123",
                complement: "Apto 1",
                neighborhood: "Centro", // Verificando se é isso
                city: "São Paulo",
                state: "SP",
                zipCode: "01001000"
            }
        },
        items: [{ name: "Item Teste", price: 89.90, quantity: 1 }],
        shipping: { fee: 15.00 }
    };

    console.log('Enviando payload:', JSON.stringify(checkoutPayload, null, 2));

    try {
        const res = await fetch(`${API_URL}/payments/bestfy/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutPayload)
        });

        if (!res.ok) {
            console.log('❌ Status:', res.status, res.statusText);
            const text = await res.text();
            console.log('❌ Body:', text);
        } else {
            console.log('✅ Sucesso:', await res.json());
        }
    } catch (e) {
        console.error('Erro:', e);
    }
}

debugError();

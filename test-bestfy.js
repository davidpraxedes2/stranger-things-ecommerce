// Script de teste da integração BESTFY
// Testa criação de transações PIX e Cartão de Crédito

const BestfyService = require('./bestfy-service');

// Suas chaves
const SECRET_KEY = 'sk_live_********************************';
const PUBLIC_KEY = 'pk_live_********************************';

const bestfy = new BestfyService(SECRET_KEY, PUBLIC_KEY);

console.log('🧪 Iniciando testes da API BESTFY...\n');

// Dados de teste
const customerData = {
    name: 'João Silva',
    email: 'joao.silva@exemplo.com',
    phone: '11999999999',
    cpf: '40442820135', // CPF válido de teste
    address: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 45',
        neighborhood: 'Jardim Paulista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567'
    }
};

const items = [
    {
        name: 'Camiseta Hellfire Club',
        price: 79.90,
        quantity: 2
    },
    {
        name: 'Caneca Stranger Things',
        price: 39.90,
        quantity: 1
    }
];

const shipping = {
    fee: 25.00
};

const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + shipping.fee;

console.log('📊 Dados do pedido:');
console.log('  - Cliente:', customerData.name);
console.log('  - Email:', customerData.email);
console.log('  - Itens:', items.length);
console.log('  - Total:', `R$ ${totalAmount.toFixed(2)}`);
console.log('');

// Teste 1: Criar transação PIX
async function testPixTransaction() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 TESTE 1: Criar Transação PIX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        const pixData = {
            amount: totalAmount,
            customer: customerData,
            items: items,
            shipping: shipping,
            orderId: Date.now()
        };

        console.log('📤 Enviando requisição para API BESTFY...');
        const result = await bestfy.createPixTransaction(pixData);

        console.log('✅ Transação PIX criada com sucesso!\n');
        console.log('📋 Resposta da API:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        if (result.qrCode || result.pixQrCode || result.pix) {
            console.log('✓ QR Code PIX gerado');
        }

        if (result.id || result.transactionId) {
            console.log('✓ ID da transação:', result.id || result.transactionId);
        }

        return result;
    } catch (error) {
        console.error('❌ Erro ao criar transação PIX:\n');
        if (error.statusCode) {
            console.error('  Status HTTP:', error.statusCode);
        }
        if (error.error) {
            console.error('  Erro:', JSON.stringify(error.error, null, 2));
        }
        if (error.message) {
            console.error('  Mensagem:', error.message);
        }
        if (error.rawData) {
            console.error('  Dados brutos:', error.rawData);
        }
        return null;
    }
}

// Teste 2: Criar transação com Cartão
async function testCardTransaction() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💳 TESTE 2: Criar Transação com Cartão de Crédito');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        const cardData = {
            amount: totalAmount,
            customer: customerData,
            items: items,
            shipping: shipping,
            card: {
                number: '4111111111111111', // Cartão de teste Visa
                cvv: '123',
                expirationDate: '12/28',
                holderName: 'JOAO SILVA'
            },
            installments: 3,
            orderId: Date.now()
        };

        console.log('📤 Enviando requisição para API BESTFY...');
        console.log('  - Cartão:', '4111 **** **** 1111');
        console.log('  - Parcelas:', '3x');
        console.log('');

        const result = await bestfy.createCreditCardTransaction(cardData);

        console.log('✅ Transação com Cartão processada!\n');
        console.log('📋 Resposta da API:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        if (result.status) {
            console.log('✓ Status:', result.status);
        }

        if (result.id || result.transactionId) {
            console.log('✓ ID da transação:', result.id || result.transactionId);
        }

        return result;
    } catch (error) {
        console.error('❌ Erro ao criar transação com Cartão:\n');
        if (error.statusCode) {
            console.error('  Status HTTP:', error.statusCode);
        }
        if (error.error) {
            console.error('  Erro:', JSON.stringify(error.error, null, 2));
        }
        if (error.message) {
            console.error('  Mensagem:', error.message);
        }
        if (error.rawData) {
            console.error('  Dados brutos:', error.rawData);
        }
        return null;
    }
}

// Executar testes
async function runTests() {
    console.log('🔑 Usando credenciais:');
    console.log('  - Public Key:', PUBLIC_KEY.substring(0, 20) + '...');
    console.log('  - Secret Key:', SECRET_KEY.substring(0, 20) + '...');
    console.log('');

    // Teste PIX
    const pixResult = await testPixTransaction();

    // Aguardar 2 segundos entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste Cartão
    const cardResult = await testCardTransaction();

    // Resumo final
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO DOS TESTES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('PIX:', pixResult ? '✅ SUCESSO' : '❌ FALHOU');
    console.log('Cartão:', cardResult ? '✅ SUCESSO' : '❌ FALHOU');
    console.log('');

    if (!pixResult && !cardResult) {
        console.log('⚠️  Ambos os testes falharam. Verifique:');
        console.log('   1. Se as chaves estão corretas');
        console.log('   2. Se a API BESTFY está disponível');
        console.log('   3. Se há algum bloqueio de firewall/rede');
        console.log('   4. Os logs de erro acima para mais detalhes');
    } else if (pixResult && cardResult) {
        console.log('🎉 Integração BESTFY funcionando perfeitamente!');
        console.log('   Você pode começar a receber pagamentos reais.');
    } else {
        console.log('⚠️  Integração parcial. Revise os erros acima.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Executar
runTests().catch(error => {
    console.error('\n❌ Erro fatal ao executar testes:', error);
    process.exit(1);
});

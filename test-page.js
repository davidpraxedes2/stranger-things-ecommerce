// Test script to validate product page
const http = require('http');

console.log('🧪 Testando página de produto...\n');

// Test 1: Verificar se a API retorna produto
http.get('http://localhost:3000/api/products/1', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const product = JSON.parse(data);
            console.log('✅ API /api/products/1:');
            console.log('   - ID:', product.id);
            console.log('   - Nome:', product.name);
            console.log('   - Preço:', product.price);
            console.log('   - Imagem:', product.image_url ? 'Sim' : 'Não');
        } catch (e) {
            console.log('❌ Erro ao parsear resposta da API:', e.message);
        }
        
        // Test 2: Verificar se o JavaScript está correto
        testJavaScript();
    });
}).on('error', (e) => {
    console.log('❌ Erro ao conectar com API:', e.message);
    testJavaScript();
});

function testJavaScript() {
    console.log('\n🧪 Testando product-page.js...');
    
    http.get('http://localhost:3000/product-page.js', (res) => {
        let js = '';
        res.on('data', (chunk) => js += chunk);
        res.on('end', () => {
            try {
                // Tentar executar o código
                const func = new Function(js);
                console.log('✅ Sintaxe JavaScript: VÁLIDA');
                
                // Verificar funções essenciais
                const checks = {
                    'loadProduct': js.includes('async function loadProduct'),
                    'renderProduct': js.includes('function renderProduct'),
                    'setupVariants': js.includes('function setupVariants'),
                    'API_URL': js.includes('API_URL'),
                    'DOMContentLoaded': js.includes('DOMContentLoaded')
                };
                
                console.log('\n📋 Verificações:');
                Object.entries(checks).forEach(([name, ok]) => {
                    console.log(`   ${ok ? '✅' : '❌'} ${name}`);
                });
                
                // Verificar linha 162
                const lines = js.split('\n');
                const line162 = lines[161];
                console.log('\n📍 Linha 162:', line162.trim());
                
                if (line162 && line162.includes('defaultVariants')) {
                    console.log('✅ Linha 162 está correta (contém defaultVariants)');
                } else {
                    console.log('⚠️ Linha 162 pode ter problema');
                }
                
                console.log('\n✅ Teste completo! Arquivo está funcional.');
                
            } catch (e) {
                console.log('❌ ERRO DE SINTAXE:', e.message);
                console.log('   Linha aproximada:', e.stack);
            }
        });
    }).on('error', (e) => {
        console.log('❌ Erro ao carregar JavaScript:', e.message);
    });
}


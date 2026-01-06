const https = require('https');

const url = 'https://api.gocase.com.br/api/v2/shelf/7250?locale=pt-BR&currency=BRL&store=br&jd=42';

console.log('🧪 Testando API diretamente...\n');
console.log('URL:', url, '\n');

https.get(url, (res) => {
    let data = '';
    
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers['content-type']);
    console.log('\n');
    
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('✅ Estrutura da resposta:\n');
            console.log(JSON.stringify(json, null, 2).substring(0, 2000));
            
            if (json.products) {
                console.log(`\n✅ Encontrado ${json.products.length} produtos na propriedade 'products'`);
            } else if (json.items) {
                console.log(`\n✅ Encontrado ${json.items.length} produtos na propriedade 'items'`);
            } else {
                console.log('\n⚠️  Propriedades disponíveis:', Object.keys(json).join(', '));
            }
        } catch (e) {
            console.log('❌ Erro ao parsear JSON:', e.message);
            console.log('Primeiros 500 caracteres:', data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error('❌ Erro:', e.message);
});




const https = require('https');
const http = require('http');
const { URL } = require('url');

const targetUrl = 'https://www.gocase.com.br/stranger-things';

console.log('🔍 Analisando o site para encontrar a API de produtos...\n');

// Função para fazer requisição HTTP
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/json,application/xhtml+xml,*/*'
            }
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ data, statusCode: res.statusCode, headers: res.headers }));
        });

        req.on('error', reject);
        req.end();
    });
}

// Funções para testar possíveis endpoints de API
const possibleEndpoints = [
    '/api/products',
    '/api/v1/products',
    '/api/catalog/products',
    '/api/stranger-things/products',
    '/wp-json/wc/v3/products',
    '/rest/products',
    '/graphql',
    '/api/collections/stranger-things',
];

async function testEndpoints(baseUrl) {
    const results = [];
    
    for (const endpoint of possibleEndpoints) {
        try {
            const url = baseUrl + endpoint;
            const response = await fetchUrl(url);
            
            if (response.statusCode === 200) {
                try {
                    const json = JSON.parse(response.data);
                    results.push({ endpoint, status: '✅ FOUND', data: json });
                    console.log(`✅ ENCONTRADO: ${endpoint}`);
                } catch (e) {
                    // Não é JSON válido
                }
            }
        } catch (error) {
            // Endpoint não existe ou erro
        }
    }
    
    return results;
}

// Analisar HTML para encontrar chamadas de API
async function analyzeHTML() {
    try {
        console.log('📄 Buscando HTML da página...');
        const response = await fetchUrl(targetUrl);
        const html = response.data;
        
        console.log('🔎 Procurando por chamadas de API no código...\n');
        
        // Padrões comuns de APIs
        const apiPatterns = [
            /https?:\/\/[^"'\s]+\.gocase\.com\.br\/api\/[^"'\s]+/gi,
            /\/api\/[^"'\s]+/gi,
            /fetch\(['"]([^'"]+)['"]/gi,
            /axios\.(get|post)\(['"]([^'"]+)['"]/gi,
            /\.ajax\(['"]([^'"]+)['"]/gi,
            /url:\s*['"]([^'"]+)['"]/gi,
        ];
        
        const foundApis = new Set();
        
        apiPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const url = match[1] || match[0];
                if (url && (url.includes('/api/') || url.includes('graphql') || url.includes('products'))) {
                    foundApis.add(url);
                }
            }
        });
        
        if (foundApis.size > 0) {
            console.log('🎯 Possíveis endpoints encontrados:');
            foundApis.forEach(api => console.log(`   - ${api}`));
        }
        
        // Testar endpoints encontrados
        console.log('\n🧪 Testando endpoints comuns...\n');
        const baseUrl = 'https://www.gocase.com.br';
        const results = await testEndpoints(baseUrl);
        
        if (results.length > 0) {
            console.log('\n✅ Endpoints funcionais encontrados:');
            results.forEach(r => {
                console.log(`\n📌 ${r.endpoint}`);
                console.log(`   Dados: ${JSON.stringify(r.data).substring(0, 200)}...`);
            });
        } else {
            console.log('❌ Nenhum endpoint padrão encontrado.');
            console.log('\n💡 Vamos analisar o HTML para encontrar scripts e chamadas...\n');
            
            // Buscar por scripts que fazem chamadas
            const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
            if (scriptMatches) {
                console.log(`📜 Encontrados ${scriptMatches.length} scripts. Analisando...`);
                
                scriptMatches.forEach((script, idx) => {
                    const scriptContent = script.replace(/<script[^>]*>|<\/script>/gi, '');
                    
                    // Buscar por URLs de API
                    const apiUrls = scriptContent.match(/['"`](https?:\/\/[^'"`]+api[^'"`]+)['"`]/gi);
                    if (apiUrls) {
                        console.log(`\n📦 Script ${idx + 1} contém chamadas de API:`);
                        apiUrls.forEach(url => console.log(`   ${url.replace(/['"`]/g, '')}`));
                    }
                });
            }
        }
        
        // Sugerir abordagem de scraping
        console.log('\n\n🔧 ALTERNATIVA: Scraping direto do HTML');
        console.log('   Se não encontrarmos a API, podemos fazer scraping do HTML.\n');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

// Executar análise
analyzeHTML();




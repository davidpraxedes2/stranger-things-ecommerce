const puppeteer = require('puppeteer');

const targetUrl = 'https://www.gocase.com.br/stranger-things';

console.log('🔍 BUSCANDO API DO GOCASE - ANÁLISE PROFUNDA\n');
console.log('=' .repeat(60) + '\n');

async function findAPI() {
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Interceptar todas as requisições de rede
        const requests = [];
        const responses = [];
        
        page.on('request', (request) => {
            const url = request.url();
            // Filtrar apenas requisições que parecem ser APIs
            if (url.includes('/api/') || 
                url.includes('graphql') || 
                url.includes('products') || 
                url.includes('catalog') ||
                url.includes('json') ||
                url.includes('rest') ||
                url.endsWith('.json') ||
                request.resourceType() === 'xhr' ||
                request.resourceType() === 'fetch') {
                requests.push({
                    url: url,
                    method: request.method(),
                    headers: request.headers(),
                    postData: request.postData(),
                    resourceType: request.resourceType()
                });
            }
        });
        
        page.on('response', async (response) => {
            const url = response.url();
            const status = response.status();
            
            // Filtrar respostas que podem conter dados de produtos
            if (status === 200 && (
                url.includes('/api/') || 
                url.includes('products') || 
                url.includes('catalog') ||
                url.includes('json') ||
                url.includes('rest') ||
                response.headers()['content-type']?.includes('json'))) {
                
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('json')) {
                        const json = await response.json();
                        responses.push({
                            url: url,
                            status: status,
                            data: json,
                            headers: response.headers()
                        });
                    } else {
                        const text = await response.text();
                        // Tentar parsear como JSON mesmo sem header
                        try {
                            const json = JSON.parse(text);
                            responses.push({
                                url: url,
                                status: status,
                                data: json,
                                headers: response.headers()
                            });
                        } catch (e) {
                            // Não é JSON
                        }
                    }
                } catch (e) {
                    // Erro ao ler resposta
                }
            }
        });
        
        console.log('📡 Carregando página e monitorando requisições...\n');
        await page.goto(targetUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });
        
        // Aguardar um pouco mais para garantir que tudo carregou
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Rolar a página para carregar produtos lazy-loaded
        console.log('📜 Rolando página para carregar mais produtos...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    
                    if(totalHeight >= scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 REQUISIÇÕES ENCONTRADAS:');
        console.log('='.repeat(60) + '\n');
        
        if (requests.length > 0) {
            requests.forEach((req, idx) => {
                console.log(`${idx + 1}. [${req.method}] ${req.url}`);
                console.log(`   Tipo: ${req.resourceType}\n`);
            });
        } else {
            console.log('⚠️  Nenhuma requisição de API encontrada nas chamadas padrão.\n');
        }
        
        console.log('='.repeat(60));
        console.log('📦 RESPOSTAS COM DADOS:');
        console.log('='.repeat(60) + '\n');
        
        if (responses.length > 0) {
            responses.forEach((res, idx) => {
                console.log(`${idx + 1}. ${res.url}`);
                console.log(`   Status: ${res.status}`);
                
                // Verificar se contém produtos
                const dataStr = JSON.stringify(res.data);
                if (dataStr.includes('product') || dataStr.includes('name') || dataStr.includes('price')) {
                    console.log('   ✅ POSSÍVEL API DE PRODUTOS!\n');
                    
                    // Salvar esta resposta
                    const fs = require('fs');
                    fs.writeFileSync(
                        `api-response-${idx + 1}.json`, 
                        JSON.stringify(res, null, 2)
                    );
                    console.log(`   💾 Salvo em: api-response-${idx + 1}.json`);
                    
                    // Tentar extrair produtos
                    if (Array.isArray(res.data)) {
                        console.log(`   📦 Array com ${res.data.length} itens`);
                    } else if (res.data.products || res.data.items || res.data.data) {
                        const products = res.data.products || res.data.items || res.data.data;
                        console.log(`   📦 Encontrados ${products?.length || 0} produtos`);
                    }
                }
                console.log('');
            });
        } else {
            console.log('⚠️  Nenhuma resposta JSON encontrada.\n');
        }
        
        // Tentar encontrar endpoints no código JavaScript
        console.log('='.repeat(60));
        console.log('🔍 ANALISANDO JAVASCRIPT EM BUSCA DE ENDPOINTS:');
        console.log('='.repeat(60) + '\n');
        
        const scripts = await page.evaluate(() => {
            const scriptContents = [];
            const scripts = document.querySelectorAll('script');
            
            scripts.forEach(script => {
                const content = script.textContent || script.innerHTML;
                if (content.length > 100) { // Apenas scripts significativos
                    scriptContents.push(content.substring(0, 5000)); // Primeiros 5KB
                }
            });
            
            return scriptContents;
        });
        
        const apiEndpoints = new Set();
        
        scripts.forEach(script => {
            // Buscar padrões de URLs de API
            const patterns = [
                /['"`](https?:\/\/[^'"`]*\/api\/[^'"`]+)['"`]/gi,
                /['"`](\/api\/[^'"`]+)['"`]/gi,
                /fetch\(['"]([^'"]+)['"]/gi,
                /axios\.(get|post)\(['"]([^'"]+)['"]/gi,
                /\.ajax\(['"]([^'"]+)['"]/gi,
                /url:\s*['"]([^'"]+)['"]/gi,
                /endpoint['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
                /baseURL['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
            ];
            
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(script)) !== null) {
                    const url = match[1] || match[2] || match[0];
                    if (url && (url.includes('/api/') || url.includes('product') || url.includes('catalog'))) {
                        apiEndpoints.add(url);
                    }
                }
            });
        });
        
        if (apiEndpoints.size > 0) {
            console.log('✅ Endpoints encontrados no código:\n');
            Array.from(apiEndpoints).forEach(endpoint => {
                console.log(`   - ${endpoint}`);
            });
            console.log('');
        } else {
            console.log('⚠️  Nenhum endpoint explícito encontrado no código.\n');
        }
        
        // Tentar fazer requisições diretas para endpoints comuns
        console.log('='.repeat(60));
        console.log('🧪 TESTANDO ENDPOINTS COMUNS:');
        console.log('='.repeat(60) + '\n');
        
        const commonEndpoints = [
            '/api/products',
            '/api/v1/products',
            '/api/catalog/products',
            '/api/collections/stranger-things',
            '/api/stranger-things/products',
            '/rest/products',
            '/graphql',
            '/wp-json/wc/v3/products',
            'https://www.gocase.com.br/api/products',
            'https://www.gocase.com.br/api/v1/products',
        ];
        
        for (const endpoint of commonEndpoints) {
            try {
                const fullUrl = endpoint.startsWith('http') ? endpoint : `https://www.gocase.com.br${endpoint}`;
                const response = await page.goto(fullUrl, {
                    waitUntil: 'networkidle0',
                    timeout: 5000
                });
                
                if (response && response.status() === 200) {
                    const content = await response.text();
                    try {
                        const json = JSON.parse(content);
                        console.log(`✅ ENCONTRADO: ${endpoint}`);
                        console.log(`   Dados: ${JSON.stringify(json).substring(0, 200)}...\n`);
                        
                        const fs = require('fs');
                        fs.writeFileSync(
                            `endpoint-${endpoint.replace(/\//g, '-')}.json`,
                            JSON.stringify(json, null, 2)
                        );
                    } catch (e) {
                        // Não é JSON
                    }
                }
            } catch (e) {
                // Endpoint não existe
            }
        }
        
        // Executar código JavaScript na página para tentar encontrar variáveis globais
        console.log('='.repeat(60));
        console.log('🔬 INSPECTANDO VARIÁVEIS GLOBAIS:');
        console.log('='.repeat(60) + '\n');
        
        const globalVars = await page.evaluate(() => {
            const vars = {};
            
            // Verificar window para variáveis que podem conter dados de API
            if (window.config) vars.config = window.config;
            if (window.API) vars.API = window.API;
            if (window.api) vars.api = window.api;
            if (window.products) vars.products = window.products;
            if (window.productList) vars.productList = window.productList;
            if (window.data) vars.data = window.data;
            
            return vars;
        });
        
        if (Object.keys(globalVars).length > 0) {
            console.log('✅ Variáveis globais encontradas:\n');
            Object.keys(globalVars).forEach(key => {
                console.log(`   ${key}:`, JSON.stringify(globalVars[key]).substring(0, 100));
            });
            console.log('');
        }
        
        await browser.close();
        
        console.log('='.repeat(60));
        console.log('✅ ANÁLISE CONCLUÍDA!');
        console.log('='.repeat(60));
        console.log('\n💡 Verifique os arquivos JSON gerados para mais detalhes.\n');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (browser) {
            await browser.close();
        }
    }
}

findAPI();




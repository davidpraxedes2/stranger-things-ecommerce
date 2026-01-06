const puppeteer = require('puppeteer');

const targetUrl = 'https://www.netflix.shop/en-br/collections/stranger-things';

console.log('🔍 BUSCANDO API DO NETFLIX SHOP - ANÁLISE PROFUNDA\n');
console.log('='.repeat(60) + '\n');

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
                url.includes('collections') ||
                url.includes('shopify') ||
                url.includes('.json') ||
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
                url.includes('collections') ||
                url.includes('shopify') ||
                url.includes('.json') ||
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
        
        const fs = require('fs');
        
        if (responses.length > 0) {
            responses.forEach((res, idx) => {
                console.log(`${idx + 1}. ${res.url}`);
                console.log(`   Status: ${res.status}`);
                
                // Verificar se contém produtos
                const dataStr = JSON.stringify(res.data);
                if (dataStr.includes('product') || dataStr.includes('title') || dataStr.includes('price') || dataStr.includes('variant')) {
                    console.log('   ✅ POSSÍVEL API DE PRODUTOS!\n');
                    
                    // Salvar esta resposta
                    fs.writeFileSync(
                        `netflix-api-response-${idx + 1}.json`, 
                        JSON.stringify(res, null, 2)
                    );
                    console.log(`   💾 Salvo em: netflix-api-response-${idx + 1}.json\n`);
                } else {
                    console.log('   ℹ️  Resposta JSON (verificar manualmente)\n');
                }
            });
        } else {
            console.log('⚠️  Nenhuma resposta JSON encontrada.\n');
        }
        
        // Tentar URLs comuns do Shopify
        console.log('='.repeat(60));
        console.log('🛍️  TESTANDO ENDPOINTS COMUNS DO SHOPIFY:');
        console.log('='.repeat(60) + '\n');
        
        const shopifyEndpoints = [
            '/products.json',
            '/collections/stranger-things/products.json',
            '/collections/all/products.json',
            '/api/2023-10/products.json',
            '/api/2024-01/products.json',
            '/api/2024-04/products.json',
        ];
        
        const baseUrl = 'https://www.netflix.shop';
        for (const endpoint of shopifyEndpoints) {
            try {
                const url = baseUrl + endpoint;
                console.log(`Testando: ${url}...`);
                const response = await page.evaluate(async (testUrl) => {
                    try {
                        const res = await fetch(testUrl);
                        if (res.ok) {
                            const data = await res.json();
                            return { success: true, data: data };
                        }
                        return { success: false, status: res.status };
                    } catch (e) {
                        return { success: false, error: e.message };
                    }
                }, url);
                
                if (response.success) {
                    console.log(`   ✅ ENCONTRADO! ${url}\n`);
                    fs.writeFileSync(
                        `netflix-shopify-${endpoint.replace(/\//g, '-')}.json`,
                        JSON.stringify(response.data, null, 2)
                    );
                    console.log(`   💾 Salvo em: netflix-shopify-${endpoint.replace(/\//g, '-')}.json\n`);
                } else {
                    console.log(`   ❌ Status: ${response.status || response.error}\n`);
                }
            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}\n`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

findAPI();


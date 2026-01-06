const puppeteer = require('puppeteer');

const targetUrl = 'https://www.gocase.com.br/stranger-things';

console.log('🕷️  Iniciando scraping com Puppeteer (renderizando JavaScript)...\n');

async function scrapeProducts() {
    let browser;
    
    try {
        console.log('🚀 Iniciando navegador...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Configurar user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('📡 Carregando página:', targetUrl);
        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        console.log('⏳ Aguardando produtos carregarem...');
        await page.waitForTimeout(3000);
        
        // Tentar aguardar por elementos de produto
        try {
            await page.waitForSelector('.product, .product-item, .product-card, [data-product], article', {
                timeout: 5000
            });
        } catch (e) {
            console.log('⚠️  Timeout aguardando produtos. Continuando mesmo assim...');
        }
        
        console.log('🔍 Extraindo produtos...\n');
        
        // Extrair produtos da página
        const products = await page.evaluate(() => {
            const items = [];
            
            // Função para limpar texto
            const cleanText = (text) => {
                return text ? text.trim().replace(/\s+/g, ' ') : '';
            };
            
            // Função para extrair preço
            const extractPrice = (text) => {
                if (!text) return null;
                const match = text.match(/[\d.,]+/);
                if (match) {
                    return parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
                }
                return null;
            };
            
            // Tentar múltiplos seletores
            const selectors = [
                '.product-item',
                '.product-card',
                '.product',
                '[data-product]',
                'article.product',
                '[class*="product"]',
                '.item',
                '.grid-item'
            ];
            
            let foundElements = [];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    foundElements = Array.from(elements);
                    console.log(`Encontrado ${elements.length} elementos com: ${selector}`);
                    break;
                }
            }
            
            // Se não encontrou com seletores específicos, buscar por links de produto
            if (foundElements.length === 0) {
                const productLinks = document.querySelectorAll('a[href*="/produto"], a[href*="/product"], a[href*="stranger"]');
                foundElements = Array.from(productLinks);
                console.log(`Encontrado ${foundElements.length} links de produtos`);
            }
            
            foundElements.forEach((element, idx) => {
                try {
                    // Buscar nome
                    const nameSelectors = [
                        'h2', 'h3', 'h4',
                        '.product-name',
                        '.title',
                        '[class*="name"]',
                        '[class*="title"]',
                        'img[alt]'
                    ];
                    
                    let name = '';
                    for (const sel of nameSelectors) {
                        const nameEl = element.querySelector(sel);
                        if (nameEl) {
                            name = nameEl.textContent || nameEl.getAttribute('alt') || nameEl.getAttribute('title');
                            if (name && name.trim().length > 3) break;
                        }
                    }
                    
                    // Se não encontrou, usar texto do elemento
                    if (!name || name.length < 3) {
                        name = element.textContent || element.getAttribute('title') || element.getAttribute('alt');
                    }
                    
                    name = cleanText(name);
                    if (!name || name.length < 3) return;
                    
                    // Buscar preço
                    const priceSelectors = [
                        '.price',
                        '.product-price',
                        '[class*="price"]',
                        '[class*="value"]',
                        '[data-price]'
                    ];
                    
                    let priceText = '';
                    let price = null;
                    
                    for (const sel of priceSelectors) {
                        const priceEl = element.querySelector(sel);
                        if (priceEl) {
                            priceText = priceEl.textContent || priceEl.getAttribute('data-price');
                            if (priceText) {
                                price = extractPrice(priceText);
                                break;
                            }
                        }
                    }
                    
                    // Buscar imagem
                    const img = element.querySelector('img');
                    let image = '';
                    if (img) {
                        image = img.getAttribute('src') || 
                               img.getAttribute('data-src') || 
                               img.getAttribute('data-lazy-src') ||
                               img.getAttribute('data-original');
                    }
                    
                    // Corrigir URL da imagem
                    if (image && !image.startsWith('http')) {
                        image = image.startsWith('//') ? `https:${image}` : `https://www.gocase.com.br${image}`;
                    }
                    
                    // Buscar URL
                    const link = element.tagName === 'A' ? element : element.querySelector('a');
                    let url = '';
                    if (link) {
                        url = link.getAttribute('href') || '';
                        if (url && !url.startsWith('http')) {
                            url = url.startsWith('//') ? `https:${url}` : `https://www.gocase.com.br${url}`;
                        }
                    }
                    
                    // Buscar dados de atributos data-*
                    const dataName = element.getAttribute('data-name') || element.getAttribute('data-product-name');
                    if (dataName && dataName.length > name.length) {
                        name = dataName;
                    }
                    
                    const dataPrice = element.getAttribute('data-price');
                    if (dataPrice && !price) {
                        price = parseFloat(dataPrice);
                    }
                    
                    items.push({
                        name: name.substring(0, 200),
                        price: price,
                        priceText: cleanText(priceText),
                        image: image,
                        url: url,
                        index: idx
                    });
                } catch (error) {
                    console.error(`Erro ao processar elemento ${idx}:`, error);
                }
            });
            
            return items;
        });
        
        console.log(`✅ Extraídos ${products.length} produtos!\n`);
        
        if (products.length > 0) {
            console.log('📦 Primeiros produtos encontrados:\n');
            products.slice(0, 10).forEach((product, idx) => {
                console.log(`${idx + 1}. ${product.name}`);
                if (product.price) {
                    console.log(`   💰 Preço: R$ ${product.price.toFixed(2)}`);
                } else if (product.priceText) {
                    console.log(`   💰 Preço: ${product.priceText}`);
                }
                if (product.image) {
                    console.log(`   🖼️  Imagem: ${product.image.substring(0, 70)}...`);
                }
                if (product.url) {
                    console.log(`   🔗 URL: ${product.url}`);
                }
                console.log('');
            });
            
            if (products.length > 10) {
                console.log(`... e mais ${products.length - 10} produtos\n`);
            }
            
            // Salvar em JSON
            const fs = require('fs');
            const output = {
                source: 'gocase.com.br/stranger-things',
                scrapedAt: new Date().toISOString(),
                total: products.length,
                products: products
            };
            
            fs.writeFileSync('gocase-products.json', JSON.stringify(output, null, 2));
            console.log('💾 Produtos salvos em: gocase-products.json\n');
            
            // Gerar SQL para importação
            generateImportSQL(products);
            
        } else {
            console.log('❌ Nenhum produto encontrado.');
            console.log('\n📸 Capturando screenshot para debug...');
            await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
            console.log('💾 Screenshot salvo em: debug-screenshot.png');
        }
        
        await browser.close();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (browser) {
            await browser.close();
        }
    }
}

// Gerar SQL para importação
function generateImportSQL(products) {
    const fs = require('fs');
    let sql = '-- Importação de produtos Stranger Things do Gocase\n';
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += '-- Execute estas queries no banco de dados\n\n';
    
    sql += 'BEGIN TRANSACTION;\n\n';
    
    products.forEach((product, idx) => {
        const name = product.name.replace(/'/g, "''");
        const description = `Produto original do Gocase. ${product.url ? `URL: ${product.url}` : ''}`;
        const price = product.price || 99.90; // Preço padrão se não encontrado
        const category = 'stranger-things';
        const imageUrl = product.image || null;
        
        sql += `-- Produto ${idx + 1}: ${name.substring(0, 50)}...\n`;
        sql += `INSERT INTO products (name, description, price, category, image_url, stock, active) VALUES (`;
        sql += `'${name}', `;
        sql += `'${description}', `;
        sql += `${price}, `;
        sql += `'${category}', `;
        sql += imageUrl ? `'${imageUrl}', ` : `NULL, `;
        sql += `10, `;
        sql += `1`;
        sql += `);\n\n`;
    });
    
    sql += 'COMMIT;\n';
    
    fs.writeFileSync('import-products.sql', sql);
    console.log('✅ SQL gerado em: import-products.sql\n');
    console.log('📝 Para importar, execute o arquivo SQL no banco ou use o painel admin.\n');
}

// Executar
scrapeProducts();




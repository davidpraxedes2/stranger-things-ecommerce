const https = require('https');
const cheerio = require('cheerio');

const targetUrl = 'https://www.gocase.com.br/stranger-things';

console.log('🕷️  Iniciando scraping dos produtos Stranger Things...\n');

// Função para fazer requisição HTTP
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            // Decompress gzip if needed
            let stream = res;
            if (res.headers['content-encoding'] === 'gzip') {
                const zlib = require('zlib');
                stream = res.pipe(zlib.createGunzip());
            }
            
            stream.on('data', (chunk) => data += chunk);
            stream.on('end', () => resolve({ data, statusCode: res.statusCode, headers: res.headers }));
        });

        req.on('error', reject);
        req.end();
    });
}

// Função para extrair produtos do HTML
function extractProducts(html) {
    const $ = cheerio.load(html);
    const products = [];
    
    console.log('🔍 Analisando estrutura HTML...\n');
    
    // Tentar diferentes seletores comuns de e-commerce
    const selectors = [
        '.product-item',
        '.product-card',
        '.product',
        '[data-product]',
        '.product-list-item',
        '.grid-item',
        'article.product',
    ];
    
    let foundSelector = null;
    for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
            foundSelector = selector;
            console.log(`✅ Encontrado ${elements.length} produtos usando: ${selector}\n`);
            break;
        }
    }
    
    if (!foundSelector) {
        // Tentar buscar por padrões mais genéricos
        console.log('⚠️  Seletores padrão não funcionaram. Buscando padrões alternativos...\n');
        
        // Buscar por links que podem ser produtos
        $('a[href*="/produto"]').each((i, elem) => {
            const $elem = $(elem);
            const name = $elem.find('h2, h3, .product-name, .title').first().text().trim() || 
                        $elem.attr('title') || 
                        $elem.text().trim();
            
            if (name && name.length > 3) {
                const priceText = $elem.find('.price, .product-price, [class*="price"]').first().text().trim();
                const image = $elem.find('img').first().attr('src') || 
                             $elem.find('img').first().attr('data-src');
                
                products.push({
                    name: name.substring(0, 100),
                    price: priceText,
                    image: image,
                    url: $elem.attr('href')
                });
            }
        });
    } else {
        // Extrair produtos do seletor encontrado
        $(foundSelector).each((i, elem) => {
            const $elem = $(elem);
            
            const name = $elem.find('h2, h3, .product-name, .title, [class*="name"]').first().text().trim() ||
                        $elem.attr('data-name') ||
                        $elem.attr('title') ||
                        '';
            
            const priceText = $elem.find('.price, .product-price, [class*="price"], [class*="value"]').first().text().trim() ||
                            $elem.attr('data-price') ||
                            '';
            
            const image = $elem.find('img').first().attr('src') || 
                         $elem.find('img').first().attr('data-src') ||
                         $elem.find('img').first().attr('data-lazy-src') ||
                         '';
            
            const url = $elem.find('a').first().attr('href') ||
                       $elem.closest('a').attr('href') ||
                       '';
            
            if (name && name.length > 3) {
                // Limpar e formatar preço
                const priceMatch = priceText.match(/[\d.,]+/);
                const price = priceMatch ? parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.')) : null;
                
                products.push({
                    name: name.substring(0, 200),
                    price: price,
                    priceText: priceText,
                    image: image.startsWith('http') ? image : (image ? `https://www.gocase.com.br${image}` : ''),
                    url: url.startsWith('http') ? url : (url ? `https://www.gocase.com.br${url}` : '')
                });
            }
        });
    }
    
    // Se ainda não encontrou, buscar por JSON-LD ou dados estruturados
    if (products.length === 0) {
        console.log('🔍 Buscando dados estruturados (JSON-LD)...\n');
        
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const json = JSON.parse($(elem).html());
                if (json['@type'] === 'Product' || json['@type'] === 'ItemList') {
                    console.log('✅ Encontrado dados estruturados!');
                    if (json.itemListElement) {
                        json.itemListElement.forEach(item => {
                            if (item.item) {
                                products.push({
                                    name: item.item.name,
                                    price: item.item.offers?.price,
                                    image: item.item.image,
                                    url: item.item.url
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                // Não é JSON válido
            }
        });
    }
    
    return products;
}

// Função principal
async function scrapeProducts() {
    try {
        console.log('📡 Fazendo requisição para:', targetUrl);
        const response = await fetchUrl(targetUrl);
        
        if (response.statusCode !== 200) {
            console.error(`❌ Erro: Status ${response.statusCode}`);
            return;
        }
        
        console.log(`✅ HTML recebido (${(response.data.length / 1024).toFixed(2)} KB)\n`);
        
        const products = extractProducts(response.data);
        
        if (products.length > 0) {
            console.log(`\n✅ Encontrados ${products.length} produtos!\n`);
            console.log('📦 Produtos encontrados:\n');
            
            products.slice(0, 10).forEach((product, idx) => {
                console.log(`${idx + 1}. ${product.name}`);
                if (product.price) {
                    console.log(`   Preço: R$ ${product.price.toFixed(2)}`);
                } else if (product.priceText) {
                    console.log(`   Preço: ${product.priceText}`);
                }
                if (product.image) {
                    console.log(`   Imagem: ${product.image.substring(0, 60)}...`);
                }
                console.log('');
            });
            
            if (products.length > 10) {
                console.log(`... e mais ${products.length - 10} produtos\n`);
            }
            
            // Salvar em arquivo JSON
            const fs = require('fs');
            const output = {
                source: 'gocase.com.br',
                scrapedAt: new Date().toISOString(),
                total: products.length,
                products: products
            };
            
            fs.writeFileSync('gocase-products.json', JSON.stringify(output, null, 2));
            console.log('💾 Produtos salvos em: gocase-products.json\n');
            
            // Gerar SQL para importar no banco
            console.log('📝 Gerando SQL para importação...\n');
            generateImportSQL(products);
            
        } else {
            console.log('❌ Nenhum produto encontrado. O site pode usar JavaScript para carregar produtos.');
            console.log('💡 Tentando buscar por scripts inline...\n');
            
            // Buscar por dados em scripts JavaScript
            const $ = cheerio.load(response.data);
            $('script').each((i, elem) => {
                const scriptContent = $(elem).html();
                if (scriptContent && (scriptContent.includes('product') || scriptContent.includes('products'))) {
                    // Tentar extrair JSON de produtos
                    const jsonMatch = scriptContent.match(/products?\s*[:=]\s*(\[[^\]]+\])/i);
                    if (jsonMatch) {
                        try {
                            const products = JSON.parse(jsonMatch[1]);
                            console.log(`✅ Encontrado ${products.length} produtos em script JavaScript!`);
                        } catch (e) {
                            console.log('⚠️  JSON encontrado mas não parseável');
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
    }
}

// Gerar SQL para importação
function generateImportSQL(products) {
    const fs = require('fs');
    let sql = '-- Importação de produtos do Gocase\n';
    sql += '-- Execute estas queries no banco de dados\n\n';
    
    products.forEach((product, idx) => {
        const name = product.name.replace(/'/g, "''");
        const description = `Produto original do Gocase: ${product.url || ''}`;
        const price = product.price || 0;
        const category = 'stranger-things';
        const imageUrl = product.image || null;
        
        sql += `INSERT INTO products (name, description, price, category, image_url, stock, active) VALUES (`;
        sql += `'${name}', `;
        sql += `'${description}', `;
        sql += `${price}, `;
        sql += `'${category}', `;
        sql += imageUrl ? `'${imageUrl}', ` : `NULL, `;
        sql += `10, `;
        sql += `1`;
        sql += `);\n`;
    });
    
    fs.writeFileSync('import-products.sql', sql);
    console.log('✅ SQL gerado em: import-products.sql\n');
}

// Executar
scrapeProducts();




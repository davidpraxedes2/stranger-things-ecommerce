const https = require('https');
const fs = require('fs');

const API_BASE = 'https://api.gocase.com.br/api/v2';
const LOCALE = 'pt-BR';
const CURRENCY = 'BRL';
const STORE = 'br';

// IDs das shelves encontradas na página Stranger Things
const SHELF_IDS = [7250, 7251, 7252, 7253, 7254, 7255, 7895];

console.log('🚀 Buscando produtos Stranger Things da API Gocase...\n');

// Função para fazer requisição à API
function fetchAPI(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}${endpoint}?locale=${LOCALE}&currency=${CURRENCY}&store=${STORE}&jd=42`;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Referer': 'https://www.gocase.com.br/',
                'Origin': 'https://www.gocase.com.br'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error('Resposta não é JSON válido'));
                }
            });
        }).on('error', reject);
    });
}

// Função principal
async function fetchAllProducts() {
    const allProducts = [];
    const seenIds = new Set();
    
    for (const shelfId of SHELF_IDS) {
        try {
            console.log(`📦 Buscando shelf ${shelfId}...`);
            const data = await fetchAPI(`/shelf/${shelfId}`);
            
            // Verificar diferentes estruturas de resposta
            const products = data.products || data.items || (Array.isArray(data) ? data : []);
            
            if (products && Array.isArray(products) && products.length > 0) {
                products.forEach(item => {
                    // Evitar duplicatas
                    if (!seenIds.has(item.id || item.sku)) {
                        seenIds.add(item.id || item.sku);
                        
                        // Normalizar estrutura do produto
                        const product = {
                            id: item.id,
                            sku: item.sku || item.id,
                            name: item.name || item.title,
                            description: item.description || '',
                            price: parseFloat(item.price || item.salePrice || 0),
                            originalPrice: parseFloat(item.originalPrice || item.compareAtPrice || 0),
                            image: item.image || item.images?.[0] || '',
                            images: item.images || [],
                            url: item.url || item.handle ? `https://www.gocase.com.br/${item.handle}` : '',
                            available: item.available !== false,
                            inStock: item.inStock !== false,
                            vendor: item.vendor || 'Gocase',
                            tags: item.tags || [],
                            category: 'stranger-things'
                        };
                        
                        allProducts.push(product);
                    }
                });
                console.log(`   ✅ ${products.length} produtos encontrados\n`);
            } else {
                console.log(`   ⚠️  Sem produtos nesta shelf\n`);
            }
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}\n`);
        }
    }
    
    console.log(`\n✅ Total de produtos únicos: ${allProducts.length}\n`);
    
    // Salvar produtos
    const output = {
        source: 'api.gocase.com.br',
        fetchedAt: new Date().toISOString(),
        total: allProducts.length,
        products: allProducts
    };
    
    fs.writeFileSync('gocase-products-api.json', JSON.stringify(output, null, 2));
    console.log('💾 Produtos salvos em: gocase-products-api.json\n');
    
    // Mostrar primeiros produtos
    console.log('📦 Primeiros produtos encontrados:\n');
    allProducts.slice(0, 10).forEach((product, idx) => {
        console.log(`${idx + 1}. ${product.name}`);
        console.log(`   💰 R$ ${product.price.toFixed(2)}`);
        if (product.image) {
            console.log(`   🖼️  ${product.image.substring(0, 60)}...`);
        }
        console.log('');
    });
    
    // Gerar SQL para importação
    generateImportSQL(allProducts);
    
    return allProducts;
}

// Gerar SQL para importação
function generateImportSQL(products) {
    let sql = '-- Importação de produtos Stranger Things da API Gocase\n';
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += '-- Total: ' + products.length + ' produtos\n\n';
    sql += 'BEGIN TRANSACTION;\n\n';
    
    products.forEach((product, idx) => {
        const name = (product.name || 'Produto sem nome').replace(/'/g, "''");
        const description = (product.description || `Produto original do Gocase. SKU: ${product.sku || ''}`).replace(/'/g, "''");
        const price = product.price || 99.90;
        const category = 'stranger-things';
        const imageUrl = product.image || product.images?.[0] || null;
        
        sql += `-- ${idx + 1}. ${name.substring(0, 50)}\n`;
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
    
    fs.writeFileSync('import-products-api.sql', sql);
    console.log('✅ SQL gerado em: import-products-api.sql\n');
}

// Executar
fetchAllProducts().catch(console.error);


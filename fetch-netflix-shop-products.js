const https = require('https');
const fs = require('fs');

const API_BASE = 'https://www.netflix.shop';
const COLLECTION = 'stranger-things';
const PRODUCTS_PER_PAGE = 250; // Máximo do Shopify

console.log('🚀 Buscando produtos Stranger Things da Netflix Shop...\n');

// Função para fazer requisição à API
function fetchAPI(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}${endpoint}`;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Referer': 'https://www.netflix.shop/',
                'Origin': 'https://www.netflix.shop'
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

// Função para buscar produtos com paginação
async function fetchAllProducts() {
    const allProducts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        try {
            const endpoint = `/collections/${COLLECTION}/products.json?limit=${PRODUCTS_PER_PAGE}&page=${page}`;
            console.log(`📦 Buscando página ${page}...`);
            
            const data = await fetchAPI(endpoint);
            const products = data.products || [];
            
            if (products.length === 0) {
                hasMore = false;
                console.log(`   ⚠️  Página vazia, fim dos produtos\n`);
            } else {
                console.log(`   ✅ ${products.length} produtos encontrados\n`);
                
                // Normalizar estrutura do produto
                products.forEach(product => {
                    // Pegar o primeiro variant disponível para preço e imagem
                    const firstVariant = product.variants && product.variants.length > 0 
                        ? product.variants[0] 
                        : null;
                    
                    // Pegar primeira imagem do produto
                    const firstImage = product.images && product.images.length > 0 
                        ? product.images[0].src 
                        : (firstVariant?.featured_image?.src || '');
                    
                    // Converter HTML para texto simples
                    const description = product.body_html 
                        ? product.body_html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim()
                        : '';
                    
                    // Preço do primeiro variant (em centavos convertido para reais)
                    const price = firstVariant ? parseFloat(firstVariant.price) : 0;
                    const compareAtPrice = firstVariant && firstVariant.compare_at_price 
                        ? parseFloat(firstVariant.compare_at_price) 
                        : null;
                    
                    // Verificar disponibilidade
                    const available = firstVariant ? firstVariant.available : false;
                    
                    const normalizedProduct = {
                        id: product.id,
                        sku: firstVariant?.sku || product.handle,
                        name: product.title,
                        description: description || `Produto oficial do Netflix Shop. ${product.product_type || ''}`,
                        price: price,
                        originalPrice: compareAtPrice,
                        image: firstImage,
                        images: product.images ? product.images.map(img => img.src) : [],
                        url: `https://www.netflix.shop/products/${product.handle}`,
                        available: available,
                        inStock: available,
                        vendor: product.vendor || 'Netflix Shop',
                        tags: product.tags || [],
                        category: 'stranger-things',
                        productType: product.product_type || '',
                        handle: product.handle
                    };
                    
                    allProducts.push(normalizedProduct);
                });
                
                // Se retornou menos que o limite, é a última página
                if (products.length < PRODUCTS_PER_PAGE) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}\n`);
            hasMore = false;
        }
    }
    
    console.log(`\n✅ Total de produtos únicos: ${allProducts.length}\n`);
    
    // Salvar produtos
    const output = {
        source: 'netflix.shop (Shopify API)',
        fetchedAt: new Date().toISOString(),
        total: allProducts.length,
        products: allProducts
    };
    
    fs.writeFileSync('netflix-shop-products.json', JSON.stringify(output, null, 2));
    console.log('💾 Produtos salvos em: netflix-shop-products.json\n');
    
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
    let sql = '-- Importação de produtos Stranger Things da Netflix Shop\n';
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += '-- Total: ' + products.length + ' produtos\n\n';
    sql += 'BEGIN TRANSACTION;\n\n';
    
    products.forEach((product, idx) => {
        const name = (product.name || 'Produto sem nome').replace(/'/g, "''");
        const description = (product.description || `Produto original do Netflix Shop. SKU: ${product.sku || ''}`).replace(/'/g, "''");
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
    
    fs.writeFileSync('import-netflix-products.sql', sql);
    console.log('✅ SQL gerado em: import-netflix-products.sql\n');
}

// Executar
fetchAllProducts().catch(console.error);


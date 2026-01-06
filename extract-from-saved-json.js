const fs = require('fs');

console.log('📦 Extraindo produtos dos arquivos JSON salvos...\n');

const jsonFiles = [
    'api-response-3.json',
    'api-response-11.json',
    'api-response-12.json',
    'api-response-13.json',
    'api-response-14.json',
    'api-response-15.json',
    'api-response-16.json'
];

const allProducts = [];
const seenIds = new Set();

jsonFiles.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const json = JSON.parse(content);
            
            if (json.data && json.data.products) {
                console.log(`✅ ${file}: ${json.data.products.length} produtos`);
                
                json.data.products.forEach(item => {
                    if (!seenIds.has(item.id || item.sku)) {
                        seenIds.add(item.id || item.sku);
                        
                        const product = {
                            id: item.id,
                            sku: item.sku || item.id,
                            name: (item.name || '').trim(),
                            description: `Produto Stranger Things original do Gocase. SKU: ${item.sku || ''}`,
                            price: parseFloat(item.price || 0),
                            originalPrice: parseFloat(item.old_price || 0),
                            image: item.image || '',
                            url: item.slug ? `https://www.gocase.com.br/${item.slug}` : '',
                            inStock: item.in_stock !== false,
                            badge: item.badge?.label || '',
                            category: 'stranger-things',
                            tags: item.tag || []
                        };
                        
                        if (product.name && product.name.length > 3) {
                            allProducts.push(product);
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.log(`⚠️  ${file}: ${error.message}`);
    }
});

console.log(`\n✅ Total de produtos únicos: ${allProducts.length}\n`);

// Salvar produtos
const output = {
    source: 'api.gocase.com.br (extraído de respostas salvas)',
    extractedAt: new Date().toISOString(),
    total: allProducts.length,
    products: allProducts
};

fs.writeFileSync('gocase-products-final.json', JSON.stringify(output, null, 2));
console.log('💾 Produtos salvos em: gocase-products-final.json\n');

// Mostrar produtos
console.log('📦 Produtos encontrados:\n');
allProducts.slice(0, 15).forEach((product, idx) => {
    console.log(`${idx + 1}. ${product.name}`);
    console.log(`   💰 R$ ${product.price.toFixed(2)}${product.originalPrice ? ` (antes: R$ ${product.originalPrice.toFixed(2)})` : ''}`);
    if (product.badge) {
        console.log(`   🏷️  ${product.badge}`);
    }
    if (product.image) {
        console.log(`   🖼️  ${product.image.substring(0, 70)}...`);
    }
    console.log('');
});

if (allProducts.length > 15) {
    console.log(`... e mais ${allProducts.length - 15} produtos\n`);
}

// Gerar SQL para importação
function generateImportSQL(products) {
    let sql = '-- Importação de produtos Stranger Things da API Gocase\n';
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += `-- Total: ${products.length} produtos\n\n`;
    sql += 'BEGIN TRANSACTION;\n\n';
    
    products.forEach((product, idx) => {
        const name = product.name.replace(/'/g, "''");
        const description = product.description.replace(/'/g, "''");
        const price = product.price || 79.90;
        const category = 'stranger-things';
        const imageUrl = product.image || null;
        
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
    
    fs.writeFileSync('import-products-final.sql', sql);
    console.log('✅ SQL gerado em: import-products-final.sql\n');
    console.log('📝 Para importar no banco:\n');
    console.log('   1. Abra o arquivo import-products-final.sql');
    console.log('   2. Execute no banco SQLite ou');
    console.log('   3. Use o painel admin para importar manualmente\n');
}

generateImportSQL(allProducts);




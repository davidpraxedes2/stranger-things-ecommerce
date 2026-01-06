// Script para popular banco de dados na inicialização
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = 'database.sqlite';
const PRODUCTS_FILE = 'netflix-shop-products.json';

console.log('🔄 Verificando banco de dados...');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err);
        process.exit(1);
    }
    console.log('✅ Conectado ao banco');
    checkAndPopulate();
});

function checkAndPopulate() {
    // Verificar se já tem produtos
    db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => {
        if (err) {
            console.error('❌ Erro ao contar produtos:', err);
            db.close();
            return;
        }

        if (row.count > 0) {
            console.log(`✅ Banco já tem ${row.count} produtos. Nada a fazer.`);
            db.close();
            return;
        }

        console.log('📦 Banco vazio. Verificando arquivo de produtos...');
        
        // Verificar se existe arquivo de produtos
        if (!fs.existsSync(PRODUCTS_FILE)) {
            console.log('⚠️  Arquivo de produtos não encontrado. Criando alguns produtos de exemplo...');
            createSampleProducts();
            return;
        }

        // Importar produtos do arquivo JSON
        try {
            const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
            const products = data.products || [];
            
            if (products.length === 0) {
                console.log('⚠️  Arquivo vazio. Criando produtos de exemplo...');
                createSampleProducts();
                return;
            }

            console.log(`📥 Importando ${products.length} produtos...`);
            importProducts(products);
        } catch (error) {
            console.error('❌ Erro ao ler arquivo:', error.message);
            createSampleProducts();
        }
    });
}

function importProducts(products) {
    const stmt = db.prepare(`
        INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let successCount = 0;
    let errorCount = 0;

    products.forEach((product, index) => {
        const imagesJson = product.images ? JSON.stringify(product.images) : null;
        const imageUrl = product.image || (product.images && product.images[0]) || null;

        stmt.run([
            product.name || 'Produto sem nome',
            product.description || '',
            parseFloat(product.price) || 0,
            product.category || 'stranger-things',
            imageUrl,
            product.inStock !== false ? 10 : 0,
            1,
            imagesJson,
            product.originalPrice || null,
            product.sku || null
        ], function(err) {
            if (err) {
                errorCount++;
            } else {
                successCount++;
            }

            if (successCount + errorCount === products.length) {
                stmt.finalize(() => {
                    console.log(`✅ Importados ${successCount} produtos`);
                    if (errorCount > 0) {
                        console.log(`⚠️  ${errorCount} erros`);
                    }
                    db.close();
                });
            }
        });
    });
}

function createSampleProducts() {
    const sampleProducts = [
        {
            name: 'Stranger Things - Camiseta Eleven',
            description: 'Camiseta oficial com estampa exclusiva da Eleven.',
            price: 89.90,
            category: 'stranger-things',
            image_url: null,
            stock: 10,
            active: 1
        },
        {
            name: 'Stranger Things - Moletom Hellfire Club',
            description: 'Moletom oficial do Hellfire Club.',
            price: 149.90,
            category: 'stranger-things',
            image_url: null,
            stock: 10,
            active: 1
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO products (name, description, price, category, image_url, stock, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    sampleProducts.forEach((product) => {
        stmt.run([
            product.name,
            product.description,
            product.price,
            product.category,
            product.image_url,
            product.stock,
            product.active
        ]);
    });

    stmt.finalize(() => {
        console.log('✅ Produtos de exemplo criados!');
        db.close();
    });
}


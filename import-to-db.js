const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = 'database.sqlite';
const JSON_FILE = 'gocase-products-final.json';

console.log('🚀 Importando produtos da GoCase para o banco de dados...\n');

// Conectar ao banco de dados
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite\n');
        importProducts();
    }
});

function importProducts() {
    // Ler arquivo JSON
    if (!fs.existsSync(JSON_FILE)) {
        console.error(`❌ Arquivo ${JSON_FILE} não encontrado!`);
        db.close();
        process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const products = jsonData.products || [];

    if (products.length === 0) {
        console.error('❌ Nenhum produto encontrado no arquivo JSON!');
        db.close();
        process.exit(1);
    }

    console.log(`📦 Encontrados ${products.length} produtos para importar\n`);

    // Preparar statement
    const stmt = db.prepare(`
        INSERT INTO products (name, description, price, category, image_url, stock, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Importar cada produto
    products.forEach((product, index) => {
        const name = product.name || 'Produto sem nome';
        const description = product.description || `Produto original do Gocase. SKU: ${product.sku || ''}`;
        const price = parseFloat(product.price) || 0;
        const category = product.category || 'stranger-things';
        const imageUrl = product.image || null;
        const stock = product.inStock !== false ? 10 : 0; // Se inStock é true ou undefined, colocar 10, senão 0
        const active = 1; // Todos os produtos importados começam como ativos

        stmt.run([name, description, price, category, imageUrl, stock, active], function(err) {
            if (err) {
                errorCount++;
                errors.push({ product: name, error: err.message });
                console.log(`❌ Erro ao importar "${name}": ${err.message}`);
            } else {
                successCount++;
                if ((index + 1) % 10 === 0) {
                    console.log(`✅ Importados ${index + 1}/${products.length} produtos...`);
                }
            }

            // Quando todos os produtos foram processados
            if (successCount + errorCount === products.length) {
                stmt.finalize((err) => {
                    if (err) {
                        console.error('❌ Erro ao finalizar statement:', err.message);
                    }

                    console.log('\n' + '='.repeat(50));
                    console.log('📊 RESUMO DA IMPORTAÇÃO');
                    console.log('='.repeat(50));
                    console.log(`✅ Produtos importados com sucesso: ${successCount}`);
                    console.log(`❌ Produtos com erro: ${errorCount}`);
                    console.log(`📦 Total processado: ${products.length}`);

                    if (errors.length > 0) {
                        console.log('\n⚠️  Erros encontrados:');
                        errors.forEach(({ product, error }) => {
                            console.log(`   - ${product}: ${error}`);
                        });
                    }

                    console.log('\n✅ Importação concluída!\n');
                    console.log('💡 Os produtos já estão disponíveis no admin e na loja!\n');

                    db.close((err) => {
                        if (err) {
                            console.error('❌ Erro ao fechar banco de dados:', err.message);
                            process.exit(1);
                        }
                        process.exit(0);
                    });
                });
            }
        });
    });
}


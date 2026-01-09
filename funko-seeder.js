const fs = require('fs');
const path = require('path');

const JSON_FILE = 'funko_api_response.json';
const COLLECTION_NAME = 'Stranger Things Funkos';
const COLLECTION_SLUG = 'stranger-things-funkos';
const TARGET_PRICE = 29.00;

async function seedFunkos(db) {
    console.log('🔄 Verificando necessidade de seed de Funkos...');

    // 1. Verificar se a coleção já existe
    let collectionId = null;
    try {
        const existingCollection = await db.get('SELECT id FROM collections WHERE slug = ?', [COLLECTION_SLUG]);

        if (existingCollection) {
            console.log(`✅ Coleção "${COLLECTION_NAME}" já existe. Pulando seed.`);
            return;
        }

        console.log(`🆕 Coleção "${COLLECTION_NAME}" não encontrada. Iniciando seed automático...`);

        // 2. Criar Coleção
        // Postgres retorna row no INSERT se usarmos RETURNING id, mas o db-helper abstrai.
        // Vamos inserir e depois buscar o ID para ser compatível com ambos (SQLite/PG)

        await db.run('INSERT INTO collections (name, slug, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
            [COLLECTION_NAME, COLLECTION_SLUG, 'Coleção exclusiva de Funkos Stranger Things', 1, 0]
        );

        const newColl = await db.get('SELECT id FROM collections WHERE slug = ?', [COLLECTION_SLUG]);
        if (!newColl) {
            console.error('❌ Falha ao criar coleção Funkos.');
            return;
        }
        collectionId = newColl.id;
        console.log(`✅ Coleção criada: ${collectionId}`);

        // 3. Carregar dados do JSON
        // O arquivo JSON deve estar na raiz ou junto com este script. 
        // Em produção (Vercel), arquivos podem não estar graváveis, mas leitura geralmente ok se incluído no build.
        // Vamos garantir que o path esteja correto.
        const jsonPath = path.join(__dirname, JSON_FILE);

        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ Arquivo ${JSON_FILE} não encontrado em: ${jsonPath}`);
            return;
        }

        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        const productsData = JSON.parse(fileContent);

        if (!Array.isArray(productsData)) {
            console.error('❌ JSON inválido para Funkos.');
            return;
        }

        console.log(`📦 Importando ${productsData.length} produtos para o banco de produção...`);

        let successCount = 0;

        for (const product of productsData) {
            try {
                const name = product.productName || product.productTitle || 'Funko Stranger Things';
                const description = product.description || '';
                const category = COLLECTION_SLUG; // Categoria slug

                let imageUrl = null;
                let imagesJson = '[]';

                if (product.items && product.items.length > 0) {
                    const item = product.items[0];
                    if (item.images && item.images.length > 0) {
                        imageUrl = item.images[0].imageUrl;
                        imagesJson = JSON.stringify(item.images.map(img => img.imageUrl));
                    }
                }

                const price = TARGET_PRICE;
                const originalPrice = product.items && product.items[0] && product.items[0].sellers && product.items[0].sellers[0].commertialOffer ? product.items[0].sellers[0].commertialOffer.Price : 0;
                const sku = product.productReference || null;

                // Inserir Produto
                // IMPORTANTE: db.run pode ser async. No db-helper, ele retorna Promise se não passar callback apenas se configurado assim, 
                // mas a implementação atual do db.run com Promise wrapper no server.js (db-helper) já faz isso.
                // Mas o db-helper original tem callbacks. Vamos checar como o db é passado.
                // O db passado aqui deve ser o módulo db-helper.

                // Vamos usar a query direta compatível
                await db.run(`
                    INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [name, description, price, category, imageUrl, 10, 1, imagesJson, originalPrice, sku]);

                // Buscar ID
                const insertedProduct = await db.get('SELECT id FROM products WHERE name = ? ORDER BY id DESC LIMIT 1', [name]);

                if (insertedProduct) {
                    // Associar coleção
                    await db.run('INSERT INTO collection_products (collection_id, product_id) VALUES (?, ?)',
                        [collectionId, insertedProduct.id]
                    );
                    successCount++;
                }

            } catch (err) {
                console.error(`⚠️ Erro ao importar produto ${product.productName || 'X'}: ${err.message}`);
            }
        }

        console.log(`🎉 Seed Funkos concluído: ${successCount} produtos importados em Produção!`);

    } catch (e) {
        console.error('❌ Erro fatal no seed de Funkos:', e);
    }
}

module.exports = { seedFunkos };

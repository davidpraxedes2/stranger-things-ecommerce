const fs = require('fs');
const db = require('./db-helper');

const JSON_FILE = 'funko_api_response.json';
const COLLECTION_NAME = 'Stranger Things Funkos';
const COLLECTION_SLUG = 'stranger-things-funkos';
const TARGET_PRICE = 29.00;

async function importProducts() {
    console.log('🚀 Iniciando importação de Funkos Stranger Things...');

    // 1. Inicializar Banco de Dados
    try {
        await db.initialize();
        console.log('✅ Banco de dados inicializado.');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error);
        process.exit(1);
    }

    // 2. Ler JSON
    let productsData = [];
    try {
        if (fs.existsSync(JSON_FILE)) {
            const fileContent = fs.readFileSync(JSON_FILE, 'utf8');
            // O endpoint de busca retorna um array de produtos diretamente
            productsData = JSON.parse(fileContent);
        } else {
            console.error(`❌ Arquivo ${JSON_FILE} não encontrado.`);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Erro ao ler JSON:', error);
        process.exit(1);
    }

    if (!Array.isArray(productsData)) {
        console.error('❌ Formato de JSON inválido. Esperado um array.');
        process.exit(1);
    }

    console.log(`📦 Encontrados ${productsData.length} produtos para processar.`);

    // 3. Criar ou Obter a Coleção
    let collectionId = null;
    try {
        const existingCollection = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM collections WHERE slug = ?', [COLLECTION_SLUG], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingCollection) {
            collectionId = existingCollection.id;
            console.log(`ℹ️ Coleção "${COLLECTION_NAME}" já existe (ID: ${collectionId}).`);
        } else {
            console.log(`🆕 Criando coleção "${COLLECTION_NAME}"...`);
            const result = await new Promise((resolve, reject) => {
                db.run('INSERT INTO collections (name, slug, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
                    [COLLECTION_NAME, COLLECTION_SLUG, 'Coleção exclusiva de Funkos Stranger Things', 1, 0],
                    (err, res) => { // db-helper callback signature might vary for sqlite/pg, but usually gives `this` context in sqlite or result object
                        if (err) reject(err);
                        else resolve(res); // For sqlite-helper logic it might be weird, but let's try
                    }
                );
            });
            // Recuperar o ID recém criado
            const newColl = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM collections WHERE slug = ?', [COLLECTION_SLUG], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            collectionId = newColl ? newColl.id : null;
            console.log(`✅ Coleção criada com ID: ${collectionId}`);
        }
    } catch (error) {
        console.error('❌ Erro ao lidar com coleção:', error);
    }

    if (!collectionId) {
        console.error('❌ Falha ao obter ID da coleção. Abortando.');
        process.exit(1);
    }

    // 4. Importar Produtos
    let successCount = 0;

    for (const product of productsData) {
        try {
            // Extrair dados
            const name = product.productName || product.productTitle || 'Funko Stranger Things';
            const description = product.description || '';
            const category = 'stranger-things-funkos'; // Usar slug da categoria nova

            // Tentar pegar imagem
            let imageUrl = null;
            let imagesJson = '[]';

            if (product.items && product.items.length > 0) {
                const item = product.items[0];
                if (item.images && item.images.length > 0) {
                    imageUrl = item.images[0].imageUrl;
                    imagesJson = JSON.stringify(item.images.map(img => img.imageUrl));
                }
            }

            // Preço fixo solicitado pelo usuário
            const price = TARGET_PRICE;
            const originalPrice = product.items && product.items[0] && product.items[0].sellers && product.items[0].sellers[0].commertialOffer ? product.items[0].sellers[0].commertialOffer.Price : 0;
            const sku = product.productReference || null;

            // Inserir produto
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    name,
                    description,
                    price,
                    category,
                    imageUrl,
                    10, // Stock padrão
                    1,  // Active
                    imagesJson,
                    originalPrice,
                    sku
                ], function (err) { // Usar function normal para ter acesso a 'this.lastID' no SQLite se for o caso
                    if (err) {
                        reject(err);
                    } else {
                        // db-helper callback wrappers usually handle simple results. 
                        // But wait, db-helper for SQLite uses callback(err, {lastID...}).
                        // Let's assume the helper is robust.
                        // We need the product ID.
                        resolve();
                    }
                });
            });

            // Precisamos do ID do produto recém inserido.
            // Como é async, o melhor é buscar pelo SKU ou Nome para garantir (ou getLastId se o helper suportasse retorno direto limpo)
            // Vamos buscar pelo nome e sku para ser seguro
            const insertedProduct = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM products WHERE name = ? ORDER BY id DESC LIMIT 1', [name], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (insertedProduct) {
                const productId = insertedProduct.id;

                // Associar à coleção
                await new Promise((resolve, reject) => {
                    db.run('INSERT OR IGNORE INTO collection_products (collection_id, product_id) VALUES (?, ?)',
                        [collectionId, productId], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
                successCount++;
                console.log(`✅ Importado: ${name}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao importar produto ${product.productName}:`, error.message);
        }
    }

    console.log(`\n🎉 Importação concluída! ${successCount} produtos importados e adicionados à coleção.`);
}

importProducts();

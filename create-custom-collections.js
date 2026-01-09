const db = require('./db-helper');

async function createCollections() {
    console.log('🔌 Conectando ao banco de dados...');
    await db.initialize();

    const collectionsToCreate = [
        {
            title: 'Quenchers & Copos',
            slug: 'quenchers-copos',
            keywords: ['quencher', 'copo', 'garrafa', 'caneca', 'tumbler', 'stanley']
        },
        {
            title: 'Mochilas',
            slug: 'mochilas',
            keywords: ['mochila', 'bag', 'costas', 'backpack']
        },
        {
            title: 'Roupas',
            slug: 'roupas',
            keywords: ['camiseta', 'shirt', 'moletom', 'casaco', 'vestido', 'boné', 'roupa', 'vestuário']
        }
    ];

    try {
        // 1. Fetch all products to find images and categorize
        console.log('📦 Buscando produtos existentes...');
        const products = await db.all('SELECT * FROM products');

        if (!products) {
            console.error('❌ db.all retornou undefined. Verifique db-helper.js.');
            process.exit(1);
        }

        console.log(`✅ ${products.length} produtos encontrados.`);

        for (const col of collectionsToCreate) {
            console.log(`\n🚀 Processando coleção: ${col.title}...`);

            // Find matching products
            const matchingProducts = products.filter(p => {
                const text = (p.name + ' ' + (p.description || '')).toLowerCase(); // Changed 'title' to 'name' based on previous output showing 'name' property
                return col.keywords.some(k => text.includes(k.toLowerCase()));
            });

            console.log(`   Found ${matchingProducts.length} matching products.`);

            // Use image from first matching product or generic placeholder
            const image = matchingProducts.length > 0 ? matchingProducts[0].image_url : '/images/placeholder.jpg';

            // 2. Creates or Updates Collection
            // Check if exists
            const existingRow = await db.get('SELECT id FROM collections WHERE slug = ?', [col.slug]);
            let collectionId;

            if (existingRow) {
                collectionId = existingRow.id;
                console.log(`   Collection exists (ID: ${collectionId}). Updating...`);
                // Update
                await db.run('UPDATE collections SET name = ? WHERE id = ?',
                    [col.title, collectionId]); // Title here maps to name content
            } else {
                console.log(`   Creating new collection...`);
                await db.run(
                    'INSERT INTO collections (name, slug, description) VALUES (?, ?, ?)',
                    [col.title, col.slug, `Coleção de ${col.title}`]
                );

                // Get the ID back
                const newRow = await db.get('SELECT id FROM collections WHERE slug = ?', [col.slug]);

                if (!newRow) {
                    // Try getting last inserted if select via slug fails immediately (race condition or sqlite quirk)
                    console.warn('   ⚠️ Could not fetch ID by slug immediately. Falling back to simple logic.');
                    // In many sqlite wrappers, simple inserts act instantly.
                    // If db.get fails, it returns undefined.
                    // Let's assume it failed.
                } else {
                    collectionId = newRow.id;
                    console.log(`   ✅ Created (ID: ${collectionId}).`);
                }
            }

            if (!collectionId) {
                console.error('   ❌ Could not determine Collection ID. Skipping product association.');
                continue;
            }

            // 3. Add products to collection
            if (matchingProducts.length > 0) {
                let addedCount = 0;
                for (const prod of matchingProducts) {
                    // Check if association exists
                    const checkAssoc = await db.get(
                        'SELECT 1 as exists_val FROM collection_products WHERE collection_id = ? AND product_id = ?',
                        [collectionId, prod.id]
                    );

                    if (!checkAssoc) {
                        try {
                            await db.run(
                                'INSERT INTO collection_products (collection_id, product_id) VALUES (?, ?)',
                                [collectionId, prod.id]
                            );
                            addedCount++;
                        } catch (e) {
                            console.error(`   Error adding product ${prod.id}:`, e.message);
                        }
                    }
                }
                console.log(`   🔗 Associated ${addedCount} new products to ${col.title}.`);
            }
        }

        console.log('\n✨ Processo finalizado com sucesso!');

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    } finally {
        process.exit(0);
    }
}

createCollections();

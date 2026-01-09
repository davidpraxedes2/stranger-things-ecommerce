// collection-seeder.js
// Responsible for ensuring default/custom collections exist on startup.

async function seedCollections(db) {
    console.log('🌱 Seeding Product Collections...');

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
        },
        {
            title: 'Capinhas de Celular',
            slug: 'capinhas-celular',
            keywords: ['capinha', 'case', 'capa', 'iphone', 'samsung', 'galaxy', 'celular'],
            priceOverride: 12.90
        }
    ];

    try {
        // Fetch all products just once to minimize DB hits, or fetch per collection?
        // Fetching all is better for keyword matching locally.
        const products = await db.all('SELECT id, name, description, price FROM products'); // Added price to select

        if (!products || products.length === 0) {
            console.log('   ⚠️ No products found. Skipping collection population.');
            return;
        }

        for (const col of collectionsToCreate) {
            // Check if collection exists
            const existingRow = await db.get('SELECT id FROM collections WHERE slug = ?', [col.slug]);
            let collectionId;

            if (existingRow) {
                // Already exists, skip creation
                collectionId = existingRow.id;
            } else {
                console.log(`   Creating collection: ${col.title}...`);
                await db.run(
                    'INSERT INTO collections (name, slug, description) VALUES (?, ?, ?)',
                    [col.title, col.slug, `Coleção de ${col.title}`]
                );

                // Get the ID back
                const newRow = await db.get('SELECT id FROM collections WHERE slug = ?', [col.slug]);
                // If using postgres, we might need a small delay or use RETURNING?
                // db-helper handles RETURNING if query uses it, but db.run does not return rows.

                if (newRow) {
                    collectionId = newRow.id;
                } else {
                    console.error(`   ❌ Failed to retrieve ID for ${col.slug}`);
                    continue;
                }
            }

            // Find matching products
            const matchingProducts = products.filter(p => {
                const text = (p.name + ' ' + (p.description || '')).toLowerCase();
                return col.keywords.some(k => text.includes(k.toLowerCase()));
            });

            if (matchingProducts.length > 0) {
                let addedCount = 0;
                let updatedPriceCount = 0;

                for (const prod of matchingProducts) {
                    try {
                        const checkAssoc = await db.get(
                            'SELECT 1 as exists_val FROM collection_products WHERE collection_id = ? AND product_id = ?',
                            [collectionId, prod.id]
                        );

                        if (!checkAssoc) {
                            await db.run(
                                'INSERT INTO collection_products (collection_id, product_id) VALUES (?, ?)',
                                [collectionId, prod.id]
                            );
                            addedCount++;
                        }

                        // Price Override Logic
                        if (col.priceOverride) {
                            if (Math.abs(prod.price - col.priceOverride) > 0.01) {
                                await db.run('UPDATE products SET price = ? WHERE id = ?', [col.priceOverride, prod.id]);
                                updatedPriceCount++;
                            }
                        }

                    } catch (e) {
                        // Ignore duplicate constraint errors if race condition
                    }
                }
                if (addedCount > 0) {
                    console.log(`   🔗 Added ${addedCount} products to ${col.title}`);
                }
                if (updatedPriceCount > 0) {
                    console.log(`   💰 Updated price to R$ ${col.priceOverride} for ${updatedPriceCount} items in ${col.title}`);
                }
            }
        }
        console.log('✅ Collection seeding completed.');

    } catch (error) {
        console.error('❌ Error seeding collections:', error);
    }
}

module.exports = { seedCollections };

// collection-seeder.js
// Responsible for ensuring default/custom collections exist on startup.

async function seedCollections(db, returnLogs = false) {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        if (returnLogs) logs.push(msg);
    };

    log('🌱 Seeding Product Collections...');

    const collectionsToCreate = [
        {
            title: 'Lançamentos',
            slug: 'lancamentos',
            view: 'carousel',
            keywords: ['lançamento', 'novo', 'novidade', '2024']
        },
        {
            title: 'Hellfire Club',
            slug: 'hellfire-club',
            keywords: ['hellfire', 'club', 'eddie', 'munson', 'dungeons']
        },
        {
            title: 'Colecionáveis',
            slug: 'colecionaveis',
            view: 'carousel',
            keywords: ['funko', 'pop', 'action', 'figure', 'colecionável']
        },
        {
            title: 'Acessórios',
            slug: 'acessorios',
            keywords: ['mochila', 'garrafa', 'copo', 'boné', 'meia', 'chaveiro']
        },
        {
            title: 'Quenchers & Copos',
            slug: 'quenchers-copos',
            keywords: ['quencher', 'copo', 'garrafa', 'caneca', 'tumbler', 'stanley'],
            namePattern: /quencher|copo|garrafa|caneca|tumbler|stanley/i,
            strictMatch: true,
            priceOverride: 59.90
        },
        {
            title: 'Mochilas',
            slug: 'mochilas',
            keywords: ['mochila', 'bag', 'costas', 'backpack', 'escolar']
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
            namePattern: /capinha|case|capa/i,  // Only match if name contains these words
            strictMatch: true,  // Require namePattern match (not just keywords in description)
            priceOverride: 12.90
        }
    ];

    try {
        // Fetch all products just once to minimize DB hits, or fetch per collection?
        // Fetching all is better for keyword matching locally.
        const products = await db.all('SELECT id, name, description, price FROM products'); // Added price to select

        if (!products || products.length === 0) {
            log('   ⚠️ No products found. Skipping collection population.');
            return logs;
        }

        for (const col of collectionsToCreate) {
            // Check if collection exists
            const existingRow = await db.get('SELECT id FROM collections WHERE slug = ?', [col.slug]);
            let collectionId;

            if (existingRow) {
                // Already exists, skip creation
                collectionId = existingRow.id;
            } else {
                log(`   Creating collection: ${col.title}...`);
                await db.run(
                    'INSERT INTO collections (name, slug, description) VALUES (?, ?, ?)',
                    [col.title, col.slug, `Coleção de ${col.title} `]
                );

                // Get the ID back
                const newRow = await db.get('SELECT id FROM collections WHERE slug = ?', [col.slug]);
                // If using postgres, we might need a small delay or use RETURNING?
                // db-helper handles RETURNING if query uses it, but db.run does not return rows.

                if (newRow) {
                    collectionId = newRow.id;
                } else {
                    console.error(`   ❌ Failed to retrieve ID for ${col.slug}`);
                    if (returnLogs) logs.push(`Error: Failed to retrieve ID for ${col.slug}`);
                    continue;
                }
            }

            // Find matching products
            const matchingProducts = products.filter(p => {
                const text = (p.name + ' ' + (p.description || '')).toLowerCase();
                const nameText = p.name.toLowerCase();

                // If strictMatch is enabled, require namePattern match
                if (col.strictMatch && col.namePattern) {
                    return col.namePattern.test(p.name);
                }

                // Otherwise, use keyword matching
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
                    log(`   🔗 Added ${addedCount} products to ${col.title} `);
                }
                if (updatedPriceCount > 0) {
                    log(`   💰 Updated price to R$ ${col.priceOverride} for ${updatedPriceCount} items in ${col.title} `);
                }
            }
        }
        log('✅ Collection seeding completed.');
        return logs;

    } catch (error) {
        console.error('❌ Error seeding collections:', error);
        log('Error seeding collections: ' + error.message);
        return logs;
    }
}

module.exports = { seedCollections };

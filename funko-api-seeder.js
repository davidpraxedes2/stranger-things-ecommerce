const fetch = require('node-fetch');
const cheerio = require('cheerio');

const TARGET_URL = 'https://www.funko.com.br/stranger-things';
const TARGET_COUNT = 40;
const FIXED_PRICE = 29.00;
const COLLECTION_NAME = 'FUNKOS';

async function seedFunkosFromAPI(db) {
    console.log('🎯 Starting Funko seeder from funko.com.br (JSON-LD)...');

    try {
        let products = [];
        let page = 1;

        // --- 1. Scrape Data ---
        while (products.length < TARGET_COUNT) {
            console.log(`\n📄 Scraping Page ${page}...`);
            const url = `${TARGET_URL}?page=${page}`;

            try {
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
                });

                if (!res.ok) {
                    console.error(`❌ Failed to fetch page ${page}: ${res.status} ${res.statusText}`);
                    break;
                }

                const html = await res.text();
                const $ = cheerio.load(html);
                let foundOnPage = 0;

                $('script[type="application/ld+json"]').each((i, el) => {
                    if (products.length >= TARGET_COUNT) return false;

                    try {
                        const json = JSON.parse($(el).html());

                        // Look for ItemList which contains product listings
                        if (json['@type'] === 'ItemList' && Array.isArray(json.itemListElement)) {
                            for (const item of json.itemListElement) {
                                if (products.length >= TARGET_COUNT) break;

                                const productData = item.item;
                                if (!productData || productData['@type'] !== 'Product') continue;

                                // Filter for Stranger Things just in case
                                const name = productData.name || '';
                                const brandName = productData.brand?.name || '';

                                if (!name.toLowerCase().includes('stranger things') && !brandName.toLowerCase().includes('stranger things')) {
                                    continue;
                                }

                                // Avoid duplicates locally
                                if (products.some(p => p.name === name)) continue;

                                const imageUrl = productData.image;
                                const description = productData.description || `Boneco Funko Pop! Stranger Things - ${name}`;

                                products.push({
                                    name: name,
                                    description: description,
                                    price: FIXED_PRICE,
                                    category: 'stranger-things-funkos',
                                    image_url: imageUrl,
                                    stock: 10,
                                    active: 1
                                });
                                foundOnPage++;
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                });

                console.log(`   Found ${foundOnPage} new products on page ${page}`);

                if (foundOnPage === 0) {
                    console.log('   No more products found on site, stopping.');
                    break;
                }

                page++;
                // Be polite but fast enough for deployment
                await new Promise(r => setTimeout(r, 500));

            } catch (err) {
                console.error(`❌ Error scraping page ${page}:`, err.message);
                break;
            }
        }

        console.log(`\n🎉 Collected ${products.length} products (Target: ${TARGET_COUNT})`);

        if (products.length === 0) {
            console.log('⚠️ No products found to import.');
            return;
        }

        // --- 2. Database Insertion ---

        // Helper to ensure DB calls return Promises (fixes potential db-helper mismatch)
        const queryDB = (method, sql, params) => {
            return new Promise((resolve, reject) => {
                try {
                    // Try to call method. If strict callback required, passing callback handles it.
                    // If it returns promise (pg pool), catch handles it? No, db-helper usually returns object or promise.

                    const result = db[method](sql, params, (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });

                    // If the result itself is a promise (some implementations), attach handlers
                    if (result && typeof result.then === 'function') {
                        result.then(resolve).catch(reject);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        };

        // Get or Create Collection
        console.log(`\n📦 Checking Collection "${COLLECTION_NAME}"...`);
        let collection = null;
        try {
            collection = await queryDB('get', 'SELECT * FROM collections WHERE name = ?', [COLLECTION_NAME]);
        } catch (e) {
            console.log('Error checking collection (might not exist yet):', e.message);
        }

        let collectionId;
        if (collection) {
            console.log(`   Found existing collection ID: ${collection.id}`);
            collectionId = collection.id;
        } else {
            console.log(`   Creating new collection...`);
            await queryDB('run', `
                INSERT INTO collections (name, slug, description, is_active)
                VALUES (?, ?, ?, ?)
            `, [COLLECTION_NAME, 'funkos', 'Coleção exclusiva de Stranger Things Funkos', 1]);

            const newColl = await queryDB('get', 'SELECT * FROM collections WHERE name = ?', [COLLECTION_NAME]);
            collectionId = newColl ? newColl.id : null;
            console.log(`   Created collection ID: ${collectionId}`);
        }

        if (!collectionId) {
            console.error('❌ Failed to get collection ID, aborting.');
            return;
        }

        // Insert Products
        console.log('\n💾 Inserting Products...');
        let insertedCount = 0;

        for (const p of products) {
            // Check if product exists
            const existing = await queryDB('get', 'SELECT id FROM products WHERE name = ?', [p.name]);

            let productId;
            if (existing) {
                // Update existing price and ensure active
                await queryDB('run', 'UPDATE products SET price = ?, active = 1 WHERE id = ?', [FIXED_PRICE, existing.id]);
                productId = existing.id;
            } else {
                // Insert new
                if (db.isPostgres) {
                    await queryDB('run', `
                        INSERT INTO products (name, description, price, category, image_url, stock, active)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                     `, [p.name, p.description, p.price, p.category, p.image_url, p.stock, p.active]);
                    const inserted = await queryDB('get', 'SELECT id FROM products WHERE name = ?', [p.name]);
                    productId = inserted ? inserted.id : null;
                } else {
                    const res = await queryDB('run', `
                        INSERT INTO products (name, description, price, category, image_url, stock, active)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                     `, [p.name, p.description, p.price, p.category, p.image_url, p.stock, p.active]);
                    productId = res ? res.lastID : null;
                }
                insertedCount++;
            }

            if (productId) {
                // Link to Collection
                const linkExists = await queryDB('get', 'SELECT * FROM collection_products WHERE collection_id = ? AND product_id = ?', [collectionId, productId]);
                if (!linkExists) {
                    await queryDB('run', 'INSERT INTO collection_products (collection_id, product_id) VALUES (?, ?)', [collectionId, productId]);
                }
            }
        }

        console.log(`\n✅ Seeding Complete! New Products: ${insertedCount}`);

    } catch (err) {
        console.error('\n❌ Fatal Error in Funko Seeder:', err);
    }
}

module.exports = { seedFunkosFromAPI };

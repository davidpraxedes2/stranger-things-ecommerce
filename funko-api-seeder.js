const https = require('https');

async function fetchFunkosFromAPI() {
    return new Promise((resolve, reject) => {
        // Fetch 50 items to ensure we get all 40 valid ones even if search has noise
        const url = 'https://www.funko.com.br/api/catalog_system/pub/products/search?fq=stranger-things&_from=0&_to=49';

        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function seedFunkosFromAPI(db) {
    console.log('🎯 Starting Funko seeder from funko.com.br API...');

    try {
        // Fetch from API
        console.log('🔍 Fetching Funkos from funko.com.br...');
        const apiProducts = await fetchFunkosFromAPI();
        console.log(`✅ Found ${apiProducts.length} products from API`);

        // Get or create collection
        let collectionResult = await db.query(
            "SELECT id FROM collections WHERE slug = 'stranger-things-funkos' LIMIT 1"
        );

        let collectionId;
        if (collectionResult.rows.length === 0) {
            console.log('📝 Creating Stranger Things Funkos collection...');
            const createResult = await db.query(
                `INSERT INTO collections (name, slug, description, is_active, default_view, sort_order) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id`,
                ['Stranger Things Funkos', 'stranger-things-funkos',
                    'Coleção completa de Funkos Pop! de Stranger Things', 1, 'grid', 0]
            );
            collectionId = createResult.rows[0].id;
        } else {
            collectionId = collectionResult.rows[0].id;
        }
        console.log(`✅ Collection ID: ${collectionId}`);

        // Get existing products to avoid duplicates
        const existingResult = await db.query(
            "SELECT name FROM products WHERE category = 'stranger-things-funkos'"
        );
        const existingNames = new Set(existingResult.rows.map(r => r.name));
        console.log(`📊 Existing Funkos in DB: ${existingNames.size}`);

        let imported = 0;
        let skipped = 0;
        let sortOrder = 0;

        for (const apiProduct of apiProducts) {
            // ✅ FILTER: Strict check for "Stranger Things" in the original name
            if (!apiProduct.productName || !apiProduct.productName.toLowerCase().includes('stranger things')) {
                console.log(`⏭️  Skip (not Stranger Things): ${apiProduct.productName}`);
                skipped++;
                continue;
            }

            // Use the original name from API (it already contains "Stranger Things")
            const name = apiProduct.productName;

            if (existingNames.has(name)) {
                skipped++;
                continue;
            }

            // Extract data
            const imageUrl = apiProduct.items?.[0]?.images?.[0]?.imageUrl ||
                'https://via.placeholder.com/300x300?text=Funko+Pop';
            const description = apiProduct.description ||
                `<p>Boneco colecionável Funko Pop! da série Stranger Things. Produto oficial licenciado pela Netflix.</p>`;

            // Insert product
            const productResult = await db.query(
                `INSERT INTO products (name, description, price, category, image_url, stock, active, original_price) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING id`,
                [name, description, 29.00, 'stranger-things-funkos', imageUrl, 10, 1, 39.90]
            );

            const productId = productResult.rows[0].id;

            // Associate with collection
            await db.query(
                `INSERT INTO collection_products (collection_id, product_id, sort_order) 
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [collectionId, productId, sortOrder++]
            );

            imported++;
        }

        console.log(`🎉 Funko seeder complete!`);
        console.log(`   ✅ Imported: ${imported}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   📊 Total: ${imported + existingNames.size}`);

        return { imported, skipped, total: imported + existingNames.size };

    } catch (error) {
        console.error('❌ Funko seeder error:', error.message);
        throw error;
    }
}

module.exports = { seedFunkosFromAPI };

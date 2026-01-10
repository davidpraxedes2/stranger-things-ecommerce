require('dotenv').config();
const https = require('https');
const { Client } = require('pg');

async function fetchFunkosFromAPI() {
    return new Promise((resolve, reject) => {
        const url = 'https://www.funko.com.br/api/catalog_system/pub/products/search?fq=stranger-things&_from=0&_to=39';

        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const products = JSON.parse(data);
                    resolve(products);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function importFunkos() {
    console.log('🔍 Fetching Funkos from funko.com.br API...');
    const apiProducts = await fetchFunkosFromAPI();
    console.log(`✅ Found ${apiProducts.length} products from API`);

    // Connect to Vercel Postgres
    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ No PostgreSQL connection string found');
        process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();
    console.log('✅ Connected to database');

    try {
        // Get or create collection
        let collectionResult = await client.query(
            "SELECT id FROM collections WHERE slug = 'stranger-things-funkos' LIMIT 1"
        );

        let collectionId;
        if (collectionResult.rows.length === 0) {
            console.log('📝 Creating Stranger Things Funkos collection...');
            const createResult = await client.query(
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
        console.log(`✅ Using collection ID ${collectionId}`);

        // Get existing products
        const existingResult = await client.query(
            "SELECT name FROM products WHERE category = 'stranger-things-funkos'"
        );
        const existingNames = new Set(existingResult.rows.map(r => r.name));
        console.log(`📊 Found ${existingNames.size} existing Funkos`);

        let imported = 0;
        let skipped = 0;
        let sortOrder = 0;

        for (const apiProduct of apiProducts) {
            const name = `Boneco Funko Pop! Stranger Things - ${apiProduct.productName}`;

            if (existingNames.has(name)) {
                console.log(`⏭️  Skip: ${apiProduct.productName}`);
                skipped++;
                continue;
            }

            // Extract image
            const imageUrl = apiProduct.items?.[0]?.images?.[0]?.imageUrl ||
                'https://via.placeholder.com/300x300?text=Funko+Pop';

            // Extract description
            const description = apiProduct.description ||
                `<p>Boneco colecionável Funko Pop! da série Stranger Things. Produto oficial licenciado pela Netflix.</p>`;

            // Insert product
            const productResult = await client.query(
                `INSERT INTO products (name, description, price, category, image_url, stock, active, original_price) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING id`,
                [name, description, 29.00, 'stranger-things-funkos', imageUrl, 10, 1, 39.90]
            );

            const productId = productResult.rows[0].id;

            // Associate with collection
            await client.query(
                `INSERT INTO collection_products (collection_id, product_id, sort_order) 
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [collectionId, productId, sortOrder++]
            );

            console.log(`✅ ${imported + 1}/40: ${apiProduct.productName}`);
            imported++;
        }

        console.log(`\n🎉 Import complete!`);
        console.log(`   ✅ Imported: ${imported}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   📊 Total: ${imported + existingNames.size}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

importFunkos()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });

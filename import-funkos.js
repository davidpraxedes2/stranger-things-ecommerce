require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

async function importFunkos() {
    // Read the filled template
    const funkos = JSON.parse(fs.readFileSync('funkos-template.json', 'utf8'));

    console.log(`📦 Importing ${funkos.length} Funkos...`);

    // Connect to Vercel Postgres
    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ No PostgreSQL connection string found in environment variables');
        process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();
    console.log('✅ Connected to database');

    try {
        // Get the Stranger Things Funkos collection ID
        const collectionResult = await client.query(
            "SELECT id FROM collections WHERE slug = 'stranger-things-funkos' LIMIT 1"
        );

        let collectionId;
        if (collectionResult.rows.length === 0) {
            console.log('📝 Creating Stranger Things Funkos collection...');
            const createResult = await client.query(
                `INSERT INTO collections (name, slug, description, is_active, default_view, sort_order) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id`,
                [
                    'Stranger Things Funkos',
                    'stranger-things-funkos',
                    'Coleção completa de Funkos Pop! de Stranger Things',
                    1,
                    'grid',
                    0
                ]
            );
            collectionId = createResult.rows[0].id;
            console.log(`✅ Collection created with ID ${collectionId}`);
        } else {
            collectionId = collectionResult.rows[0].id;
            console.log(`✅ Using existing collection ID ${collectionId}`);
        }

        // Get existing products to avoid duplicates
        const existingResult = await client.query(
            "SELECT name FROM products WHERE category = 'stranger-things-funkos'"
        );
        const existingNames = new Set(existingResult.rows.map(r => r.name));
        console.log(`📊 Found ${existingNames.size} existing Funkos in database`);

        let imported = 0;
        let skipped = 0;
        let sortOrder = 0;

        for (const funko of funkos) {
            if (existingNames.has(funko.name)) {
                console.log(`⏭️  Skipping duplicate: ${funko.name}`);
                skipped++;
                continue;
            }

            // Generate description
            const description = `<p>Boneco colecionável Funko Pop! da série Stranger Things. Produto oficial licenciado pela Netflix.</p>`;

            // Insert product
            const productResult = await client.query(
                `INSERT INTO products (name, description, price, category, image_url, stock, active, original_price) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING id`,
                [
                    funko.name,
                    description,
                    29.00,
                    'stranger-things-funkos',
                    funko.image_url || 'https://via.placeholder.com/300x300?text=Funko+Pop',
                    10,
                    1,
                    39.90
                ]
            );

            const productId = productResult.rows[0].id;

            // Associate with collection
            await client.query(
                `INSERT INTO collection_products (collection_id, product_id, sort_order) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT DO NOTHING`,
                [collectionId, productId, sortOrder++]
            );

            console.log(`✅ Imported: ${funko.name}`);
            imported++;
        }

        console.log(`\n🎉 Import complete!`);
        console.log(`   ✅ Imported: ${imported}`);
        console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
        console.log(`   📊 Total in collection: ${imported + existingNames.size}`);

    } catch (error) {
        console.error('❌ Error during import:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

importFunkos()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    });

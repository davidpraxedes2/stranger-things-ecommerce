// Export SQLite data to PostgreSQL
// Executa localmente para popular o banco PostgreSQL da Vercel

const Database = require('better-sqlite3');
const { Client } = require('pg');

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
    console.error('❌ POSTGRES_URL não configurada!');
    console.error('Configure: export POSTGRES_URL="postgres://..."');
    process.exit(1);
}

async function exportData() {
    console.log('🚀 Iniciando exportação SQLite → PostgreSQL...\n');

    // Connect to SQLite
    const sqlite = new Database('database.sqlite');
    console.log('✅ Conectado ao SQLite local\n');

    // Connect to PostgreSQL
    const pg = new Client({ connectionString: POSTGRES_URL });
    await pg.connect();
    console.log('✅ Conectado ao PostgreSQL remoto\n');

    try {
        // 1. Export Products
        console.log('📦 Exportando produtos...');
        const products = sqlite.prepare('SELECT * FROM products').all();
        console.log(`   ${products.length} produtos encontrados`);

        for (const p of products) {
            await pg.query(`
                INSERT INTO products (id, name, description, price, category, image_url, stock, active, created_at, updated_at, images_json, original_price, sku, has_variants)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    price = EXCLUDED.price,
                    category = EXCLUDED.category,
                    image_url = EXCLUDED.image_url,
                    stock = EXCLUDED.stock,
                    active = EXCLUDED.active,
                    images_json = EXCLUDED.images_json,
                    original_price = EXCLUDED.original_price,
                    sku = EXCLUDED.sku,
                    has_variants = EXCLUDED.has_variants
            `, [p.id, p.name, p.description, p.price, p.category, p.image_url, p.stock, p.active, p.created_at, p.updated_at, p.images_json, p.original_price, p.sku, p.has_variants]);
        }
        console.log('   ✅ Produtos exportados\n');

        // 2. Export Collections
        console.log('📚 Exportando coleções...');
        const collections = sqlite.prepare('SELECT * FROM collections').all();
        console.log(`   ${collections.length} coleções encontradas`);

        for (const c of collections) {
            await pg.query(`
                INSERT INTO collections (id, name, slug, description, is_active, sort_order, default_view, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    slug = EXCLUDED.slug,
                    description = EXCLUDED.description,
                    is_active = EXCLUDED.is_active,
                    sort_order = EXCLUDED.sort_order,
                    default_view = EXCLUDED.default_view
            `, [c.id, c.name, c.slug, c.description, c.is_active, c.sort_order, c.default_view, c.created_at]);
        }
        console.log('   ✅ Coleções exportadas\n');

        // 3. Export Collection Products (MxN)
        console.log('🔗 Exportando relação produtos-coleções...');
        const collectionProducts = sqlite.prepare('SELECT * FROM collection_products').all();
        console.log(`   ${collectionProducts.length} relações encontradas`);

        for (const cp of collectionProducts) {
            await pg.query(`
                INSERT INTO collection_products (collection_id, product_id, sort_order)
                VALUES ($1, $2, $3)
                ON CONFLICT (collection_id, product_id) DO UPDATE SET
                    sort_order = EXCLUDED.sort_order
            `, [cp.collection_id, cp.product_id, cp.sort_order]);
        }
        console.log('   ✅ Relações exportadas\n');

        // 4. Update sequences (important for auto-increment)
        console.log('🔢 Atualizando sequences...');
        
        const maxProductId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
        await pg.query(`SELECT setval('products_id_seq', $1, true)`, [maxProductId]);
        console.log(`   ✅ products_id_seq → ${maxProductId}`);

        const maxCollectionId = collections.length > 0 ? Math.max(...collections.map(c => c.id)) : 0;
        await pg.query(`SELECT setval('collections_id_seq', $1, true)`, [maxCollectionId]);
        console.log(`   ✅ collections_id_seq → ${maxCollectionId}\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📦 ${products.length} produtos`);
        console.log(`📚 ${collections.length} coleções`);
        console.log(`🔗 ${collectionProducts.length} relações`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Erro durante exportação:', error);
        throw error;
    } finally {
        sqlite.close();
        await pg.end();
    }
}

exportData().catch(err => {
    console.error('❌ Falha na exportação:', err);
    process.exit(1);
});

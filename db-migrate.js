// PostgreSQL Migration Script
// Executa automaticamente ao iniciar o servidor se detectar PostgreSQL

async function migratePostgres(db) {
    if (!db.isPostgres) {
        console.log('⏩ SQLite detectado - migração não necessária');
        return;
    }

    console.log('🔄 Iniciando migração PostgreSQL...');

    try {
        // Tabela de produtos
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT,
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                images_json TEXT,
                original_price REAL,
                sku TEXT,
                has_variants INTEGER DEFAULT 0
            )
        `);
        console.log('  ✅ Tabela products criada');

        // Tabela de usuários/admin
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Tabela users criada');

        // Tabela de pedidos
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Tabela orders criada');

        // Tabela de itens do pedido
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);
        console.log('  ✅ Tabela order_items criada');

        // Tabela de coleções
        await db.query(`
            CREATE TABLE IF NOT EXISTS collections (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                default_view TEXT DEFAULT 'grid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Tabela collections criada');

        // Tabela de produtos em coleções (MxN)
        await db.query(`
            CREATE TABLE IF NOT EXISTS collection_products (
                collection_id INTEGER,
                product_id INTEGER,
                sort_order INTEGER DEFAULT 0,
                PRIMARY KEY (collection_id, product_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);
        console.log('  ✅ Tabela collection_products criada');

        // Tabela de carrinho
        await db.query(`
            CREATE TABLE IF NOT EXISTS cart (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                selected_variant TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);
        console.log('  ✅ Tabela cart criada');

        // Criar usuário admin padrão se não existir
        const bcrypt = require('bcryptjs');
        const adminExists = await db.get('SELECT id FROM users WHERE username = $1', ['admin']);
        
        if (!adminExists) {
            const defaultPassword = bcrypt.hashSync('admin123', 10);
            await db.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
                ['admin', 'admin@strangerthings.com', defaultPassword, 'admin']
            );
            console.log('  ✅ Usuário admin criado (admin/admin123)');
        } else {
            console.log('  ⏩ Usuário admin já existe');
        }

        // Verificar se há produtos
        const productCount = await db.get('SELECT COUNT(*) as count FROM products');
        const count = parseInt(productCount?.count || 0);

        if (count === 0) {
            // Inserir produtos de exemplo
            await db.query(`
                INSERT INTO products (name, description, price, category, image_url, stock, active) VALUES
                ($1, $2, $3, $4, $5, $6, $7),
                ($8, $9, $10, $11, $12, $13, $14),
                ($15, $16, $17, $18, $19, $20, $21)
            `, [
                'Stranger Things T-Shirt', 'Camiseta oficial Stranger Things', 79.90, 'stranger-things', 'https://via.placeholder.com/300', 10, 1,
                'Stranger Things Poster', 'Pôster oficial da série', 29.90, 'stranger-things', 'https://via.placeholder.com/300', 20, 1,
                'Stranger Things Mug', 'Caneca temática Stranger Things', 39.90, 'stranger-things', 'https://via.placeholder.com/300', 15, 1
            ]);
            console.log('  ✅ Produtos de exemplo criados');
        } else {
            console.log(`  ⏩ Banco já possui ${count} produtos`);
        }

        // Verificar coleções
        const collectionCount = await db.get('SELECT COUNT(*) as count FROM collections');
        const colCount = parseInt(collectionCount?.count || 0);

        if (colCount === 0) {
            const defaultCollections = [
                { name: 'Stranger Things', slug: 'stranger-things', description: 'Produtos oficiais da série', is_active: 1 },
                { name: 'Camisetas', slug: 'camisetas', description: 'Camisetas estampadas', is_active: 1 },
                { name: 'Acessórios', slug: 'acessorios', description: 'Acessórios diversos', is_active: 1 },
                { name: 'Lançamentos', slug: 'lancamentos', description: 'Novidades da loja', is_active: 1 }
            ];

            for (let i = 0; i < defaultCollections.length; i++) {
                const col = defaultCollections[i];
                await db.query(
                    'INSERT INTO collections (name, slug, description, is_active, sort_order) VALUES ($1, $2, $3, $4, $5)',
                    [col.name, col.slug, col.description, col.is_active, i]
                );
            }
            console.log('  ✅ Coleções padrão criadas');
        } else {
            console.log(`  ⏩ Banco já possui ${colCount} coleções`);
        }

        console.log('✅ Migração PostgreSQL concluída com sucesso!');
        return true;

    } catch (error) {
        console.error('❌ Erro na migração PostgreSQL:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

module.exports = { migratePostgres };

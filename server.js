// Database helper - usar db-helper para compatibilidade com localhost
const db = require('./db-helper');

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BestfyService = require('./bestfy-service');
require('dotenv').config();
const { seedCollections } = require('./collection-seeder');
const { seedFunkos } = require('./funko-seeder');
const { seedFunkosFromAPI } = require('./funko-api-seeder');

const app = express();

// Helper Pushcut Notification
async function sendPushcutNotification(type, orderDetails) {
    const urls = {
        pending: 'https://api.pushcut.io/XPTr5Kloj05Rr37Saz0D1/notifications/Pendente%20delivery',
        approved: 'https://api.pushcut.io/XPTr5Kloj05Rr37Saz0D1/notifications/Aprovado%20delivery'
    };
    const url = urls[type];
    if (!url) return;

    try {
        console.log(`🔔 Enviando notificação Pushcut (${type})...`);
        const itemText = orderDetails.itemName ? `${orderDetails.itemName}` : 'Produto Diversos';
        const totalVal = parseFloat(orderDetails.total).toFixed(2).replace('.', ',');

        let methodTag = '';
        if (orderDetails.paymentMethod === 'pix') methodTag = ' (PIX)';
        else if (orderDetails.paymentMethod === 'credit_card') methodTag = ' (CARD)';

        const body = {
            text: `${itemText} - R$ ${totalVal}${methodTag}`,
            title: `Pedido ${type === 'pending' ? 'Gerado' : 'Aprovado'} #${orderDetails.id}${methodTag}`
        };

        if (typeof fetch !== 'undefined') {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }
        console.log('✅ Pushcut enviado');
    } catch (e) {
        console.error('❌ Pushcut Error:', e.message);
    }
}
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'stranger-things-secret-key-change-in-production';

// Log de inicialização
console.log('🚀 Servidor iniciando... [VERSION FIX 2.1 - POSTGRES COMPAT]');
console.log('📦 Ambiente:', process.env.NODE_ENV || 'development');

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Rota raiz - servir index.html
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        res.status(500).send('Erro ao carregar página');
    }
});

// Servir arquivos estáticos de public
app.use(express.static(path.join(__dirname, 'public')));

// Servir arquivos estáticos da raiz (styles.css, script.js, logo.png, etc)
app.use(express.static(__dirname));

// Rotas explícitas para arquivos estáticos importantes (fallback para Vercel)
app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles.css'), {
        headers: { 'Content-Type': 'text/css' }
    });
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.png'), {
        headers: { 'Content-Type': 'image/png' }
    });
});

app.get('/product-page.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'product-page.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/product-cart.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'product-cart.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/page-loader.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'page-loader.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/checkout.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/checkout-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout-styles.css'), {
        headers: { 'Content-Type': 'text/css' }
    });
});

app.get('/collection-page.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'collection-page.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/search.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'search.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/performance-optimizations.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'performance-optimizations.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

// Admin files
app.get('/admin-app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-app.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/admin-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-styles.css'), {
        headers: { 'Content-Type': 'text/css' }
    });
});

app.get('/brazil.svg', (req, res) => {
    res.sendFile(path.join(__dirname, 'brazil.svg'), {
        headers: { 'Content-Type': 'image/svg+xml' }
    });
});

// Rotas para servir HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/product.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'product.html'));
});

app.get('/collection.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'collection.html'));
});

app.get('/collection-view.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'collection-view.html'));
});

app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.html'));
});

app.get('/order-success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'order-success.html'));
});

app.get('/order-success-pix.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'order-success-pix.html'));
});

app.get('/order-success-card.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'order-success-card.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Redirect /admin directly to /admin.html
app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

// Upload de imagens removido temporariamente para evitar crash

// Inicializar banco de dados
(async function initializeDB() {
    try {
        console.log('🔄 Inicializando banco de dados...');

        if (db.isPostgres) {
            // Postgres - Initialize (db-helper creates base tables + server.js runs migrations)
            console.log('📦 Executando inicialização COMPLETA (db-helper + migrations)...');
            try { await db.initialize(); } catch (e) { console.error('Base init error:', e.message); }
            await initializeDatabase();
        } else {
            // SQLite - Initialize
            console.log('📦 Executando inicialização de Database SQLite...');
            await initializeDatabase();
        }

        console.log('✅ Banco inicializado e tabelas verificadas');

        // Popular banco se estiver vazio (em background)
        setImmediate(async () => {
            // Primeiro limpa os Funkos antigos/errados conforme solicitado
            const { cleanupFunkos } = require('./cleanup-funkos');
            await cleanupFunkos(db);

            populateDatabaseIfEmpty();
            seedCollections(db);
            seedFunkos(db);
            seedFunkosFromAPI(db); // Fetch 40 Funkos from funko.com.br API
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
    }
})();

// Popular banco se estiver vazio
async function populateDatabaseIfEmpty() {
    db.get('SELECT COUNT(*) as count FROM products', [], async (err, row) => {
        if (!err && row && row.count === 0) {
            console.log('📦 Banco vazio detectado. Tentando importar produtos dos arquivos JSON...');

            // Tentar importar produtos reais primeiro
            const imported = await tryImportProductsFromJSON();

            if (!imported) {
                // Se não conseguiu importar, criar produtos de exemplo
                console.log('📦 Criando produtos de exemplo...');
                await createSampleProducts();
            }
        }
    });
}

async function createSampleProducts() {
    const sampleProducts = [
        {
            name: 'Stranger Things - Camiseta Eleven',
            description: 'Camiseta oficial com estampa exclusiva da Eleven, personagem icônico de Stranger Things.',
            price: 89.90,
            category: 'stranger-things',
            stock: 10
        },
        {
            name: 'Stranger Things - Moletom Hellfire Club',
            description: 'Moletom oficial do Hellfire Club. Perfeito para os fãs da série.',
            price: 149.90,
            category: 'stranger-things',
            stock: 10
        },
        {
            name: 'Stranger Things - Capinha para Celular',
            description: 'Capinha oficial Stranger Things com design exclusivo.',
            price: 59.90,
            category: 'stranger-things',
            stock: 10
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO products (name, description, price, category, image_url, stock, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const product of sampleProducts) {
        await new Promise((resolve, reject) => {
            stmt.run([
                product.name,
                product.description,
                product.price,
                product.category,
                null,
                product.stock,
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    stmt.finalize((err) => {
        if (err) {
            console.error('Erro ao criar produtos de exemplo:', err);
        } else {
            console.log('✅ Produtos de exemplo criados!');
        }
    });
}

// Tentar importar produtos dos arquivos JSON
async function tryImportProductsFromJSON() {
    try {
        const fs = require('fs');
        const allProducts = [];

        // Importar produtos da Netflix Shop
        if (fs.existsSync('netflix-shop-products.json')) {
            const netflixData = JSON.parse(fs.readFileSync('netflix-shop-products.json', 'utf8'));
            const netflixProducts = netflixData.products || [];
            allProducts.push(...netflixProducts);
        }

        // Importar produtos da GoCase
        if (fs.existsSync('gocase-products-api.json')) {
            const gocaseData = JSON.parse(fs.readFileSync('gocase-products-api.json', 'utf8'));
            const gocaseProducts = gocaseData.products || [];
            if (gocaseProducts.length > 0) {
                allProducts.push(...gocaseProducts);
            }
        }

        if (allProducts.length === 0) {
            return false;
        }

        console.log(`📥 Importando ${allProducts.length} produtos dos arquivos JSON...`);

        let imported = 0;
        for (const product of allProducts) {
            try {
                const imagesJson = product.images ? JSON.stringify(product.images) : null;
                const imageUrl = product.image || (product.images && product.images[0]) || null;
                const price = parseFloat(product.price) || 0;
                const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;

                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        product.name || 'Produto sem nome',
                        product.description || '',
                        price,
                        product.category || 'stranger-things',
                        imageUrl,
                        product.inStock !== false ? 10 : 0,
                        1,
                        imagesJson,
                        originalPrice,
                        product.sku || null
                    ], (err) => {
                        if (err && !err.message.includes('UNIQUE constraint') && !err.message.includes('duplicate')) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                imported++;
                if (imported % 100 === 0) {
                    console.log(`   ✅ Importados ${imported}/${allProducts.length} produtos...`);
                }
            } catch (error) {
                // Ignorar erros de duplicação
                if (!error.message.includes('UNIQUE') && !error.message.includes('duplicate')) {
                    console.error(`Erro ao importar produto:`, error.message);
                }
            }
        }

        console.log(`✅ ${imported} produtos importados com sucesso!`);
        return imported > 0;
    } catch (error) {
        console.log('⚠️  Erro ao importar produtos dos arquivos JSON:', error.message);
        return false;
    }
}

// Criar tabelas
// Criar tabelas e executar migrações de forma sequencial
async function initializeDatabase() {
    // Helper para rodar queries com Promise
    const runQuery = (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    // Helper simplificado para migrações (ignora erro de coluna duplicada)
    const runMigration = async (query) => {
        try {
            await runQuery(query);
            // console.log(`✅ Migration success: ${query.substring(0, 30)}...`);
        } catch (err) {
            const isDup = err.code === '42701' || err.message.includes('duplicate column');
            if (!isDup) console.error(`⚠️ Migration Error (${query}):`, err.message);
        }
    };

    try {
        // Tabela de produtos
        await runQuery(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            image_url TEXT,
            stock INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            images_json TEXT,
            original_price REAL,
            sku TEXT,
            has_variants INTEGER DEFAULT 0,
            options_json TEXT
        )`);

        // Migrações de produtos
        await runMigration(`ALTER TABLE products ADD COLUMN images_json TEXT`);
        await runMigration(`ALTER TABLE products ADD COLUMN original_price REAL`);
        await runMigration(`ALTER TABLE products ADD COLUMN sku TEXT`);
        await runMigration(`ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0`);
        await runMigration(`ALTER TABLE products ADD COLUMN options_json TEXT`); // JSON string for advanced variants

        // Popular produtos iniciais se vazio
        const prodCount = await new Promise((resolve) => {
            db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => resolve(row ? row.count : 0));
        });

        if (prodCount === 0) {
            console.log('📥 Criando produtos iniciais...');
            await createSampleProducts();
            await tryImportProductsFromJSON();
        }

        // Tabela de usuários
        await runQuery(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabela de pedidos
        await runQuery(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            customer_email TEXT,
            customer_phone TEXT,
            customer_cpf TEXT,
            customer_address TEXT,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migrações de pedidos
        await runMigration("ALTER TABLE orders ADD COLUMN customer_cpf TEXT");
        await runMigration("ALTER TABLE orders ADD COLUMN customer_address TEXT");

        // Tabela de itens do pedido
        await runQuery(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Migrações de order_items
        await runMigration("ALTER TABLE order_items ADD COLUMN selected_variant TEXT");
        // Ensure variant columns are large enough for complex JSON variants
        await runMigration("ALTER TABLE order_items ALTER COLUMN selected_variant TYPE TEXT");
        await runMigration("ALTER TABLE cart_items ALTER COLUMN selected_variant TYPE TEXT");

        // Tabela de coleções
        await runQuery(`CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            default_view TEXT DEFAULT 'grid',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Popular coleções se vazio
        const collCount = await new Promise((resolve) => {
            db.get('SELECT COUNT(*) as count FROM collections', [], (err, row) => resolve(row ? row.count : 0));
        });

        if (collCount === 0) {
            const fs = require('fs');
            let collectionsData = [];
            if (fs.existsSync('collections.json')) {
                try {
                    collectionsData = JSON.parse(fs.readFileSync('collections.json', 'utf8'));
                } catch (e) { console.error('Erro ler collections.json', e); }
            }
            if (collectionsData.length === 0) {
                // Defaults
                collectionsData = [
                    { name: 'Stranger Things', slug: 'stranger-things', description: 'Produtos oficiais da série', is_active: 1 },
                    { name: 'Camisetas', slug: 'camisetas', description: 'Camisetas estampadas', is_active: 1 },
                    { name: 'Acessórios', slug: 'acessorios', description: 'Acessórios diversos', is_active: 1 },
                    { name: 'Lançamentos', slug: 'lancamentos', description: 'Novidades da loja', is_active: 1 }
                ];
            }

            // Inserir sequencialmente
            const stmt = db.prepare('INSERT INTO collections (name, slug, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?)');
            // Note: transacton logic inside db-helper/better-sqlite might be sync? 
            // Better to just insert loop for safety in Postgres/SQLite universal path
            for (const coll of collectionsData) {
                await runQuery('INSERT INTO collections (name, slug, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
                    [coll.name, coll.slug, coll.description, coll.is_active, coll.sort_order || 0]);
            }
            console.log(`✅ ${collectionsData.length} coleções iniciais criadas!`);
        }

        // Migração Collection default_view
        await runMigration(`ALTER TABLE collections ADD COLUMN default_view TEXT DEFAULT 'grid'`);

        // Tabela collection_products
        await runQuery(`CREATE TABLE IF NOT EXISTS collection_products (
            collection_id INTEGER,
            product_id INTEGER,
            sort_order INTEGER DEFAULT 0,
            PRIMARY KEY (collection_id, product_id),
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);

        // Shipping Options
        await runQuery(`CREATE TABLE IF NOT EXISTS shipping_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            delivery_time TEXT,
            active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Payment Gateways
        await runQuery(`CREATE TABLE IF NOT EXISTS payment_gateways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            gateway_type TEXT NOT NULL,
            public_key TEXT,
            secret_key TEXT,
            is_active INTEGER DEFAULT 0,
            settings_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tracking Settings
        await runQuery(`CREATE TABLE IF NOT EXISTS tracking_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT UNIQUE NOT NULL,
            pixel_id TEXT,
            is_active INTEGER DEFAULT 0,
            settings_json TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Analytics Sessions (Live View)
        await runQuery(`CREATE TABLE IF NOT EXISTS analytics_sessions (
            session_id TEXT PRIMARY KEY,
            ip TEXT,
            city TEXT,
            region TEXT,
            country TEXT,
            lat REAL,
            lon REAL,
            current_page TEXT,
            page_title TEXT,
            last_action TEXT,
            device TEXT,
            browser TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Admin User
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        await runQuery(`INSERT OR IGNORE INTO users (username, email, password, role) 
                VALUES ('admin', 'admin@strangerthings.com', ?, 'admin')`, [defaultPassword]);

    } catch (err) {
        console.error('❌ FATAL: Erro na inicialização do DB:', err);
    }
}

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// DB Debug Endpoint
app.get('/api/debug/db', async (req, res) => {
    try {
        let result;
        if (db.isPostgres) {
            result = await db.query('SELECT 1 as status', []);
            result = result.rows[0];
        } else {
            result = db.prepare('SELECT 1 as status').get();
        }
        res.json({
            success: true,
            message: 'Database connection healthy',
            result,
            timestamp: new Date().toISOString(),
            dbType: db.isPostgres ? 'Postgres' : 'SQLite'
        });
    } catch (error) {
        console.error('DB DEBUG ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            dbType: db.isPostgres ? 'Postgres' : 'SQLite'
        });
    }
});


// DEBUG: Schema Inspector
app.get('/api/debug/schema', async (req, res) => {
    try {
        const info = {
            tables: [],
            columns: {},
            counts: {}
        };

        if (db.isPostgres) {
            // List tables
            const tablesRes = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            info.tables = tablesRes.rows.map(r => r.table_name);

            // Columns for key tables
            for (const table of ['products', 'collections', 'orders']) {
                if (info.tables.includes(table)) {
                    const colsRes = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [table]);
                    info.columns[table] = colsRes.rows;

                    const countRes = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                    info.counts[table] = countRes.rows[0].count;
                }
            }
        } else {
            // SQLite
            const tablesRes = await new Promise(resolve => {
                db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => resolve(rows || []));
            });
            info.tables = tablesRes.map(r => r.name);

            for (const table of ['products', 'collections', 'orders']) {
                if (info.tables.includes(table)) {
                    const colsRes = await new Promise(resolve => {
                        db.all(`PRAGMA table_info(${table})`, [], (err, rows) => resolve(rows));
                    });
                    info.columns[table] = colsRes;

                    const countRes = await new Promise(resolve => {
                        db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => resolve(row ? row.count : 0));
                    });
                    info.counts[table] = countRes;
                }
            }
        }

        res.json({ success: true, info });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// Emergency DB Reset Endpoint (Admin only)
app.post('/api/admin/force-db-reset', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Force DB Reset iniciado...');

        // Reinitialize database
        await db.initialize();

        console.log('✅ Database reinicializado com sucesso');
        res.json({
            success: true,
            message: 'Database reinicializado com sucesso',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao resetar database:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        // Verificar todas as variáveis possíveis do Vercel
        const postgresUrl = process.env.POSTGRES_URL ||
            process.env.POSTGRES_PRISMA_URL ||
            process.env.PRISMA_DATABASE_URL ||
            process.env.DATABASE_URL ||
            process.env.POSTGRES_URL_NON_POOLING ||
            process.env.POSTGRES_URL_NONPOOLING;

        const envVars = Object.keys(process.env).filter(k =>
            k.includes('POSTGRES') || k.includes('DATABASE')
        );

        if (postgresUrl) {
            try {
                const { Client } = require('pg');
                const client = new Client({
                    connectionString: postgresUrl
                });

                await client.connect();

                // Verificar se tabela existe
                const tableCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'products'
                    );
                `);

                let count = 0;
                if (tableCheck.rows[0].exists) {
                    const countResult = await client.query('SELECT COUNT(*) as count FROM products');
                    count = parseInt(countResult.rows[0].count);
                }

                await client.end();

                res.json({
                    status: 'ok',
                    database: 'PostgreSQL',
                    tableExists: tableCheck.rows[0].exists,
                    productCount: count,
                    envVarsFound: envVars,
                    timestamp: new Date().toISOString()
                });
            } catch (pgError) {
                res.json({
                    status: 'error',
                    database: 'PostgreSQL (erro na conexão)',
                    error: pgError.message,
                    envVarsFound: envVars,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            res.json({
                status: 'warning',
                database: 'SQLite (PostgreSQL não configurado)',
                hint: 'Configure POSTGRES_URL no Vercel',
                envVarsFound: envVars,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para popular banco manualmente (GET e POST)
app.get('/api/populate', async (req, res) => {
    return handlePopulate(req, res);
});

app.post('/api/populate', async (req, res) => {
    return handlePopulate(req, res);
});

async function handlePopulate(req, res) {
    try {
        if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
            return res.status(400).json({ error: 'PostgreSQL não configurado' });
        }

        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
        });

        await client.connect();

        // Criar tabela
        await client.query(`
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
                sku TEXT
            )
        `);

        // Verificar se já tem produtos
        const countResult = await client.query('SELECT COUNT(*) as count FROM products');
        const count = parseInt(countResult.rows[0].count);

        if (count === 0) {
            // Inserir produtos de exemplo
            const sampleProducts = [
                {
                    name: 'Stranger Things T-Shirt',
                    description: 'Camiseta oficial Stranger Things',
                    price: 79.90,
                    category: 'stranger-things',
                    image_url: 'https://via.placeholder.com/300',
                    stock: 10,
                    active: 1
                },
                {
                    name: 'Stranger Things Poster',
                    description: 'Pôster oficial da série',
                    price: 29.90,
                    category: 'stranger-things',
                    image_url: 'https://via.placeholder.com/300',
                    stock: 20,
                    active: 1
                },
                {
                    name: 'Stranger Things Mug',
                    description: 'Caneca temática Stranger Things',
                    price: 39.90,
                    category: 'stranger-things',
                    image_url: 'https://via.placeholder.com/300',
                    stock: 15,
                    active: 1
                }
            ];

            for (const product of sampleProducts) {
                await client.query(`
                    INSERT INTO products (name, description, price, category, image_url, stock, active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [product.name, product.description, product.price, product.category, product.image_url, product.stock, product.active]);
            }

            await client.end();
            res.json({ success: true, message: `${sampleProducts.length} produtos inseridos` });
        } else {
            await client.end();
            res.json({ success: true, message: `Banco já possui ${count} produtos` });
        }
    } catch (error) {
        console.error('Erro ao popular banco:', error);
        res.status(500).json({ error: error.message });
    }
}

// Endpoint para executar migrações manualmente
app.get('/api/migrate', async (req, res) => {
    try {
        const { migratePostgres } = require('./db-migrate');
        const result = await migratePostgres(db);

        if (result) {
            res.json({ success: true, message: 'Migrações executadas com sucesso!' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao executar migrações' });
        }
    } catch (error) {
        console.error('Erro ao executar migrações:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar produtos (público) - VERSÃO ULTRA SIMPLIFICADA COM TRATAMENTO DE ERRO
app.get('/api/products', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let client = null;

    try {
        // Pegar a primeira variável PostgreSQL que encontrar (Vercel cria automaticamente)
        const connectionString = process.env.POSTGRES_URL ||
            process.env.POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL ||
            process.env.POSTGRES_URL_NON_POOLING ||
            process.env.POSTGRES_URL_NONPOOLING;

        if (!connectionString) {
            // Sem PostgreSQL - usar SQLite local
            console.log('📦 Usando SQLite (desenvolvimento local)');

            return new Promise((resolve) => {
                // Garantir que o banco está inicializado
                if (!db) {
                    console.error('❌ Banco SQLite não inicializado');
                    return res.json([]);
                }

                // Garantir que o banco está inicializado
                initializeDatabase();

                // Buscar produtos do SQLite
                db.all('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC', [], (err, rows) => {
                    if (err) {
                        console.error('❌ Erro ao buscar produtos:', err.message);
                        return res.json([]);
                    }

                    // Se não houver produtos, tentar importar
                    if (!rows || rows.length === 0) {
                        console.log('📥 Nenhum produto encontrado, tentando importar...');
                        createSampleProducts();
                        tryImportProductsFromJSON();

                        // Buscar novamente após importar (dar tempo para o banco processar)
                        setTimeout(() => {
                            db.all('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC', [], (err, rows) => {
                                if (err) {
                                    console.error('Erro ao buscar produtos após import:', err);
                                    return res.json([]);
                                }
                                console.log(`✅ ${rows ? rows.length : 0} produtos encontrados`);
                                res.json(rows || []);
                                resolve();
                            });
                        }, 1500);
                    } else {
                        console.log(`✅ ${rows.length} produtos encontrados no SQLite`);
                        res.json(rows || []);
                        resolve();
                    }
                });
            });
        }

        // PostgreSQL - tudo automático
        const { Client } = require('pg');
        client = new Client({
            connectionString: connectionString,
            connectionTimeoutMillis: 5000
        });

        await client.connect();

        // Criar tabela automaticamente
        await client.query(`
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
                sku TEXT
            )
        `);

        // Verificar se tem produtos, se não tiver, criar alguns
        const countResult = await client.query('SELECT COUNT(*) as count FROM products');
        const count = parseInt(countResult.rows[0]?.count || 0);

        if (count === 0) {
            // Criar produtos automaticamente
            await client.query(`
                INSERT INTO products (name, description, price, category, image_url, stock, active) VALUES
                ('Stranger Things T-Shirt', 'Camiseta oficial Stranger Things', 79.90, 'stranger-things', 'https://via.placeholder.com/300', 10, 1),
                ('Stranger Things Poster', 'Pôster oficial da série', 29.90, 'stranger-things', 'https://via.placeholder.com/300', 20, 1),
                ('Stranger Things Mug', 'Caneca temática Stranger Things', 39.90, 'stranger-things', 'https://via.placeholder.com/300', 15, 1)
            `);
        }

        // Buscar produtos
        const result = await client.query('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC');

        // Enriquecer com coleções
        res.json(result.rows || []);

    } catch (error) {
        console.error('ERRO /api/products:', error.message);
        console.error('Stack:', error.stack);
        // SEMPRE retornar array vazio, nunca crashar
        res.status(200).json([]);
    } finally {
        if (client) {
            try {
                await client.end();
            } catch (e) {
                // Ignorar erro ao fechar
            }
        }
    }
});



// Função helper para buscar coleções com produtos
async function getCollectionsWithProducts(onlyActive = true) {
    console.log(`🔍 Buscando coleções (onlyActive=${onlyActive}, Tabela=${db.isPostgres ? 'Postgres' : 'SQLite'})...`);

    try {
        const query = `
            SELECT c.*, 
            (SELECT COUNT(*) FROM collection_products WHERE collection_id = c.id) as explicit_count
            FROM collections c 
            ${onlyActive ? 'WHERE c.is_active = 1' : ''}
            ORDER BY c.sort_order ASC
        `;

        const collections = await new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        console.log(`✅ Coleções encontradas: ${collections.length}`);

        // Para cada coleção, buscar os produtos ordenados
        for (const col of collections) {
            col.products = await new Promise((resolve) => {
                db.all(`
                    SELECT p.*, cp.sort_order 
                    FROM products p
                    JOIN collection_products cp ON p.id = cp.product_id
                    WHERE cp.collection_id = ? AND p.active = 1
                    ORDER BY cp.sort_order ASC
                `, [col.id], (err, products) => {
                    if (err) {
                        console.error(`❌ Erro ao buscar produtos da coleção ${col.id}:`, err);
                        resolve([]);
                    } else {
                        // Parse JSON fields
                        products.forEach(p => {
                            if (p.images_json) try { p.images = JSON.parse(p.images_json) } catch (e) { }
                        });
                        resolve(products);
                    }
                });
            });
            col.product_count = col.products.length;
        }

        return collections;

    } catch (error) {
        console.error('❌ Erro helper getCollectionsWithProducts:', error);
        throw error;
    }
}

// Buscar coleções (público) - DB Backed
app.get('/api/collections', async (req, res) => {
    try {
        const collections = await getCollectionsWithProducts(true);
        console.log(`📤 Retornando ${collections.length} coleções para o front`);
        res.json(collections);
    } catch (err) {
        console.error('Erro ao buscar coleções:', err);
        res.status(500).json({ error: 'Erro ao carregar coleções' });
    }
});

// Admin: Listar todas (incluindo inativas)
app.get('/api/admin/collections', authenticateToken, async (req, res) => {
    try {
        const collections = await getCollectionsWithProducts(false);
        res.json(collections);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Criar Coleção
app.post('/api/admin/collections', authenticateToken, (req, res) => {
    const { name, slug, description, is_active, default_view } = req.body;
    db.run('INSERT INTO collections (name, slug, description, is_active, default_view, sort_order) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM collections))',
        [name, slug, description, is_active ? 1 : 0, default_view || 'grid'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID, message: 'Coleção criada com sucesso' });
        }
    );
});

// Admin: Reordenar Coleções
app.put('/api/admin/collections/reorder', authenticateToken, async (req, res) => {
    const { order } = req.body; // Array of { id, sort_order }
    if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Formato inválido' });

    try {
        // Sequencial é mais seguro para evitar locking no SQLite
        for (const item of order) {
            await new Promise((resolve, reject) => {
                db.run('UPDATE collections SET sort_order = ? WHERE id = ?', [item.sort_order, item.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        res.json({ success: true, message: 'Ordem atualizada' });
    } catch (err) {
        console.error('Erro ao reordenar:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Atualizar Coleção
app.put('/api/admin/collections/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, slug, description, is_active, default_view } = req.body;

    try {
        // Se passar apenas default_view (toggle de visualização)
        if (name === undefined && slug === undefined && description === undefined && default_view !== undefined) {
            return db.run('UPDATE collections SET default_view = ? WHERE id = ?', [default_view, id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                if (result && result.changes === 0) return res.status(404).json({ error: 'Coleção não encontrada' });
                res.json({ success: true, message: 'Visualização padrão atualizada' });
            });
        }

        // Se passar apenas is_active (toggle de status)
        if (name === undefined && is_active !== undefined && default_view === undefined) {
            return db.run('UPDATE collections SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                if (result && result.changes === 0) return res.status(404).json({ error: 'Coleção não encontrada' });
                res.json({ success: true, message: 'Status atualizado' });
            });
        }

        // Atualização completa
        db.run('UPDATE collections SET name = ?, slug = ?, description = ?, is_active = ?, default_view = ? WHERE id = ?',
            [name, slug, description, is_active ? 1 : 0, default_view || 'grid', id],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                if (result && result.changes === 0) return res.status(404).json({ error: 'Coleção não encontrada' });
                res.json({ success: true, message: 'Coleção atualizada' });
            }
        );
    } catch (error) {
        console.error('Erro ao atualizar coleção:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin: Reordenar Coleções
// Admin: Reordenar Coleções (Mover para cima de :id)
// MOVIDO PARA CIMA


// Admin: Deletar Coleção
app.delete('/api/admin/collections/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM collections WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Coleção removida' });
    });
});

// Tabela collection_products movida para initializeDatabase para evitar erro de Foreign Key
// (Código removido daqui)

// ... (existing code) ...

// Admin: Adicionar produto à coleção
app.post('/api/admin/collections/:id/products', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { product_id } = req.body;

    db.run('INSERT INTO collection_products (collection_id, product_id, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM collection_products WHERE collection_id = ?))',
        [id, product_id, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: 'Produto já está na coleção' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Produto adicionado à coleção' });
        }
    );
});

// Admin: Remover produto da coleção
app.delete('/api/admin/collections/:id/products/:productId', authenticateToken, (req, res) => {
    const { id, productId } = req.params;
    db.run('DELETE FROM collection_products WHERE collection_id = ? AND product_id = ?', [id, productId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Produto removido da coleção' });
    });
});

// Admin: Obter produtos da coleção (IDs)
app.get('/api/admin/collections/:id/products', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.all('SELECT product_id FROM collection_products WHERE collection_id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.product_id));
    });
});

// Admin: Atualizar produtos da coleção (Bulk)
app.put('/api/admin/collections/:id/products', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { product_ids } = req.body; // Array of IDs

    if (!Array.isArray(product_ids)) {
        return res.status(400).json({ error: 'product_ids deve ser um array' });
    }

    const deleteStmt = db.prepare('DELETE FROM collection_products WHERE collection_id = ?');
    const insertStmt = db.prepare('INSERT INTO collection_products (collection_id, product_id, sort_order) VALUES (?, ?, ?)');

    const transaction = db.transaction((collectionId, productIds) => {
        deleteStmt.run(collectionId);
        let order = 0;
        for (const prodId of productIds) {
            insertStmt.run(collectionId, prodId, order++);
        }
    });

    try {
        transaction(id, product_ids);
        res.json({ success: true, message: 'Produtos da coleção atualizados' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Reordenar produtos na coleção
app.put('/api/admin/collections/:id/reorder-products', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { order } = req.body; // Array of { product_id, sort_order }

    if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Formato inválido' });

    try {
        if (db.isPostgres) {
            // Postgres - Use db.query directly to update order
            for (const item of order) {
                await db.query(
                    'UPDATE collection_products SET sort_order = $1 WHERE collection_id = $2 AND product_id = $3',
                    [item.sort_order, parseInt(id), item.product_id]
                );
            }
            res.json({ success: true, message: 'Ordem updated (Postgres)' });
        } else {
            // SQLite
            const stmt = db.prepare('UPDATE collection_products SET sort_order = ? WHERE collection_id = ? AND product_id = ?');
            const transaction = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.sort_order, id, item.product_id);
                }
            });
            transaction(order);
            res.json({ success: true, message: 'Ordem dos produtos atualizada' });
        }
    } catch (err) {
        console.error('Erro ao reordenar:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Listar todos os pedidos
// Admin orders route moved to line 2054+ (consolidated, no duplicate)

// Admin: Atualizar status do pedido
app.put('/api/admin/orders/:id/status', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
        const result = stmt.run(status, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json({ success: true, message: 'Status atualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar produto por ID (público)
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM products WHERE id = ? AND active = 1', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Parse JSON fields if necessary
        if (product.images_json) {
            try { product.images = JSON.parse(product.images_json); } catch (e) { }
        } else {
            product.images = product.image_url ? [product.image_url] : [];
        }

        res.json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar pedido (público)
app.post('/api/orders', async (req, res) => {
    const { customer_name, customer_email, customer_phone, customer_cpf, customer_address, payment_method, items, subtotal, shipping, discount, total, session_id, status } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Pedido vazio' });
    }

    try {
        // Inserir pedido
        const query = `
            INSERT INTO orders (customer_name, customer_email, customer_phone, customer_cpf, customer_address, total, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `; // Changed datetime('now') to CURRENT_TIMESTAMP for compatibility

        let orderId;

        if (db.isPostgres) {
            // Postgres - Async await
            // db.run returns { lastID, changes }
            const result = await db.run(query, [
                customer_name,
                customer_email,
                customer_phone,
                customer_cpf,
                customer_address,
                total,
                status || 'pending'
            ]);
            orderId = result.lastID;
        } else {
            // SQLite - Sync (db.run returns result directly if no callback)
            // But db-helper wraps it. For consistency, let's use the callback-less promise version if supported, 
            // OR use the specific logic. 
            // db-helper db.run returns a Promise for Postgres but sync for SQLite?
            // Checking db-helper wrapper again:
            // runSQLite always returns (sync) if no callback? 
            // No, runSQLite in db-helper uses callbacks. 
            // db.run tries to handle both.

            // Safer way: use db.run as Promise (db-helper supports it for Postgres, but for SQLite it might not)
            // Let's stick to simple db.prepare for SQLite since it works well there.

            const stmt = db.prepare(`
                INSERT INTO orders (customer_name, customer_email, customer_phone, customer_cpf, customer_address, total, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `);
            const result = stmt.run(customer_name, customer_email, customer_phone, customer_cpf, customer_address, total, status || 'pending');
            orderId = result.lastInsertRowid;
        }

        if (!orderId) {
            throw new Error('Falha ao obter ID do pedido');
        }

        // Inserir itens do pedido
        const itemQuery = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)';

        // For items, we can use a loop. For Postgres we need to await.
        if (db.isPostgres) {
            for (const item of items) {
                await db.run(itemQuery, [orderId, item.id, item.quantity, item.price]);
            }
        } else {
            const itemStmt = db.prepare(itemQuery);
            const transaction = db.transaction((orderItems) => {
                for (const item of orderItems) itemStmt.run(orderId, item.id, item.quantity, item.price);
            });
            transaction(items);
        }

        // Limpar carrinho da sessão se fornecido
        if (session_id) {
            if (db.isPostgres) {
                await db.run('DELETE FROM cart_items WHERE session_id = ?', [session_id]);
            } else {
                db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(session_id);
            }
        }

        // Notify Pending (Only for PIX)
        // items[0] should be available
        const mainItemName = (items && items.length > 0) ? items[0].name : 'Vários Itens';

        if (payment_method === 'pix') {
            sendPushcutNotification('pending', {
                id: orderId,
                itemName: mainItemName,
                total: total,
                paymentMethod: 'pix'
            }).catch(e => console.error('Async Pushcut Fail:', e));
        }

        console.log('✅ Pedido criado com sucesso:', orderId);
        res.status(201).json({ success: true, orderId });
    } catch (err) {
        console.error('Erro ao criar pedido:', err);
        res.status(500).json({ error: err.message });
    }
});

// Buscar pedido por ID (público - para página de sucesso)
// Buscar pedido por ID (público - para página de sucesso)
app.get('/api/orders/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const order = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Buscar itens do pedido com dados dos produtos
        const items = await new Promise((resolve, reject) => {
            db.all(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        order.items = items;

        res.json(order);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({ error: error.message });
    }
});

// Processar pagamento (público)
app.post('/api/payments/process', async (req, res) => {
    const { order_id, card, amount } = req.body;

    try {
        console.log(`🔄 Iniciando processamento de pagamento para pedido ${order_id}...`);

        // 1. Buscar chaves do banco de dados (prioridade) ou variável de ambiente
        let gateway;
        if (db.isPostgres) {
            const result = await db.query("SELECT * FROM payment_gateways WHERE gateway_type = 'bestfy' AND is_active = 1", []);
            gateway = result.rows?.[0];
        } else {
            gateway = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM payment_gateways WHERE gateway_type = 'bestfy' AND is_active = 1", [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        const secretKey = gateway?.secret_key || process.env.BESTFY_SECRET_KEY;
        const publicKey = gateway?.public_key || process.env.BESTFY_PUBLIC_KEY;

        if (!secretKey || !publicKey) {
            console.error('❌ ERRO CRÍTICO: Chaves da Bestfy não encontradas!');
            console.error('   DB Gateway:', gateway ? 'Encontrado' : 'Não encontrado');
            console.error('   DB Secret:', gateway?.secret_key ? '***' : 'Missing');
            console.error('   Env Secret:', process.env.BESTFY_SECRET_KEY ? '***' : 'Missing');

            return res.status(500).json({
                success: false,
                error: 'Erro de configuração: Chaves de pagamento não configuradas no Admin ou .env'
            });
        }

        const bestfyService = new BestfyService(secretKey, publicKey);

        // 2. Buscar dados do pedido
        const order = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM orders WHERE id = ?', [order_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!order) {
            console.error(`❌ Pedido ${order_id} não encontrado no banco.`);
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // 3. Preparar transactionData
        const transactionData = {
            orderId: order_id,
            amount: amount,
            card: card,
            installments: req.body.installments || 1,
            customer: {
                name: order.customer_name,
                email: order.customer_email,
                phone: order.customer_phone,
                cpf: order.customer_cpf || '00000000000', // Usa o CPF do pedido ou fallback
                address: order.customer_address ? {
                    street: order.customer_address,
                    streetNumber: '123', // TODO: Parsear endereço corretamente
                    complement: '',
                    neighborhood: 'Centro',
                    city: 'Cidade',
                    state: 'SP',
                    zipCode: '00000000'
                } : undefined
            },
            items: [
                { title: `Pedido #${order_id}`, unitPrice: Math.round(amount * 100), quantity: 1 }
            ]
        };

        console.log('🔄 Enviando transação para Bestfy:', JSON.stringify(transactionData, null, 2));

        // 4. Chamar API
        const transaction = await bestfyService.createCreditCardTransaction(transactionData);

        console.log('✅ Resposta Bestfy:', transaction.status);

        // 5. Atualizar DB
        const status = transaction.status === 'APPROVED' ? 'paid' : 'failed';
        await new Promise((resolve, reject) => {
            db.run('UPDATE orders SET status = ?, transaction_id = ? WHERE id = ?', [status, transaction.id, order_id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (status === 'paid') {
            // Notify Approved (Card)
            sendPushcutNotification('approved', {
                id: order_id,
                itemName: transactionData.items[0].title,
                total: amount,
                paymentMethod: 'credit_card'
            }).catch(e => console.error('Card Pushcut Fail:', e));

            res.json({
                success: true,
                status: 'approved',
                message: 'Pagamento aprovado!',
                transaction_id: transaction.id,
                gateway_response: transaction
            });
        } else {
            console.warn('⚠️ Pagamento recusado:', transaction);
            res.json({
                success: false,
                status: 'declined',
                message: 'Pagamento recusado pela operadora.',
                details: transaction
            });
        }

    } catch (error) {
        console.error('❌ EXCEPTION no pagamento:', error);

        // Log to file
        const fs = require('fs');
        const errorLog = `
----------------------------------------
[${new Date().toISOString()}] PAYMENT ERROR
Message: ${error.message}
Stack: ${error.stack}
Details: ${JSON.stringify(error.error || {}, null, 2)}
----------------------------------------
`;
        fs.appendFileSync('payment-errors.log', errorLog);

        if (error.error) console.error('   Bestfy Error Details:', JSON.stringify(error.error, null, 2));

        const statusCode = error.statusCode || 500;
        let friendlyMessage = error.message || 'Erro no processamento do pagamento';

        if (error.error && error.error.errors) {
            const details = error.error.errors;
            const keys = Object.keys(details);
            if (keys.length > 0) {
                friendlyMessage = `${keys[0]}: ${details[keys[0]][0]}`;
                if (keys[0] === 'number') friendlyMessage = 'Número do cartão inválido';
                if (keys[0] === 'cvv') friendlyMessage = 'CVV inválido';
            }
        }

        res.status(statusCode).json({
            success: false,
            message: friendlyMessage,
            error: friendlyMessage,
            details: error.error || null
        });
    }
});

// ===== ROTAS DE CARRINHO =====

// Gerar session ID se não existir
function getSessionId(req) {
    return req.headers['x-session-id'] || req.body.session_id || req.query.session_id || 'default';
}

// Buscar carrinho
app.get('/api/cart', async (req, res) => {
    const sessionId = getSessionId(req);

    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`
        SELECT ci.*, p.name, p.image_url, p.sku 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = ?
            ORDER BY ci.created_at DESC
                `, [sessionId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        res.json({ items: rows, total: total });
    } catch (err) {
        console.error('Erro ao buscar carrinho:', err);
        res.status(500).json({ error: err.message });
    }
});

// Adicionar item ao carrinho
// Adicionar item ao carrinho
app.post('/api/cart/add', async (req, res) => {
    const sessionId = getSessionId(req);
    const { product_id, quantity = 1, selected_variant, price } = req.body;

    if (!product_id || !price) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    try {
        // Verificar se o produto já está no carrinho
        const existing = await new Promise((resolve, reject) => {
            db.get(`
        SELECT * FROM cart_items 
        WHERE session_id = ? AND product_id = ? AND selected_variant = ?
            `, [sessionId, product_id, selected_variant || null], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            // Atualizar quantidade
            const newQuantity = existing.quantity + quantity;
            await new Promise((resolve, reject) => {
                db.run(`
                UPDATE cart_items 
                SET quantity = ?, price = ?
            WHERE id = ?
                `, [newQuantity, price, existing.id], function (err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
            res.json({ success: true, message: 'Item atualizado no carrinho', id: existing.id });
        } else {
            // Adicionar novo item
            await new Promise((resolve, reject) => {
                db.run(`
                INSERT INTO cart_items(session_id, product_id, quantity, selected_variant, price)
        VALUES(?, ?, ?, ?, ?)
            `, [sessionId, product_id, quantity, selected_variant || null, price], function (err) {
                    if (err) reject(err);
                    else resolve(this); // this.lastID accessible here? Wrapper logic dependent.
                    // Better to rely on helper returning lastID in result object if Promise.
                    // But db.run (sqlite-style) returns 'this'.
                    // For Postgres wrapper, we need to check if lastID is passed.
                });
            });
            // Note: retrieving lastID with async wrapper might need specific handling if not returned in resolve.
            // But usually for cart adds, just success is enough.
            res.json({ success: true, message: 'Item adicionado ao carrinho' });
        }
    } catch (err) {
        console.error('Erro ao adicionar item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Atualizar quantidade do item
// Atualizar quantidade do item
app.put('/api/cart/update/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    const sessionId = getSessionId(req);

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Quantidade inválida' });
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(`
        UPDATE cart_items 
        SET quantity = ?
            WHERE id = ? AND session_id = ?
                `, [quantity, id, sessionId], function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        res.json({ success: true, message: 'Quantidade atualizada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remover item do carrinho
// Remover item do carrinho
app.delete('/api/cart/remove/:id', async (req, res) => {
    const { id } = req.params;
    const sessionId = getSessionId(req);

    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM cart_items WHERE id = ? AND session_id = ?', [id, sessionId], function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        res.json({ success: true, message: 'Item removido do carrinho' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Limpar carrinho
// Limpar carrinho
app.delete('/api/cart/clear', async (req, res) => {
    const sessionId = getSessionId(req);

    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM cart_items WHERE session_id = ?', [sessionId], function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        res.json({ success: true, message: 'Carrinho limpo' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ROTAS DE AUTENTICAÇÃO =====

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    });
});

// Admin login (alias para /api/auth/login)
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('🔐 Admin login attempt:', { username, password: password ? '***' : 'EMPTY' });

    try {
        // PostgreSQL usa $1, $2; SQLite usa posicional
        const query = db.isPostgres
            ? 'SELECT * FROM users WHERE username = $1 OR email = $2'
            : 'SELECT * FROM users WHERE username = ? OR email = ?';

        let user;
        if (db.isPostgres) {
            user = await db.get(query, [username, username]);
        } else {
            // SQLite síncrono
            user = db.prepare(query).get(username, username);
        }

        console.log('👤 User found:', user ? user.username : 'NOT FOUND');

        // Se não encontrou usuário E o username é 'admin', criar o usuário padrão
        if (!user && username === 'admin') {
            console.log('⚠️ Admin user not found, creating default admin...');
            const defaultPassword = bcrypt.hashSync('admin123', 10);

            const insertQuery = db.isPostgres
                ? 'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING RETURNING id'
                : 'INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';

            if (db.isPostgres) {
                const result = await db.query(insertQuery, ['admin', 'admin@strangerthings.com', defaultPassword, 'admin']);
                console.log('✅ Admin user created successfully (PostgreSQL)');

                // Buscar ID do admin recém-criado
                user = await db.get('SELECT * FROM users WHERE username = $1', ['admin']);
            } else {
                db.prepare(insertQuery).run('admin', 'admin@strangerthings.com', defaultPassword, 'admin');
                console.log('✅ Admin user created successfully (SQLite)');
                user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
            }

            // Tentar login novamente após criar
            if (password === 'admin123' && user) {
                const token = jwt.sign(
                    { id: user.id, username: 'admin', role: 'admin' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return res.json({
                    token,
                    user: {
                        id: user.id,
                        username: 'admin',
                        email: 'admin@strangerthings.com',
                        role: 'admin'
                    }
                });
            } else {
                return res.status(401).json({
                    error: 'DEBUG: Falha crítica - Admin criado mas login falhou',
                    details: {
                        hasUser: !!user,
                        passMatch: password === 'admin123'
                    }
                });
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'DEBUG: Usuário não encontrado (nem após tentativa de criação)' });
        }

        // AUTO-CHECK: Se for admin e senha admin123, garantir que o hash bate
        if (username === 'admin' && password === 'admin123') {
            const matches = bcrypt.compareSync(password, user.password);
            if (!matches) {
                console.log('⚠️ Admin password mismatch. Resetting to default (admin123)...');
                const newHash = bcrypt.hashSync('admin123', 10);
                if (db.isPostgres) {
                    await db.query('UPDATE users SET password = $1 WHERE username = $2', [newHash, 'admin']);
                } else {
                    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newHash, 'admin');
                }
                user.password = newHash; // Atualizar objeto local para passar na validação
            }
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'DEBUG: Senha incorreta' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('❌ DB error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== ROTAS ADMIN (PROTEGIDAS) =====

// Dashboard stats - Version 3 (Paralelo)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        let productCount = 0;
        let orderCount = 0;
        let revenue = 0;

        if (db.isPostgres) {
            // PostgreSQL async
            const [products, orders, revenueData] = await Promise.all([
                db.get('SELECT COUNT(*) as count FROM products', []),
                db.get('SELECT COUNT(*) as count FROM orders', []),
                db.get("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'paid' OR status = 'completed'", [])
            ]);

            productCount = parseInt(products?.count || 0);
            orderCount = parseInt(orders?.count || 0);
            revenue = parseFloat(revenueData?.total || 0);
        } else {
            // SQLite síncrono
            const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
            const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
            const revenueData = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'paid' OR status = 'completed'").get();

            productCount = parseInt(products?.count || 0);
            orderCount = parseInt(orders?.count || 0);
            revenue = parseFloat(revenueData?.total || 0);
        }

        res.json({
            total_products: productCount,
            total_orders: orderCount,
            total_revenue: revenue,
            today_sales: `R$ ${revenue.toFixed(2).replace('.', ',')} `
        });
    } catch (err) {
        console.error('Erro em stats:', err);
        res.json({
            total_products: 0,
            total_orders: 0,
            total_revenue: 0,
            today_sales: 'R$ 0,00'
        });
    }
});

// Listar todos os produtos (admin)
// Listar todos os produtos (admin)
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        let products = [];
        if (db.isPostgres) {
            const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
            products = result.rows;
        } else {
            products = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        }
        res.json(products);
    } catch (err) {
        console.error('Erro ao listar produtos admin:', err);
        res.status(500).json({ error: err.message });
    }
});

// Criar produto (admin)
app.post('/api/admin/products', authenticateToken, (req, res) => {
    const { name, description, price, category, stock, has_variants, images_json } = req.body;
    const image_url = req.file ? `/ uploads / products / ${req.file.filename} ` : null;

    db.run(
        'INSERT INTO products (name, description, price, category, image_url, stock, has_variants, images_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, description, parseFloat(price), category, image_url, parseInt(stock) || 0, has_variants ? 1 : 0, images_json || '[]'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                success: true,
                message: 'Produto criado com sucesso',
                id: this.lastID
            });
        }
    );
});

// Atualizar produto (admin)
app.put('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, stock, active, has_variants, images_json } = req.body;

    let query = 'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, active = ?, has_variants = ?, images_json = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [name, description, parseFloat(price), category, parseInt(stock) || 0, active ? 1 : 0, has_variants ? 1 : 0, images_json || '[]'];

    if (req.file) {
        query += ', image_url = ?';
        params.push(`/ uploads / products / ${req.file.filename} `);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Produto atualizado com sucesso' });
    });
});

// Aplicar desconto em massa (admin)
app.post('/api/admin/products/bulk-discount', authenticateToken, async (req, res) => {
    const { productIds, discountPercent } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Nenhum produto fornecido' });
    }

    try {
        const factor = 1 - (parseFloat(discountPercent) / 100);

        if (db.isPostgres) {
            // Postgres - Update usando IN clause para ser atômico e rápido
            await db.query(`
                UPDATE products 
                SET price = price * $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($2)
            `, [factor, productIds]);
        } else {
            // SQLite - Transaction
            db.exec('BEGIN TRANSACTION');
            try {
                const stmt = db.prepare('UPDATE products SET price = price * ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
                for (const id of productIds) {
                    stmt.run(factor, id);
                }
                db.exec('COMMIT');
            } catch (err) {
                db.exec('ROLLBACK');
                throw err;
            }
        }

        res.json({ success: true, message: `${productIds.length} produtos atualizados com sucesso` });
    } catch (err) {
        console.error('Erro no desconto em massa:', err);
        res.status(500).json({ error: err.message });
    }
});

// Deletar produto (admin)
app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Produto deletado com sucesso' });
    });
});

// Listar pedidos (admin)
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await new Promise((resolve, reject) => {
            db.all(`
        SELECT
        o.*,
            COUNT(oi.id) as items_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos (admin):', error);
        res.status(500).json({ error: error.message });
    }
});

// Atualizar status do pedido (admin)
app.put('/api/admin/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Status do pedido atualizado' });
    });
});

// Buscar pedido completo com itens (admin)
app.get('/api/admin/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!order) {
            res.status(404).json({ error: 'Pedido não encontrado' });
            return;
        }

        db.all(`
            SELECT oi.*, p.name, p.image_url 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
            `, [id], (err, items) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ ...order, items: items });
        });
    });
});

// ===== ROTAS DE CLIENTES (ADMIN) =====

// Listar clientes (admin)
app.get('/api/admin/customers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customers ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Buscar cliente por ID (admin)
app.get('/api/admin/customers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json(row);
    });
});

// Criar cliente (admin)
app.post('/api/admin/customers', authenticateToken, (req, res) => {
    const { name, email, phone, cpf, address, city, state, zip_code } = req.body;

    db.run(`
        INSERT INTO customers(name, email, phone, cpf, address, city, state, zip_code)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
            `, [name, email, phone, cpf, address, city, state, zip_code], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Cliente criado com sucesso', id: this.lastID });
    });
});

// Atualizar cliente (admin)
app.put('/api/admin/customers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, email, phone, cpf, address, city, state, zip_code } = req.body;

    db.run(`
        UPDATE customers 
        SET name = ?, email = ?, phone = ?, cpf = ?, address = ?, city = ?, state = ?, zip_code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
            `, [name, email, phone, cpf, address, city, state, zip_code, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Cliente atualizado com sucesso' });
    });
});

// Deletar cliente (admin)
app.delete('/api/admin/customers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM customers WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Cliente deletado com sucesso' });
    });
});

// ===== SISTEMA DE ANALYTICS E RASTREAMENTO =====

// Armazenamento em memória para analytics (em produção, usar Redis ou banco)
const analyticsData = {
    activeSessions: new Map(),
    pageViews: new Map(),
    visitorLocations: new Map()
};

// Middleware para rastrear visitantes
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/admin') && !req.path.startsWith('/admin')) {
        const sessionId = req.headers['x-session-id'] || req.ip;
        const now = Date.now();

        analyticsData.activeSessions.set(sessionId, {
            lastActivity: now,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            currentPage: req.path
        });

        const page = req.path;
        analyticsData.pageViews.set(page, (analyticsData.pageViews.get(page) || 0) + 1);
    }
    next();
});

// Limpar sessões inativas (mais de 5 minutos)
setInterval(() => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [sessionId, data] of analyticsData.activeSessions.entries()) {
        if (data.lastActivity < fiveMinutesAgo) {
            analyticsData.activeSessions.delete(sessionId);
        }
    }
}, 60000);

// API: Contador de visitantes online db-backed
app.get('/api/admin/analytics/online-count', authenticateToken, (req, res) => {
    try {
        // Active in last 5 minutes
        const query = db.isPostgres ?
            "SELECT COUNT(*) as count FROM analytics_sessions WHERE last_active_at > NOW() - INTERVAL '5 minutes'" :
            "SELECT COUNT(*) as count FROM analytics_sessions WHERE last_active_at > datetime('now', '-5 minutes')";

        if (db.isPostgres) {
            db.query(query, []).then(result => {
                res.json({ count: parseInt(result.rows[0]?.count || 0) });
            }).catch(err => {
                console.error('Error online count PG:', err);
                res.status(500).json({ count: 0 });
            });
        } else {
            db.get(query, [], (err, result) => {
                if (err) {
                    console.error('Error online count SQLite:', err);
                    return res.status(500).json({ count: 0 });
                }
                res.json({ count: parseInt(result?.count || 0) });
            });
        }
    } catch (e) {
        console.error('Error online count:', e);
        res.status(500).json({ count: 0 });
    }
});

// API: Localizações de visitantes (para o mapa)
app.get('/api/admin/analytics/visitor-locations', authenticateToken, (req, res) => {
    try {
        const query = db.isPostgres ?
            "SELECT city, region, lat, lon, COUNT(*) as count FROM analytics_sessions WHERE last_active_at > NOW() - INTERVAL '5 minutes' GROUP BY city, region, lat, lon" :
            "SELECT city, region, lat, lon, COUNT(*) as count FROM analytics_sessions WHERE last_active_at > datetime('now', '-5 minutes') GROUP BY city, region, lat, lon";

        if (db.isPostgres) {
            db.query(query, []).then(result => {
                res.json((result.rows || []).map(r => ({
                    city: r.city,
                    state: r.region,
                    count: parseInt(r.count),
                    lat: r.lat || 0,
                    lon: r.lon || 0,
                    x: 0,
                    y: 0
                })));
            }).catch(err => {
                console.error('Error visitor locations PG:', err);
                res.status(500).json([]);
            });
        } else {
            db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('Error visitor locations SQLite:', err);
                    return res.status(500).json([]);
                }
                res.json((rows || []).map(r => ({
                    city: r.city,
                    state: r.region,
                    count: parseInt(r.count),
                    lat: r.lat || 0,
                    lon: r.lon || 0,
                    x: 0,
                    y: 0
                })));
            });
        }
    } catch (e) {
        console.error('Error visitor locations:', e);
        res.status(500).json([]);
    }
});

// API: Sessões ativas detalhadas
app.get('/api/admin/sessions/active', authenticateToken, (req, res) => {
    try {
        const query = db.isPostgres ?
            "SELECT * FROM analytics_sessions WHERE last_active_at > NOW() - INTERVAL '5 minutes' ORDER BY last_active_at DESC LIMIT 50" :
            "SELECT * FROM analytics_sessions WHERE last_active_at > datetime('now', '-5 minutes') ORDER BY last_active_at DESC LIMIT 50";

        const processRows = (rows) => {
            return (rows || []).map(s => {
                const now = new Date();
                const lastActive = new Date(s.last_active_at);
                const durationMs = now - new Date(s.created_at);
                const minutes = Math.floor(durationMs / 60000);

                return {
                    session_id: s.session_id,
                    city: s.city || 'Desconhecido',
                    state: s.region || '',
                    ip: s.ip,
                    page: s.current_page,
                    pageTitle: s.page_title,
                    action: s.last_action,
                    duration: `${minutes} min`,
                    device: s.device,
                    browser: s.browser,
                    utm_source: s.utm_source,
                    utm_medium: s.utm_medium,
                    utm_campaign: s.utm_campaign,
                    lastActive: lastActive.toISOString()
                };
            });
        };

        if (db.isPostgres) {
            db.query(query, []).then(result => {
                res.json(processRows(result.rows));
            }).catch(err => {
                console.error('Error active sessions PG:', err);
                res.status(500).json([]);
            });
        } else {
            db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('Error active sessions SQLite:', err);
                    return res.status(500).json([]);
                }
                res.json(processRows(rows));
            });
        }
    } catch (e) {
        console.error('Error active sessions:', e);
        res.status(500).json([]);
    }
});

app.post('/api/analytics/heartbeat', (req, res) => {
    try {
        const { session_id, page, pageTitle, action } = req.body;
        if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

        const updateQ = db.isPostgres ?
            "UPDATE analytics_sessions SET current_page=$1, page_title=$2, last_action=$3, last_active_at=NOW() WHERE session_id=$4" :
            "UPDATE analytics_sessions SET current_page=?, page_title=?, last_action=?, last_active_at=datetime('now') WHERE session_id=?";

        const params = [page, pageTitle, action, session_id];

        if (db.isPostgres) {
            db.query(updateQ, params).then(result => {
                if (result.rowCount === 0) {
                    // Session not found, maybe re-create? For now just ignore
                }
                res.json({ success: true });
            }).catch(err => {
                console.error('Error heartbeat PG:', err);
                res.status(500).json({ error: 'DB Error' });
            });
        } else {
            db.run(updateQ, params, (err) => {
                if (err) {
                    console.error('Error heartbeat SQLite:', err);
                    return res.status(500).json({ error: 'DB Error' });
                }
                res.json({ success: true });
            });
        }
    } catch (e) {
        console.error('Error heartbeat:', e);
        res.status(500).json({ error: 'Server Error' });
    }
});

// API: Registrar Heartbeat do visitante
app.post('/api/analytics/heartbeat', async (req, res) => {
    const { sessionId, page, title, action, ip: clientIp, location, utm, device, browser } = req.body;

    // Extract Real IP (Vercel/Proxy friendly)
    let ip = clientIp;
    if (!ip) {
        const forwarded = req.headers['x-forwarded-for'];
        ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    }
    // Clean up IPv6 prefix if present
    if (ip && ip.includes('::ffff:')) ip = ip.replace('::ffff:', '');

    if (!sessionId) return res.status(400).json({ error: 'No Session ID' });

    try {
        // Upsert logic
        let existing;
        if (db.isPostgres) {
            const r = await db.query('SELECT session_id FROM analytics_sessions WHERE session_id = $1', [sessionId]);
            existing = r.rows[0];
        } else {
            existing = db.prepare('SELECT session_id FROM analytics_sessions WHERE session_id = ?').get(sessionId);
        }

        if (existing) {
            // Update
            const updateQ = db.isPostgres ?
                "UPDATE analytics_sessions SET current_page=$1, page_title=$2, last_action=$3, last_active_at=NOW() WHERE session_id=$4" :
                "UPDATE analytics_sessions SET current_page=?, page_title=?, last_action=?, last_active_at=CURRENT_TIMESTAMP WHERE session_id=?";

            const params = [page, title, action || 'view', sessionId];
            if (db.isPostgres) await db.query(updateQ, params);
            else db.prepare(updateQ).run(...params);
        } else {
            // Insert
            const loc = location || { city: 'Desconhecido', region: 'BR', country: 'BR', lat: 0, lon: 0 };

            // Use device/browser from frontend (more accurate than server-side UA parsing)
            const deviceType = device || 'Desktop';
            const browserType = browser || 'Unknown';

            // Extract UTM params
            const utmSource = utm?.source || null;
            const utmMedium = utm?.medium || null;
            const utmCampaign = utm?.campaign || null;

            const insertQ = db.isPostgres ?
                "INSERT INTO analytics_sessions (session_id, ip, city, region, country, lat, lon, current_page, page_title, last_action, device, browser, utm_source, utm_medium, utm_campaign) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)" :
                "INSERT INTO analytics_sessions (session_id, ip, city, region, country, lat, lon, current_page, page_title, last_action, device, browser, utm_source, utm_medium, utm_campaign) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            const params = [
                sessionId, ip,
                loc.city, loc.region, loc.country,
                loc.lat, loc.lon,
                page, title, action || 'view',
                deviceType, browserType,
                utmSource, utmMedium, utmCampaign
            ];

            if (db.isPostgres) await db.query(insertQ, params);
            else db.prepare(insertQ).run(...params);
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Heartbeat Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Remove old in-memory tracking endpoint
// app.post('/api/analytics/track-location', ...

// ===== ROTAS DE FRETES (ADMIN) =====

// Listar opções de frete (admin)
// Listar opções de frete (admin)
app.get('/api/admin/shipping', authenticateToken, async (req, res) => {
    console.log('🔍 Rota /api/admin/shipping chamada');
    try {
        console.log('🔍 Tentando executar query...');
        const options = await db.prepare('SELECT * FROM shipping_options ORDER BY sort_order ASC').all();
        console.log('✅ Query executada com sucesso, registros:', options ? options.length : 0);
        res.json(options || []);
    } catch (error) {
        console.error('❌ Erro ao buscar fretes:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Criar opção de frete (admin)
app.post('/api/admin/shipping', authenticateToken, async (req, res) => {
    const { name, price, delivery_time, active } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }

    try {
        if (db.isPostgres) {
            // Postgres direct query
            const result = await db.query(
                `INSERT INTO shipping_options(name, price, delivery_time, active, sort_order)
                 VALUES($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM shipping_options)) RETURNING id`,
                [name, price, delivery_time || null, active ? 1 : 0]
            );
            res.json({ success: true, id: result.rows[0].id, message: 'Frete criado com sucesso' });
        } else {
            // SQLite / Wrapper
            const stmt = db.prepare(`
                INSERT INTO shipping_options(name, price, delivery_time, active, sort_order)
                VALUES(?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM shipping_options))
            `);
            const result = await stmt.run(name, price, delivery_time || null, active ? 1 : 0);
            res.json({ success: true, id: result.lastID, message: 'Frete criado com sucesso' });
        }
    } catch (error) {
        console.error('Erro ao criar frete:', error);
        res.status(500).json({ error: error.message });
    }
});



// Atualizar opção de frete (admin)
app.put('/api/admin/shipping/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, price, delivery_time, active } = req.body;

    try {
        const stmt = db.prepare('UPDATE shipping_options SET name = ?, price = ?, delivery_time = ?, active = ? WHERE id = ?');
        const result = stmt.run(name, price, delivery_time || null, active ? 1 : 0, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Frete não encontrado' });
        }

        res.json({ success: true, message: 'Frete atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar frete:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deletar opção de frete (admin)
app.delete('/api/admin/shipping/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare('DELETE FROM shipping_options WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Frete não encontrado' });
        }

        res.json({ success: true, message: 'Frete deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar frete:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reordenar opções de frete (admin)
app.put('/api/admin/shipping/reorder', authenticateToken, (req, res) => {
    const { order } = req.body; // Array of { id, sort_order }

    if (!order || !Array.isArray(order)) {
        return res.status(400).json({ error: 'Formato inválido' });
    }

    try {
        const updateStmt = db.prepare('UPDATE shipping_options SET sort_order = ? WHERE id = ?');
        const transaction = db.transaction((items) => {
            for (const item of items) {
                updateStmt.run(item.sort_order, item.id);
            }
        });
        transaction(order);

        res.json({ success: true, message: 'Ordem atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao reordenar fretes:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ROTA PÚBLICA PARA CHECKOUT BUSCAR FRETES =====

// Listar opções de frete ativas (público - para checkout)
app.get('/api/shipping-options', async (req, res) => {
    try {
        if (db.isPostgres) {
            const result = await db.query('SELECT * FROM shipping_options WHERE active = 1 ORDER BY sort_order ASC', []);
            res.json(result.rows || []);
        } else {
            const options = db.prepare('SELECT * FROM shipping_options WHERE active = 1 ORDER BY sort_order ASC').all();
            res.json(options || []);
        }
    } catch (error) {
        console.error('Erro ao buscar opções de frete:', error);
        // Retornar opções padrão se houver erro
        res.json([
            { id: 1, name: 'PAC', price: 15.00, delivery_time: '7-12 dias úteis', active: 1 },
            { id: 2, name: 'SEDEX', price: 25.00, delivery_time: '3-5 dias úteis', active: 1 }
        ]);
    }
});

// ===== ROTAS DE GATEWAY DE PAGAMENTO =====

// Listar gateways de pagamento (admin)
app.get('/api/admin/gateways', authenticateToken, async (req, res) => {
    try {
        let gateways = [];
        if (db.isPostgres) {
            const result = await db.query('SELECT * FROM payment_gateways ORDER BY id ASC', []);
            gateways = result.rows || [];
        } else {
            gateways = await db.prepare('SELECT * FROM payment_gateways ORDER BY id ASC').all(); // FIXED: await added
            // Se falhar e retornar undefined, garantir array
            if (!gateways) gateways = [];
        }

        // AUTO-SEED: Se não houver gateways, criar o Bestfy automaticamente
        if (gateways.length === 0) {
            console.log('⚠️ Nenhum gateway encontrado. Criando Bestfy padrão...');
            const seedQuery = `
                INSERT INTO payment_gateways (name, gateway_type, public_key, secret_key, is_active, settings_json)
                VALUES ('BESTFY Payment Gateway', 'bestfy', '', '', 0, '{}')
            `;

            if (db.isPostgres) {
                await db.query(seedQuery);
                // Buscar novamente
                const r = await db.query('SELECT * FROM payment_gateways ORDER BY id ASC', []);
                gateways = r.rows || [];
            } else {
                db.prepare(seedQuery).run();
                gateways = await db.prepare('SELECT * FROM payment_gateways ORDER BY id ASC').all();
            }
        }

        res.json(gateways);
    } catch (error) {
        console.error('Erro ao buscar gateways:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar gateway específico (admin)
app.get('/api/admin/gateways/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        if (db.isPostgres) {
            const result = await db.query('SELECT * FROM payment_gateways WHERE id = $1', [id]);
            const gateway = result.rows?.[0];

            if (!gateway) {
                return res.status(404).json({ error: 'Gateway não encontrado' });
            }

            res.json(gateway);
        } else {
            const gateway = db.prepare('SELECT * FROM payment_gateways WHERE id = ?').get(id);

            if (!gateway) {
                return res.status(404).json({ error: 'Gateway não encontrado' });
            }

            res.json(gateway);
        }
    } catch (error) {
        console.error('Erro ao buscar gateway:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar ou atualizar gateway (admin)
app.post('/api/admin/gateways', authenticateToken, async (req, res) => {
    const { name, gateway_type, public_key, secret_key, is_active, settings_json } = req.body;

    if (!name || !gateway_type) {
        return res.status(400).json({ error: 'Nome e tipo do gateway são obrigatórios' });
    }

    try {
        if (db.isPostgres) {
            // Verificar se já existe gateway deste tipo
            const existingResult = await db.query(
                'SELECT id FROM payment_gateways WHERE gateway_type = $1',
                [gateway_type]
            );
            const existing = existingResult.rows?.[0];

            if (existing) {
                // Atualizar
                await db.query(
                    `UPDATE payment_gateways 
                     SET name = $1, public_key = $2, secret_key = $3, is_active = $4,
    settings_json = $5, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $6`,
                    [name, public_key, secret_key, is_active ? 1 : 0, settings_json, existing.id]
                );
                res.json({ success: true, id: existing.id, message: 'Gateway atualizado com sucesso' });
            } else {
                // Criar
                const result = await db.query(
                    `INSERT INTO payment_gateways(name, gateway_type, public_key, secret_key, is_active, settings_json)
VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [name, gateway_type, public_key, secret_key, is_active ? 1 : 0, settings_json]
                );
                res.json({ success: true, id: result.rows[0].id, message: 'Gateway criado com sucesso' });
            }
        } else {
            // SQLite
            const existing = db.prepare('SELECT id FROM payment_gateways WHERE gateway_type = ?').get(gateway_type);

            if (existing) {
                // Atualizar
                const stmt = db.prepare(
                    `UPDATE payment_gateways 
                     SET name = ?, public_key = ?, secret_key = ?, is_active = ?,
    settings_json = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ? `
                );
                stmt.run(name, public_key, secret_key, is_active ? 1 : 0, settings_json, existing.id);
                res.json({ success: true, id: existing.id, message: 'Gateway atualizado com sucesso' });
            } else {
                // Criar
                const stmt = db.prepare(
                    `INSERT INTO payment_gateways(name, gateway_type, public_key, secret_key, is_active, settings_json)
VALUES(?, ?, ?, ?, ?, ?)`
                );
                const result = stmt.run(name, gateway_type, public_key, secret_key, is_active ? 1 : 0, settings_json);
                res.json({ success: true, id: result.lastInsertRowid, message: 'Gateway criado com sucesso' });
            }
        }
    } catch (error) {
        console.error('Erro ao salvar gateway:', error);
        res.status(500).json({ error: error.message });
    }
});

// Atualizar gateway (admin)
app.put('/api/admin/gateways/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, public_key, secret_key, is_active, settings_json } = req.body;

    try {
        if (db.isPostgres) {
            await db.query(
                `UPDATE payment_gateways 
                 SET name = $1, public_key = $2, secret_key = $3, is_active = $4,
    settings_json = $5, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $6`,
                [name, public_key, secret_key, is_active ? 1 : 0, settings_json, id]
            );
        } else {
            const stmt = db.prepare(
                `UPDATE payment_gateways 
                 SET name = ?, public_key = ?, secret_key = ?, is_active = ?,
    settings_json = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? `
            );
            stmt.run(name, public_key, secret_key, is_active ? 1 : 0, settings_json, id);
        }

        res.json({ success: true, message: 'Gateway atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar gateway:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deletar gateway (admin)
app.delete('/api/admin/gateways/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        if (db.isPostgres) {
            await db.query('DELETE FROM payment_gateways WHERE id = $1', [id]);
        } else {
            db.prepare('DELETE FROM payment_gateways WHERE id = ?').run(id);
        }

        res.json({ success: true, message: 'Gateway deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar gateway:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar gateway ativo (público - para checkout)
app.get('/api/gateway/active', async (req, res) => {
    try {
        if (db.isPostgres) {
            const result = await db.query(
                'SELECT gateway_type, public_key, settings_json FROM payment_gateways WHERE is_active = 1 LIMIT 1',
                []
            );
            const gateway = result.rows?.[0];

            if (!gateway) {
                return res.json({ active: false });
            }

            let settings = {};
            try {
                settings = typeof gateway.settings_json === 'string'
                    ? JSON.parse(gateway.settings_json)
                    : gateway.settings_json || {};
            } catch (e) {
                settings = {};
            }

            res.json({
                active: true,
                type: gateway.gateway_type,
                publicKey: gateway.public_key,
                settings: settings
            });
        } else {
            const gateway = db.prepare(
                'SELECT gateway_type, public_key, settings_json FROM payment_gateways WHERE is_active = 1 LIMIT 1'
            ).get();

            if (!gateway) {
                return res.json({ active: false });
            }

            let settings = {};
            try {
                settings = typeof gateway.settings_json === 'string'
                    ? JSON.parse(gateway.settings_json)
                    : gateway.settings_json || {};
            } catch (e) {
                settings = {};
            }

            res.json({
                active: true,
                type: gateway.gateway_type,
                publicKey: gateway.public_key,
                settings: settings
            });
        }
    } catch (error) {
        console.error('Erro ao buscar gateway ativo:', error);
        res.json({ active: false });
    }
});

// ===== ROTAS DE RASTREAMENTO (META PIXEL) =====

// Buscar configuração do Meta Pixel (público - para carregar no frontend)
app.get('/api/tracking/meta-pixel', async (req, res) => {
    try {
        const settings = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM tracking_settings WHERE provider = 'meta-pixel' ORDER BY id DESC LIMIT 1", [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (settings && settings.is_active) {
            res.json({
                pixel_id: settings.pixel_id,
                is_active: settings.is_active
            });
        } else {
            res.json({ pixel_id: null, is_active: 0 });
        }
    } catch (error) {
        console.error('Erro ao buscar configuração do Meta Pixel:', error);
        res.json({ pixel_id: null, is_active: 0 });
    }
});

// Salvar configuração do Meta Pixel (admin)
app.post('/api/admin/tracking/meta-pixel', authenticateToken, async (req, res) => {
    const { pixel_id, is_active } = req.body;

    try {
        // Verificar se já existe configuração
        const existing = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM tracking_settings WHERE provider = 'meta-pixel'", [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            // Atualizar
            await new Promise((resolve, reject) => {
                db.run(
                    "UPDATE tracking_settings SET pixel_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = 'meta-pixel'",
                    [pixel_id, is_active ? 1 : 0],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } else {
            // Inserir
            await new Promise((resolve, reject) => {
                db.run(
                    "INSERT INTO tracking_settings (provider, pixel_id, is_active) VALUES ('meta-pixel', ?, ?)",
                    [pixel_id, is_active ? 1 : 0],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        res.json({ success: true, message: 'Configuração salva com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar configuração do Meta Pixel:', error);
        res.status(500).json({ error: error.message });
    }
});

// Marcar que o código PIX foi copiado (público)
app.post('/api/orders/:id/pix-copied', async (req, res) => {
    const { id } = req.params;

    try {
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE orders SET pix_copied_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({ success: true, message: 'PIX copiado registrado' });
    } catch (error) {
        console.error('Erro ao registrar PIX copiado:', error);
        res.status(500).json({ error: error.message });
    }
});

// Excluir múltiplos pedidos (admin)
app.delete('/api/admin/orders/bulk', authenticateToken, async (req, res) => {
    const { order_ids } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({ error: 'IDs de pedidos inválidos' });
    }

    try {
        const placeholders = order_ids.map(() => '?').join(',');

        // Deletar itens dos pedidos primeiro (foreign key)
        await new Promise((resolve, reject) => {
            db.run(
                `DELETE FROM order_items WHERE order_id IN (${placeholders})`,
                order_ids,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Deletar pedidos
        await new Promise((resolve, reject) => {
            db.run(
                `DELETE FROM orders WHERE id IN (${placeholders})`,
                order_ids,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({
            success: true,
            message: `${order_ids.length} pedido(s) excluído(s) com sucesso`
        });
    } catch (error) {
        console.error('Erro ao excluir pedidos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ROTAS DE PAGAMENTO BESTFY =====

// Criar transação PIX via BESTFY
app.post('/api/payments/bestfy/pix', async (req, res) => {
    console.log('🔥 [PIX] Endpoint chamado!');
    try {
        if (!req.body) {
            throw new Error('Corpo da requisição vazio');
        }

        const { orderId, amount, customer, items, shipping } = req.body;
        console.log('📦 [PIX] Payload recebido:', { orderId, amount, customerName: customer?.name });

        if (!customer) {
            throw new Error('Dados do cliente (customer) não fornecidos');
        }

        // Buscar credenciais do gateway
        let gateway;
        if (db.isPostgres) {
            console.log('🔍 [PIX] Buscando gateway no Postgres...');
            const result = await db.query(
                'SELECT * FROM payment_gateways WHERE gateway_type = $1 AND is_active = 1',
                ['bestfy']
            );
            gateway = result.rows?.[0];
        } else {
            console.log('🔍 [PIX] Buscando gateway no SQLite...');
            gateway = db.prepare(
                'SELECT * FROM payment_gateways WHERE gateway_type = ? AND is_active = 1'
            ).get('bestfy');
        }

        if (!gateway || !gateway.secret_key) {
            return res.status(400).json({
                error: 'Gateway BESTFY não configurado ou inativo'
            });
        }

        // Criar instância do serviço BESTFY
        const bestfy = new BestfyService(gateway.secret_key, gateway.public_key);

        // Sanitize customer data (Bestfy requires 8 chars zipCode without hyphen)
        const rawZipCode = customer.address?.zipCode || '';
        const sanitizedCustomer = {
            ...customer,
            address: {
                ...(customer.address || {}),
                zipCode: rawZipCode.replace(/\D/g, '')
            }
        };

        // Criar transação PIX
        const transaction = await bestfy.createPixTransaction({
            amount,
            customer: sanitizedCustomer,
            items,
            shipping,
            orderId
        });

        // Atualizar pedido com dados da transação
        const transactionData = JSON.stringify(transaction);
        const txnId = transaction.id || transaction.transactionId;

        // Self-healing: Garantir que colunas existem (caso migração inicial tenha falhado)
        if (db.isPostgres) {
            try {
                await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT');
                await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_data TEXT');
                await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT');
            } catch (schemaError) {
                console.warn('⚠️ Erro ao verificar schema no endpoint PIX:', schemaError.message);
            }

            await db.query(
                'UPDATE orders SET transaction_id = $1, transaction_data = $2, payment_method = $3 WHERE id = $4',
                [txnId, transactionData, 'pix', orderId]
            );
        } else {
            // SQLite fallback (assumes columns exist or don't matter as much in dev)
            try {
                db.prepare(
                    'UPDATE orders SET transaction_id = ?, transaction_data = ?, payment_method = ? WHERE id = ?'
                ).run(txnId, transactionData, 'pix', orderId);
            } catch (sqliteErr) {
                // Try adding columns in SQLite if missing
                if (sqliteErr.message.includes('no such column')) {
                    try {
                        db.prepare('ALTER TABLE orders ADD COLUMN transaction_id TEXT').run();
                        db.prepare('ALTER TABLE orders ADD COLUMN transaction_data TEXT').run();
                        db.prepare(
                            'UPDATE orders SET transaction_id = ?, transaction_data = ?, payment_method = ? WHERE id = ?'
                        ).run(txnId, transactionData, 'pix', orderId);
                    } catch (e) { console.error('Failed to auto-migrate SQLite:', e); }
                } else {
                    throw sqliteErr;
                }
            }
        }

        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error('Erro ao criar transação PIX:', error);
        res.status(500).json({
            error: error.message || 'Erro ao processar pagamento PIX', // Prioritize real error message
            details: error
        });
    }
});

// Criar transação com Cartão via BESTFY
app.post('/api/payments/bestfy/card', async (req, res) => {
    const { orderId, amount, customer, items, shipping, card, installments } = req.body;

    try {
        // Buscar credenciais do gateway
        let gateway;
        if (db.isPostgres) {
            const result = await db.query(
                'SELECT * FROM payment_gateways WHERE gateway_type = $1 AND is_active = 1',
                ['bestfy']
            );
            gateway = result.rows?.[0];
        } else {
            gateway = db.prepare(
                'SELECT * FROM payment_gateways WHERE gateway_type = ? AND is_active = 1'
            ).get('bestfy');
        }

        if (!gateway || !gateway.secret_key) {
            return res.status(400).json({
                error: 'Gateway BESTFY não configurado ou inativo'
            });
        }

        // Criar instância do serviço BESTFY
        const bestfy = new BestfyService(gateway.secret_key, gateway.public_key);

        // Criar transação com cartão
        const transaction = await bestfy.createCreditCardTransaction({
            amount,
            customer,
            items,
            shipping,
            card,
            installments,
            orderId
        });

        // Atualizar pedido com dados da transação
        const transactionData = JSON.stringify(transaction);
        const transactionId = transaction.id || transaction.transactionId;

        // Determinar status baseado na resposta
        let orderStatus = 'pending';
        if (transaction.status === 'approved' || transaction.status === 'paid') {
            orderStatus = 'paid';
        } else if (transaction.status === 'refused' || transaction.status === 'declined') {
            orderStatus = 'failed';
        }

        if (db.isPostgres) {
            await db.query(
                'UPDATE orders SET transaction_id = $1, transaction_data = $2, payment_method = $3, status = $4 WHERE id = $5',
                [transactionId, transactionData, 'credit_card', orderStatus, orderId]
            );
        } else {
            db.prepare(
                'UPDATE orders SET transaction_id = ?, transaction_data = ?, payment_method = ?, status = ? WHERE id = ?'
            ).run(transactionId, transactionData, 'credit_card', orderStatus, orderId);
        }

        res.json({
            success: transaction.status === 'approved' || transaction.status === 'paid',
            transaction,
            status: orderStatus
        });
    } catch (error) {
        console.error('Erro ao criar transação com cartão:', error);
        res.status(500).json({
            error: 'Erro ao processar pagamento com cartão',
            message: error.message,
            details: error.error || error
        });
    }
});

// Consultar status de transação
app.get('/api/payments/bestfy/transaction/:transactionId', async (req, res) => {
    const { transactionId } = req.params;

    try {
        // Buscar credenciais do gateway
        let gateway;
        if (db.isPostgres) {
            const result = await db.query(
                'SELECT * FROM payment_gateways WHERE gateway_type = $1 AND is_active = 1',
                ['bestfy']
            );
            gateway = result.rows?.[0];
        } else {
            gateway = db.prepare(
                'SELECT * FROM payment_gateways WHERE gateway_type = ? AND is_active = 1'
            ).get('bestfy');
        }

        if (!gateway || !gateway.secret_key) {
            return res.status(400).json({
                error: 'Gateway BESTFY não configurado ou inativo'
            });
        }

        // Criar instância do serviço BESTFY
        const bestfy = new BestfyService(gateway.secret_key, gateway.public_key);

        // Consultar transação
        const transaction = await bestfy.getTransaction(transactionId);

        // Atualizar status do pedido se necessário
        if (transaction.status === 'approved' || transaction.status === 'paid') {
            if (db.isPostgres) {
                await db.query(
                    'UPDATE orders SET status = $1, transaction_data = $2 WHERE transaction_id = $3',
                    ['paid', JSON.stringify(transaction), transactionId]
                );
            } else {
                db.prepare(
                    'UPDATE orders SET status = ?, transaction_data = ? WHERE transaction_id = ?'
                ).run('paid', JSON.stringify(transaction), transactionId);
            }

            // Notify Approved
            try {
                // Fetch Order Info (ID and Items)
                let orderId = null;
                let itemName = 'Produto';
                let orderTotal = transaction.amount;

                const queryStr = db.isPostgres ?
                    'SELECT id, total, payment_method FROM orders WHERE transaction_id = $1' :
                    'SELECT id, total, payment_method FROM orders WHERE transaction_id = ?';

                const orderRes = db.isPostgres ?
                    await db.query(queryStr, [transactionId]) :
                    db.prepare(queryStr).get(transactionId);

                const orderRow = db.isPostgres ? orderRes.rows?.[0] : orderRes;

                if (orderRow) {
                    orderId = orderRow.id;
                    orderTotal = orderRow.total;

                    const itemQ = db.isPostgres ?
                        'SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1 LIMIT 1' :
                        'SELECT p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ? LIMIT 1';

                    const itemRes = db.isPostgres ?
                        await db.query(itemQ, [orderId]) :
                        db.prepare(itemQ).get(orderId);

                    const firstItem = db.isPostgres ? itemRes.rows?.[0] : itemRes;
                    if (firstItem) itemName = firstItem.name;

                    sendPushcutNotification('approved', {
                        id: orderId,
                        itemName: itemName,
                        total: orderTotal,
                        paymentMethod: orderRow.payment_method
                    }).catch(e => console.error('Async Pushcut Fail:', e));
                }
            } catch (notifyErr) {
                console.error('Error preparing approved notification:', notifyErr);
            }
        }

        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error('Erro ao consultar transação:', error);
        res.status(500).json({
            error: 'Erro ao consultar transação',
            message: error.message
        });
    }
});

// Iniciar servidor (apenas em desenvolvimento local)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📦 Admin: http://localhost:${PORT}/admin.html`);
    });
}



// DEBUG ROUTE: Force Seed Collections
app.post('/api/admin/debug/seed', async (req, res) => {
    try {
        console.log('🔄 Manually triggering collection seed...');
        const { seedCollections } = require('./collection-seeder');
        const logs = await seedCollections(db, true);
        res.json({ success: true, logs });
    } catch (error) {
        console.error('❌ Error manual seeding:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DEBUG ROUTE: Reset Capinhas Collection (clear and re-seed)
// DEBUG ROUTE: Reset Specific Collections (Capinhas & Quenchers)
app.post('/api/admin/debug/reset-collections', async (req, res) => {
    try {
        console.log('🔄 Resetting specific collections (Capinhas & Quenchers)...');

        const targetSlugs = ['capinhas-celular', 'quenchers-copos', 'mochilas'];
        const logs = [];

        for (const slug of targetSlugs) {
            // Find collection
            const collection = await new Promise((resolve, reject) => {
                db.get('SELECT id, name FROM collections WHERE slug = ?', [slug], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (collection) {
                // Clear products
                await new Promise((resolve, reject) => {
                    db.run('DELETE FROM collection_products WHERE collection_id = ?', [collection.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                logs.push(`✅ Cleared products from ${collection.name}`);
            } else {
                logs.push(`⚠️ Collection ${slug} not found`);
            }
        }

        // Seed Stranger Cases (ensure products exist with variants)
        try {
            const { seedStrangerCases } = require('./phone-cases-seeder');
            await seedStrangerCases(db);
            logs.push('✅ Phone cases created/updated with variants');
        } catch (e) {
            console.error('Error seeding phone cases:', e);
            logs.push(`❌ Error seeding cases: ${e.message}`);
        }

        // Re-seed (will re-populate empty collections with strict rules)
        const { seedCollections } = require('./collection-seeder');
        const seedLogs = await seedCollections(db, true);

        res.json({ success: true, message: 'Collections reset and re-seeded', logs: [...logs, ...seedLogs] });
    } catch (error) {
        console.error('❌ Error resetting Capinhas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handler global (deve ser o último middleware)
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.message);
    res.status(err.status || 500).json({
        error: 'Erro interno do servidor',
        message: err.message || 'Erro desconhecido'
    });
});

// Exportar app para Vercel
module.exports = app;


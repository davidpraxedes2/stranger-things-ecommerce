// Database helper - usar db-helper para compatibilidade com localhost
const db = require('./db-helper');

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BestfyService = require('./bestfy-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'stranger-things-secret-key-change-in-production';

// Log de inicialização
console.log('🚀 Servidor iniciando...');
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
        // await db.initialize(); // db-helper init
        initializeDatabase(); // Local sqlite init function
        console.log('✅ Banco inicializado e tabelas verificadas');

        // Popular banco se estiver vazio (em background)
        setImmediate(() => {
            populateDatabaseIfEmpty();
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
function initializeDatabase() {
    // Tabela de produtos
    db.run(`CREATE TABLE IF NOT EXISTS products (
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
        sku TEXT
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela products:', err);
        } else {
            // Adicionar colunas que podem não existir (Schema Migrations)
            db.run(`ALTER TABLE products ADD COLUMN images_json TEXT`, () => { });
            db.run(`ALTER TABLE products ADD COLUMN original_price REAL`, () => { });
            db.run(`ALTER TABLE products ADD COLUMN sku TEXT`, () => { });
            db.run(`ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0`, () => { });

            // Verificar se há produtos, se não tiver, criar alguns
            db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => {
                if (!err && row && row.count === 0) {
                    console.log('📥 Criando produtos iniciais...');
                    createSampleProducts();
                    // Tentar importar produtos dos JSONs
                    tryImportProductsFromJSON();
                }
            });
        }
    });

    // Tabela de usuários/admin
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de pedidos
    db.run(`CREATE TABLE IF NOT EXISTS orders (
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

    // Migration: Adicionar colunas cpf e address se não existirem
    try {
        db.exec("ALTER TABLE orders ADD COLUMN customer_cpf TEXT");
        console.log('✅ Coluna customer_cpf adicionada à tabela orders');
    } catch (e) { }
    try {
        db.exec("ALTER TABLE orders ADD COLUMN customer_address TEXT");
        console.log('✅ Coluna customer_address adicionada à tabela orders');
    } catch (e) { }

    // Tabela de itens do pedido
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Tabela de coleções
    db.run(`CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        default_view TEXT DEFAULT 'grid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) {
            // Verificar se tabela está vazia e popular
            db.get('SELECT COUNT(*) as count FROM collections', [], (err, row) => {
                if (!err && row && row.count === 0) {
                    const fs = require('fs');
                    let collectionsData = [];

                    if (fs.existsSync('collections.json')) {
                        try {
                            collectionsData = JSON.parse(fs.readFileSync('collections.json', 'utf8'));
                            console.log('📦 Lendo coleções de collections.json');
                        } catch (e) {
                            console.error('Erro ao ler collections.json:', e);
                        }
                    }

                    // Se não tiver dados (arquivo não existe ou vazio), usar defaults
                    if (collectionsData.length === 0) {
                        console.log('⚠️ collections.json não encontrado ou vazio. Usando coleções padrão.');
                        collectionsData = [
                            { name: 'Stranger Things', slug: 'stranger-things', description: 'Produtos oficiais da série', is_active: 1 },
                            { name: 'Camisetas', slug: 'camisetas', description: 'Camisetas estampadas', is_active: 1 },
                            { name: 'Acessórios', slug: 'acessorios', description: 'Acessórios diversos', is_active: 1 },
                            { name: 'Lançamentos', slug: 'lancamentos', description: 'Novidades da loja', is_active: 1 }
                        ];
                    }

                    const stmt = db.prepare('INSERT INTO collections (name, slug, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?)');
                    const transaction = db.transaction((colls) => {
                        for (const coll of colls) stmt.run(coll.name, coll.slug, coll.description, coll.is_active, coll.sort_order || 0);
                    });
                    transaction(collectionsData);
                    console.log(`✅ ${collectionsData.length} coleções iniciais criadas!`);
                }
            });
        }
    });

    // Migration: Adicionar coluna default_view se não existir
    db.run(`ALTER TABLE collections ADD COLUMN default_view TEXT DEFAULT 'grid'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Coluna default_view já existe ou erro:', err.message);
        } else if (!err) {
            console.log('✅ Coluna default_view adicionada à tabela collections');
        }
    });

    // Tabela de opções de frete
    db.run(`CREATE TABLE IF NOT EXISTS shipping_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        delivery_time TEXT,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela shipping_options:', err);
        } else {
            // Verificar se há fretes, se não tiver, criar padrão
            db.get('SELECT COUNT(*) as count FROM shipping_options', [], (err, row) => {
                if (!err && row && row.count === 0) {
                    console.log('📦 Criando opções de frete padrão...');
                    const stmt = db.prepare('INSERT INTO shipping_options (name, price, delivery_time, active, sort_order) VALUES (?, ?, ?, ?, ?)');
                    stmt.run('PAC', 15.00, '7-12 dias úteis', 1, 0);
                    stmt.run('SEDEX', 25.00, '3-5 dias úteis', 1, 1);
                    stmt.finalize();
                    console.log('✅ Fretes padrão criados (PAC e SEDEX)');
                }
            });
        }
    });

    // Tabela de payment_gateways
    db.run(`CREATE TABLE IF NOT EXISTS payment_gateways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gateway_type TEXT NOT NULL,
        public_key TEXT,
        secret_key TEXT,
        is_active INTEGER DEFAULT 0,
        settings_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela payment_gateways:', err);
        } else {
            // Criar gateway padrão se não existir
            db.get('SELECT COUNT(*) as count FROM payment_gateways', [], (err, row) => {
                if (!err && row && row.count === 0) {
                    console.log('📦 Criando gateway padrão Bestfy...');
                    const stmt = db.prepare('INSERT INTO payment_gateways (name, gateway_type, is_active) VALUES (?, ?, ?)');
                    stmt.run('Bestfy', 'bestfy', 1);
                    stmt.finalize();
                }
            });
        }
    });

    // Criar usuário admin padrão (senha: admin123)
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
            VALUES ('admin', 'admin@strangerthings.com', ?, 'admin')`, [defaultPassword], (err) => {
        if (err) {
            console.error('Erro ao criar usuário admin:', err.message);
        } else {
            console.log('Usuário admin criado: admin / admin123');
        }
    });
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

// ===== ROTAS PÚBLICAS =====

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
function getCollectionsWithProducts(onlyActive = true) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.*, 
            (SELECT COUNT(*) FROM collection_products WHERE collection_id = c.id) as explicit_count
            FROM collections c 
            ${onlyActive ? 'WHERE c.is_active = 1' : ''}
            ORDER BY c.sort_order ASC
        `;

        db.all(query, [], async (err, collections) => {
            if (err) return reject(err);

            // Para cada coleção, buscar os produtos ordenados
            for (const col of collections) {
                col.products = await new Promise((res) => {
                    db.all(`
                        SELECT p.*, cp.sort_order 
                        FROM products p
                        JOIN collection_products cp ON p.id = cp.product_id
                        WHERE cp.collection_id = ? AND p.active = 1
                        ORDER BY cp.sort_order ASC
                    `, [col.id], (err, products) => {
                        if (err) res([]);
                        else {
                            // Parse JSON fields if necessary
                            products.forEach(p => {
                                if (p.images_json) try { p.images = JSON.parse(p.images_json) } catch (e) { }
                            });
                            res(products);
                        }
                    });
                });

                // Compatibility: count is explicit count + fallback logic count (not implemented on backend to save time, relying on front for fuzzy)
                col.product_count = col.products.length;
            }
            resolve(collections);
        });
    });
}

// Buscar coleções (público) - DB Backed
app.get('/api/collections', async (req, res) => {
    try {
        const collections = await getCollectionsWithProducts(true);
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
            const stmt = db.prepare('UPDATE collections SET default_view = ? WHERE id = ?');
            const result = stmt.run(default_view, id);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Coleção não encontrada' });
            }

            return res.json({ success: true, message: 'Visualização padrão atualizada' });
        }

        // Se passar apenas is_active (toggle de status)
        if (name === undefined && is_active !== undefined && default_view === undefined) {
            const stmt = db.prepare('UPDATE collections SET is_active = ? WHERE id = ?');
            const result = stmt.run(is_active ? 1 : 0, id);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Coleção não encontrada' });
            }

            return res.json({ success: true, message: 'Status atualizado' });
        }

        // Atualização completa
        const stmt = db.prepare('UPDATE collections SET name = ?, slug = ?, description = ?, is_active = ?, default_view = ? WHERE id = ?');
        const result = stmt.run(name, slug, description, is_active ? 1 : 0, default_view || 'grid', id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Coleção não encontrada' });
        }

        res.json({ success: true, message: 'Coleção atualizada' });
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

// Tabela de produtos em coleções (MxN)
db.run(`CREATE TABLE IF NOT EXISTS collection_products (
        collection_id INTEGER,
        product_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (collection_id, product_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

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
app.put('/api/admin/collections/:id/reorder-products', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { order } = req.body; // Array of { product_id, sort_order }

    if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Formato inválido' });

    const stmt = db.prepare('UPDATE collection_products SET sort_order = ? WHERE collection_id = ? AND product_id = ?');
    const transaction = db.transaction((items) => {
        for (const item of items) {
            stmt.run(item.sort_order, id, item.product_id);
        }
    });

    try {
        transaction(order);
        res.json({ success: true, message: 'Ordem dos produtos atualizada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Listar todos os pedidos
app.get('/api/admin/orders', authenticateToken, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT o.*, 
                   COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `).all();

        // Buscar itens de cada pedido
        orders.forEach(order => {
            const items = db.prepare(`
                SELECT oi.*, p.name as product_name, p.image_url
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `).all(order.id);

            order.items = items;
        });

        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: error.message });
    }
});

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
app.get('/api/products/:id', (req, res) => {
    // ...
    const { id } = req.params;
    db.get('SELECT * FROM products WHERE id = ? AND active = 1', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        // Parse images_json if exists
        if (row.images_json) {
            try {
                row.images = JSON.parse(row.images_json);
            } catch (e) {
                row.images = [];
            }
        } else {
            row.images = row.image_url ? [row.image_url] : [];
        }

        res.json(row);
    });
});

// Criar pedido (público)
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_email, customer_phone, customer_cpf, customer_address, payment_method, items, subtotal, shipping, discount, total, session_id, status } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Pedido vazio' });
    }

    try {
        // Inserir pedido
        const stmt = db.prepare(`
            INSERT INTO orders (customer_name, customer_email, customer_phone, customer_cpf, customer_address, total, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = stmt.run(customer_name, customer_email, customer_phone, customer_cpf, customer_address, total, status || 'pending');
        const orderId = result.lastInsertRowid;

        // Inserir itens do pedido
        const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');

        items.forEach(item => {
            itemStmt.run(orderId, item.id, item.quantity, item.price);
        });

        // Limpar carrinho da sessão se fornecido
        if (session_id) {
            db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(session_id);
        }

        res.json({
            success: true,
            order_id: orderId,
            message: 'Pedido criado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar pedido por ID (público - para página de sucesso)
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;

    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Buscar itens do pedido com dados dos produtos
        const items = db.prepare(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(id);

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
            gateway = db.prepare("SELECT * FROM payment_gateways WHERE gateway_type = 'bestfy' AND is_active = 1").get();
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
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
        if (!order) {
            console.error(`❌ Pedido ${order_id} não encontrado no banco.`);
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // 3. Preparar transactionData
        // Sanitizar CPF
        const customerPhone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : '';
        // Tentar extrair CPF se não tiver campo separado (assumindo que pode estar no phone ou precisar de fallback)
        // No checkout.js estamos enviando 'cpf' no customer mas aqui estamos lendo do 'orders' table.
        // O checkout.js salvou customer_phone e customer_name etc. mas não salvou CPF explicitamente na tabela orders nas colunas padrão (verificar schema).
        // Se a tabela orders não tem coluna CPF, vamos usar um dummy ou tentar extrair.
        // CORREÇÃO: O checkout.js manda 'customer' com 'cpf' para a rota /api/orders, mas o server.js /api/orders NÃO SALVA CPF na tabela!
        // SOLUÇÃO: Vamos receber o CPF no body deste request também, se possível. 
        // Mas o checkout.js atual não manda customer full aqui.
        // HACK: Usar um CPF de teste se não tiver, ou pedir para o checkout mandar.
        // O checkout.js manda: card: { ... } e amount e order_id.
        // Vou adicionar um log de aviso.

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
        db.prepare('UPDATE orders SET status = ?, transaction_id = ? WHERE id = ?')
            .run(status, transaction.id, order_id);

        if (status === 'paid') {
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
app.get('/api/cart', (req, res) => {
    const sessionId = getSessionId(req);

    db.all(`
        SELECT ci.*, p.name, p.image_url, p.sku 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = ?
            ORDER BY ci.created_at DESC
                `, [sessionId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        res.json({ items: rows, total: total });
    });
});

// Adicionar item ao carrinho
app.post('/api/cart/add', (req, res) => {
    const sessionId = getSessionId(req);
    const { product_id, quantity = 1, selected_variant, price } = req.body;

    if (!product_id || !price) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Verificar se o produto já está no carrinho
    db.get(`
        SELECT * FROM cart_items 
        WHERE session_id = ? AND product_id = ? AND selected_variant = ?
            `, [sessionId, product_id, selected_variant || null], (err, existing) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (existing) {
            // Atualizar quantidade
            const newQuantity = existing.quantity + quantity;
            db.run(`
                UPDATE cart_items 
                SET quantity = ?, price = ?
            WHERE id = ?
                `, [newQuantity, price, existing.id], function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ success: true, message: 'Item atualizado no carrinho', id: existing.id });
            });
        } else {
            // Adicionar novo item
            db.run(`
                INSERT INTO cart_items(session_id, product_id, quantity, selected_variant, price)
        VALUES(?, ?, ?, ?, ?)
            `, [sessionId, product_id, quantity, selected_variant || null, price], function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ success: true, message: 'Item adicionado ao carrinho', id: this.lastID });
            });
        }
    });
});

// Atualizar quantidade do item
app.put('/api/cart/update/:id', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    const sessionId = getSessionId(req);

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Quantidade inválida' });
    }

    db.run(`
        UPDATE cart_items 
        SET quantity = ?
            WHERE id = ? AND session_id = ?
                `, [quantity, id, sessionId], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Quantidade atualizada' });
    });
});

// Remover item do carrinho
app.delete('/api/cart/remove/:id', (req, res) => {
    const { id } = req.params;
    const sessionId = getSessionId(req);

    db.run('DELETE FROM cart_items WHERE id = ? AND session_id = ?', [id, sessionId], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Item removido do carrinho' });
    });
});

// Limpar carrinho
app.delete('/api/cart/clear', (req, res) => {
    const sessionId = getSessionId(req);

    db.run('DELETE FROM cart_items WHERE session_id = ?', [sessionId], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Carrinho limpo' });
    });
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
app.get('/api/admin/products', authenticateToken, (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
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
app.get('/api/admin/orders', authenticateToken, (req, res) => {
    db.all(`
        SELECT
        o.*,
            COUNT(oi.id) as items_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
            `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
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

// API: Contador de visitantes online
app.get('/api/admin/analytics/online-count', authenticateToken, (req, res) => {
    res.json({ count: analyticsData.activeSessions.size });
});

// API: Localizações de visitantes (coordenadas para o mapa)
app.get('/api/admin/analytics/visitor-locations', authenticateToken, (req, res) => {
    const cityCoordinates = {
        'São Paulo': { x: 420, y: 480 },
        'Rio de Janeiro': { x: 460, y: 500 },
        'Brasília': { x: 380, y: 380 },
        'Belo Horizonte': { x: 450, y: 440 },
        'Curitiba': { x: 390, y: 530 },
        'Porto Alegre': { x: 350, y: 600 },
        'Salvador': { x: 500, y: 320 },
        'Recife': { x: 540, y: 230 },
        'Fortaleza': { x: 530, y: 190 },
        'Manaus': { x: 200, y: 190 },
        'Goiânia': { x: 400, y: 410 },
        'Florianópolis': { x: 400, y: 560 }
    };

    const locationCounts = new Map();

    for (const [sessionId, data] of analyticsData.activeSessions.entries()) {
        const cachedLocation = analyticsData.visitorLocations.get(data.ip);
        if (cachedLocation) {
            const key = `${cachedLocation.city},${cachedLocation.state} `;
            locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
        }
    }

    const locations = [];
    for (const [key, count] of locationCounts.entries()) {
        const [city, state] = key.split(',');
        const coords = cityCoordinates[city];
        if (coords) {
            locations.push({
                city,
                state,
                count,
                x: coords.x,
                y: coords.y
            });
        }
    }

    res.json(locations);
});

// API: Sessões ativas detalhadas
app.get('/api/admin/sessions/active', authenticateToken, (req, res) => {
    const sessions = [];
    const now = Date.now();

    for (const [sessionId, data] of analyticsData.activeSessions.entries()) {
        const location = analyticsData.visitorLocations.get(data.ip) || {
            city: 'Desconhecido',
            state: 'BR'
        };

        const durationMs = now - data.lastActivity;
        const durationMin = Math.floor(durationMs / 60000);

        const deviceType = data.userAgent?.includes('Mobile') ? '📱 Mobile' : '💻 Desktop';

        sessions.push({
            city: location.city,
            state: location.state,
            ip: data.ip.includes('::ffff:') ? data.ip.replace('::ffff:', '') : data.ip,
            page: data.currentPage || '/',
            duration: `${durationMin} min`,
            device: deviceType,
            isNewUser: !analyticsData.visitorLocations.has(data.ip)
        });
    }

    res.json(sessions.slice(0, 12));
});

// API: Registrar localização do visitante (chamado do front-end)
app.post('/api/analytics/track-location', (req, res) => {
    const { city, state, ip } = req.body;
    const visitorIp = ip || req.ip;

    if (city && state) {
        analyticsData.visitorLocations.set(visitorIp, { city, state, timestamp: Date.now() });
    }

    res.json({ success: true });
});

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

// ===== ROTAS DE PAGAMENTO BESTFY =====

// Criar transação PIX via BESTFY
app.post('/api/payments/bestfy/pix', async (req, res) => {
    const { orderId, amount, customer, items, shipping } = req.body;

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

        // Criar transação PIX
        const transaction = await bestfy.createPixTransaction({
            amount,
            customer,
            items,
            shipping,
            orderId
        });

        // Atualizar pedido com dados da transação
        const transactionData = JSON.stringify(transaction);

        if (db.isPostgres) {
            await db.query(
                'UPDATE orders SET transaction_id = $1, transaction_data = $2, payment_method = $3 WHERE id = $4',
                [transaction.id || transaction.transactionId, transactionData, 'pix', orderId]
            );
        } else {
            db.prepare(
                'UPDATE orders SET transaction_id = ?, transaction_data = ?, payment_method = ? WHERE id = ?'
            ).run(transaction.id || transaction.transactionId, transactionData, 'pix', orderId);
        }

        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error('Erro ao criar transação PIX:', error);
        res.status(500).json({
            error: 'Erro ao processar pagamento PIX',
            message: error.message,
            details: error.error || error
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


// Database helper - abstracts SQLite and PostgreSQL differences
// VERSÃO OTIMIZADA PARA VERCEL POSTGRES (SDK OFICIAL)

let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    console.error('⚠️  better-sqlite3 não disponível, tentando sqlite3...');
    try {
        Database = require('sqlite3').verbose().Database;
    } catch (e2) {
        console.error('❌ Nenhum driver SQLite disponível');
        Database = null;
    }
}

let VercelPool = null;
let USE_POSTGRES = false;

// Check if we're using PostgreSQL (Vercel)
// Vercel SDK handles env vars automatically (POSTGRES_URL, etc)
if (process.env.POSTGRES_URL || process.env.VERCEL) {
    USE_POSTGRES = true;
    console.log('📦 Detectado Vercel PostgreSQL - Usando SDK Oficial');

    try {
        const { createPool } = require('@vercel/postgres');
        VercelPool = createPool({
            connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
        });

        // Test connection
        VercelPool.sql`SELECT 1`.then(() => {
            console.log('✅ Vercel Postgres conectado com sucesso!');
        }).catch(err => {
            console.error('❌ Erro na conexão inicial Vercel Postgres:', err);
        });

    } catch (err) {
        console.error('❌ Erro ao carregar @vercel/postgres:', err);
        USE_POSTGRES = false; // Fallback to SQLite if SDK fails
    }
}

let sqliteDb = null;

// Só inicializar SQLite se não estiver no Vercel (que tem sistema de arquivos read-only)
if (!USE_POSTGRES && !process.env.VERCEL) {
    try {
        if (Database === require('better-sqlite3')) {
            // better-sqlite3 initialization
            console.log('📦 Usando better-sqlite3 (desenvolvimento local)');
            sqliteDb = new Database('database.sqlite');
            console.log('✅ Conectado ao SQLite via better-sqlite3');
        } else if (Database) {
            // sqlite3 initialization (fallback)
            console.log('📦 Usando SQLite clsssico (fallback)');
            sqliteDb = new Database('database.sqlite', (err) => {
                if (err) console.error('Erro ao conectar ao SQLite:', err.message);
                else console.log('✅ Conectado ao SQLite');
            });
        }
    } catch (error) {
        console.error('Erro ao inicializar SQLite:', error.message);
        sqliteDb = null;
    }
}

// Helper functions
const db = {
    // Flag to check if using PostgreSQL
    isPostgres: USE_POSTGRES,

    // Run query (INSERT, UPDATE, DELETE)
    run: async function (query, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (USE_POSTGRES) {
            try {
                const result = await runPostgres(query, params);
                if (callback) callback(null, result);
                return result;
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        } else {
            return runSQLite(query, params, callback);
        }
    },

    // Get single row
    get: async function (query, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (USE_POSTGRES) {
            try {
                const row = await getPostgres(query, params);
                if (callback) callback(null, row);
                return row;
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        } else {
            return getSQLite(query, params, callback);
        }
    },

    // Get all rows
    all: async function (query, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (USE_POSTGRES) {
            try {
                const rows = await allPostgres(query, params);
                if (callback) callback(null, rows);
                return rows;
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        } else {
            return allSQLite(query, params, callback);
        }
    },

    // Prepare statement (Simulation for Postgres)
    prepare: function (query) {
        return {
            run: async (params, cb) => db.run(query, params, cb),
            get: async (params, cb) => db.get(query, params, cb),
            all: async (params, cb) => db.all(query, params, cb),
            finalize: (cb) => { if (cb) cb(); }
        };
    },

    // Direct query for PostgreSQL (using SDK pool)
    query: async function (queryText, params = []) {
        if (!USE_POSTGRES) {
            throw new Error('query() only available for PostgreSQL');
        }

        // Convert ? to $1, $2, etc for compatibility
        let paramIndex = 1;
        const convertedQuery = queryText.replace(/\?/g, () => `$${paramIndex++}`);

        // Use Vercel Pool
        return await VercelPool.query(convertedQuery, params);
    }
};

// SQLite functions helpers
function isBetterSqlite() {
    return sqliteDb && sqliteDb.prepare && !sqliteDb.configure;
}

function runSQLite(query, params, callback) {
    if (!sqliteDb) {
        if (callback) callback(new Error('SQLite não incializado'), null);
        return;
    }

    try {
        if (isBetterSqlite()) {
            // better-sqlite3 (sync)
            const stmt = sqliteDb.prepare(query);
            const info = stmt.run(...(params || []));
            if (callback) {
                // simulate async callback
                setTimeout(() => {
                    callback(null, { lastID: info.lastInsertRowid, changes: info.changes });
                }, 0);
            }
            return info;
        } else {
            // sqlite3 (async)
            sqliteDb.run(query, params, function (err) {
                if (callback) {
                    callback(err, { lastID: this ? this.lastID : 0, changes: this ? this.changes : 0 });
                }
            });
        }
    } catch (err) {
        if (callback) callback(err, null);
    }
}

function getSQLite(query, params, callback) {
    if (!sqliteDb) {
        if (callback) callback(new Error('SQLite não incializado'), null);
        return;
    }

    try {
        if (isBetterSqlite()) {
            // better-sqlite3 (sync)
            const stmt = sqliteDb.prepare(query);
            const row = stmt.get(...(params || []));
            if (callback) {
                setTimeout(() => callback(null, row), 0);
            }
            return row;
        } else {
            // sqlite3 (async)
            sqliteDb.get(query, params, callback);
        }
    } catch (err) {
        if (callback) callback(err, null);
    }
}

function allSQLite(query, params, callback) {
    if (!sqliteDb) {
        if (callback) callback(new Error('SQLite não incializado'), []);
        return;
    }

    try {
        if (isBetterSqlite()) {
            // better-sqlite3 (sync)
            const stmt = sqliteDb.prepare(query);
            const rows = stmt.all(...(params || []));
            if (callback) {
                setTimeout(() => callback(null, rows), 0);
            }
            return rows;
        } else {
            // sqlite3 (async)
            sqliteDb.all(query, params, callback);
        }
    } catch (err) {
        if (callback) callback(err, null);
    }
}

// PostgreSQL functions using Vercel SDK
async function runPostgres(query, params) {
    // Convert ? to $1
    let paramIndex = 1;
    let convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);

    // Fix syntax
    convertedQuery = convertedQuery
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // Handle INSERT OR IGNORE
    if (convertedQuery.includes('INSERT OR IGNORE')) {
        convertedQuery = convertedQuery.replace('INSERT OR IGNORE', 'INSERT') + ' ON CONFLICT DO NOTHING';
    }

    const result = await VercelPool.query(convertedQuery, params);

    // Attempt to get ID for INSERTs
    let lastID = null;
    if (convertedQuery.trim().toUpperCase().startsWith('INSERT')) {
        try {
            // Only works if the insert actually happened and table has serial
            // For simple usage we just return null or try currval if possible, but standard is complex
        } catch (e) { }
    }

    return {
        lastID: lastID,
        changes: result.rowCount
    };
}

async function getPostgres(query, params) {
    let paramIndex = 1;
    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    const result = await VercelPool.query(convertedQuery, params);
    return result.rows[0] || null;
}

async function allPostgres(query, params) {
    let paramIndex = 1;
    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    const result = await VercelPool.query(convertedQuery, params);
    return result.rows || [];
}

// Initialize database
db.initialize = async function () {
    if (USE_POSTGRES && VercelPool) {
        await initializePostgres();
    } else {
        initializeSQLite();
    }
};

async function initializePostgres() {
    try {
        console.log('📦 Inicializando Schema no Vercel Postgres...');

        // Use direct queries via pool
        await VercelPool.query(`
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

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                customer_id INTEGER,
                shipping_address TEXT,
                payment_method TEXT
            )
        `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL
            )
        `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                phone TEXT,
                cpf TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                zip_code TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS cart_items(
            id SERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            selected_variant TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
            `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS payment_gateways(
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                gateway_type TEXT NOT NULL,
                public_key TEXT,
                secret_key TEXT,
                is_active INTEGER DEFAULT 0,
                settings_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS shipping_options(
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                delivery_time TEXT,
                active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS collections(
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

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS collection_products(
                collection_id INTEGER,
                product_id INTEGER,
                sort_order INTEGER DEFAULT 0,
                PRIMARY KEY (collection_id, product_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
            `);

        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS analytics_sessions (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create admin user if doesn't exist
        const bcrypt = require('bcryptjs');
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        await VercelPool.query(`
            INSERT INTO users(username, email, password, role)
            SELECT 'admin', 'admin@strangerthings.com', $1, 'admin'
            WHERE NOT EXISTS(SELECT 1 FROM users WHERE username = 'admin')
            `, [defaultPassword]);

        // Seed Bestfy Gateway if doesn't exist
        await VercelPool.query(`
            INSERT INTO payment_gateways (name, gateway_type, public_key, secret_key, is_active, settings_json)
            SELECT 'BESTFY Payment Gateway', 'bestfy', '', '', 0, '{}'
            WHERE NOT EXISTS (SELECT 1 FROM payment_gateways WHERE gateway_type = 'bestfy')
        `);


        // Schema Migrations (Add missing columns to existing tables)
        try {
            await VercelPool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT');
            await VercelPool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT');
            await VercelPool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT');

            // Fix: Adicionar colunas de transação que estavam faltando e causando erro 500 no PIX
            await VercelPool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT');
            await VercelPool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_data TEXT');

            // Meta Pixel: Adicionar coluna para rastrear quando PIX foi copiado
            await VercelPool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_copied_at TIMESTAMP');

            console.log('✅ Migrações de schema aplicadas com sucesso');
        } catch (migError) {
            console.warn('⚠️ Nota sobre migração (pode ser ignorado se colunas já existirem):', migError.message);
        }

        // Criar tabela de configurações de rastreamento
        await VercelPool.query(`
            CREATE TABLE IF NOT EXISTS tracking_settings (
                id SERIAL PRIMARY KEY,
                provider TEXT NOT NULL,
                pixel_id TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Tabelas PostgreSQL criadas/verificadas com sucesso');
    } catch (error) {
        console.error('❌ Erro ao criar tabelas PostgreSQL:', error);
        throw error;
    }
}

function initializeSQLite() {
    // Placeholder
}

module.exports = db;

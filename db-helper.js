// Database helper - abstracts SQLite and PostgreSQL differences
// DEBUG MODE: PG DRIVER DIRECT + NON-POOLING PRIORITY + LAZY INIT

let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    try {
        Database = require('sqlite3').verbose().Database;
    } catch (e2) {
        Database = null;
    }
}

let pgPool = null;
let USE_POSTGRES = false;

// 1. Determine Environment
const isVercel = !!process.env.VERCEL;
// Priority: Non-Pooling (Direct) > Standard (Pooled) > Prisma > Database URL
let connectionString = process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL;

// Debug Environment (No Secrets)
console.log('🔍 DB CONFIG CHECK:', {
    isVercel,
    hasConnectionString: !!connectionString,
    connectionStringSource: process.env.POSTGRES_URL_NON_POOLING ? 'NON_POOLING' : (process.env.POSTGRES_URL ? 'STANDARD' : 'FALLBACK')
});

if (isVercel || connectionString) {
    USE_POSTGRES = true;
    console.log('📦 Inicializando PostgreSQL (pg driver)...');

    try {
        const { Pool } = require('pg');

        // Configuration meant for Vercel/Neon
        const poolConfig = {
            connectionString: connectionString,
            max: 2, // Very conservative for Vercel serverless
            min: 0,
            idleTimeoutMillis: 5000,
            connectionTimeoutMillis: 10000,
            allowExitOnIdle: true
        };

        // SSL Logic: If not localhost, FORCE SSL with rejectUnauthorized: false
        // This is safe and standard for Neon/Vercel Postgres
        const isLocal = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));
        if (!isLocal) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }

        pgPool = new Pool(poolConfig);

        // Error Handler to prevent crash
        pgPool.on('error', (err) => {
            console.error('❌ PG Pool Error:', err.message);
        });

    } catch (err) {
        console.error('❌ Erro crítico inicializando PG:', err);
        USE_POSTGRES = false; // Fallback? Not if Vercel...
    }
}

let sqliteDb = null;

if (!USE_POSTGRES && !isVercel) {
    console.log('📦 Inicializando SQLite (Local Mode)');
    if (Database) {
        try {
            if (Database.prototype && Database.prototype.prepare) {
                sqliteDb = new Database('database.sqlite');
            } else {
                sqliteDb = new Database('database.sqlite', (err) => {
                    if (err) console.error(err);
                });
            }
        } catch (e) { console.error('SQLite Init Fail:', e); }
    }
}

// --- LAZY INITIALIZATION & MIGRATION SYSTEM ---
let _initPromise = null;
let _schemaVerified = false;

async function performSchemaMigration() {
    if (!pgPool) return;

    console.log('🔄 Verificando e Migrando Schema Postgres...');
    const client = await pgPool.connect();
    try {
        // Core Tables
        const baseTables = [
            `CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, price REAL NOT NULL, category TEXT, image_url TEXT, stock INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, images_json TEXT, original_price REAL, sku TEXT)`,
            `CREATE TABLE IF NOT EXISTS analytics_sessions (session_id TEXT PRIMARY KEY, ip TEXT, city TEXT, region TEXT, country TEXT, lat REAL, lon REAL, current_page TEXT, page_title TEXT, last_action TEXT, device TEXT, browser TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, customer_name TEXT, customer_email TEXT, customer_phone TEXT, total REAL NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, customer_id INTEGER, shipping_address TEXT, payment_method TEXT, customer_cpf TEXT, customer_address TEXT, transaction_id TEXT, transaction_data TEXT, pix_copied_at TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL)`,
            `CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT, phone TEXT, cpf TEXT, address TEXT, city TEXT, state TEXT, zip_code TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS cart_items (id SERIAL PRIMARY KEY, session_id TEXT NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL, selected_variant TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS payment_gateways (id SERIAL PRIMARY KEY, name TEXT NOT NULL, gateway_type TEXT NOT NULL, public_key TEXT, secret_key TEXT, is_active INTEGER DEFAULT 0, settings_json TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS shipping_options (id SERIAL PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, delivery_time TEXT, active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS collections (id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, default_view TEXT DEFAULT 'grid', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS collection_products (collection_id INTEGER, product_id INTEGER, sort_order INTEGER DEFAULT 0, PRIMARY KEY (collection_id, product_id))`,
            `CREATE TABLE IF NOT EXISTS tracking_settings (id SERIAL PRIMARY KEY, provider TEXT NOT NULL, pixel_id TEXT, is_active INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
        ];

        for (const t of baseTables) {
            await client.query(t);
        }

        // CRITICAL: Explicit Column Migrations (Idempotent)
        const migrations = [
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS browser TEXT',
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS device TEXT',
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS utm_source TEXT',
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS utm_medium TEXT',
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS utm_campaign TEXT',
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS page_title TEXT',
            'ALTER TABLE analytics_sessions ADD COLUMN IF NOT EXISTS last_action TEXT'
        ];

        for (const m of migrations) {
            try { await client.query(m); } catch (e) { /* ignore duplicate column errors */ }
        }

        console.log('✅ Schema Verificado e Atualizado');
    } catch (e) {
        console.error('❌ Falha na migração de schema:', e.message);
    } finally {
        client.release();
    }
}

async function ensureSchema() {
    if (!USE_POSTGRES) return;
    if (_schemaVerified) return; // Fast exit (HOT PATH)

    if (!_initPromise) {
        _initPromise = (async () => {
            try {
                await performSchemaMigration();
                _schemaVerified = true;
            } catch (e) {
                console.error('⚠️ Schema Check Failed (Will Retry):', e.message);
                _initPromise = null; // Reset so next req tries again
                throw e;
            }
        })();
    }
    try {
        await _initPromise;
    } catch (e) {
        // Allow request to proceed (maybe DB is fine, just migration check failed)
        // or rethrow if strictly required. 
        // For robustness, let's rethrow but we know next one will retry.
        throw e;
    }
}

// Helper functions
const db = {
    isPostgres: USE_POSTGRES,

    // Explicit init (can be called by server.js, but ensures idempotent)
    initialize: async function () {
        await ensureSchema();
    },

    run: async function (query, params = [], callback) {
        if (typeof params === 'function') { callback = params; params = []; }

        if (USE_POSTGRES) {
            await ensureSchema(); // Lazy Init Check
            try {
                // Ensure pool
                if (!pgPool) throw new Error('PG Pool not initialized');

                const client = await pgPool.connect();
                try {
                    // Safe Parameter Substitution for PG ( ? -> $1 )
                    let paramIndex = 1;
                    let convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);

                    // Cleanup Syntax (SQLite -> PG)
                    convertedQuery = convertedQuery
                        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
                        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

                    if (convertedQuery.includes('INSERT OR IGNORE')) {
                        convertedQuery = convertedQuery.replace('INSERT OR IGNORE', 'INSERT') + ' ON CONFLICT DO NOTHING';
                    }

                    const result = await client.query(convertedQuery, params);

                    if (callback) callback(null, { lastID: 0, changes: result.rowCount });
                    return { lastID: 0, changes: result.rowCount };

                } finally {
                    client.release();
                }
            } catch (err) {
                console.error('PG Run Error:', err.message);
                if (callback) callback(err);
                else throw err;
            }
        } else {
            return runSQLite(query, params, callback);
        }
    },

    get: async function (query, params = [], callback) {
        if (typeof params === 'function') { callback = params; params = []; }

        if (USE_POSTGRES) {
            await ensureSchema(); // Lazy Init Check
            try {
                if (!pgPool) throw new Error('PG Pool not initialized');
                const client = await pgPool.connect();
                try {
                    let paramIndex = 1;
                    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
                    const result = await client.query(convertedQuery, params);

                    if (callback) callback(null, result.rows[0]);
                    return result.rows[0];
                } finally {
                    client.release();
                }
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        } else {
            return getSQLite(query, params, callback);
        }
    },

    all: async function (query, params = [], callback) {
        if (typeof params === 'function') { callback = params; params = []; }

        if (USE_POSTGRES) {
            await ensureSchema(); // Lazy Init Check
            try {
                if (!pgPool) throw new Error('PG Pool not initialized');
                const client = await pgPool.connect();
                try {
                    let paramIndex = 1;
                    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
                    const result = await client.query(convertedQuery, params);

                    if (callback) callback(null, result.rows);
                    return result.rows;
                } finally {
                    client.release();
                }
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        } else {
            return allSQLite(query, params, callback);
        }
    },

    // Query Direct (Promises)
    query: async function (queryText, params = []) {
        if (!USE_POSTGRES) throw new Error('query() only for Postgres');
        await ensureSchema(); // Lazy Init Check
        if (!pgPool) throw new Error('PG Pool not initialized');

        const client = await pgPool.connect();
        try {
            // Check if we need to convert params (legacy support)
            // But assume callers to .query() usually pass $1 syntax if they know its PG
            // However, your code mixes them. Let's be safe: matches ? and replaces
            let paramIndex = 1;
            const convertedQuery = queryText.replace(/\?/g, () => `$${paramIndex++}`);

            return await client.query(convertedQuery, params);
        } finally {
            client.release();
        }
    },

    prepare: function (query) {
        return {
            run: async (p, cb) => db.run(query, p, cb),
            get: async (p, cb) => db.get(query, p, cb),
            all: async (p, cb) => db.all(query, p, cb),
            finalize: (cb) => { if (cb) cb() }
        }
    },
};

// SQLite Helpers (Keep simplified)
function runSQLite(query, params, callback) {
    if (!sqliteDb) { if (callback) callback(new Error('No SQLite')); return; }
    try {
        if (sqliteDb.prepare && !sqliteDb.configure) {
            const info = sqliteDb.prepare(query).run(...(params || []));
            if (callback) setTimeout(() => callback(null, { lastID: info.lastInsertRowid, changes: info.changes }), 0);
            return info;
        } else {
            sqliteDb.run(query, params, function (err) {
                if (callback) callback(err, { lastID: this?.lastID, changes: this?.changes });
            });
        }
    } catch (e) { if (callback) callback(e); }
}

function getSQLite(query, params, callback) {
    if (!sqliteDb) { if (callback) callback(new Error('No SQLite')); return; }
    try {
        if (sqliteDb.prepare && !sqliteDb.configure) {
            const row = sqliteDb.prepare(query).get(...(params || []));
            if (callback) setTimeout(() => callback(null, row), 0);
            return row;
        } else {
            sqliteDb.get(query, params, callback);
        }
    } catch (e) { if (callback) callback(e); }
}

function allSQLite(query, params, callback) {
    if (!sqliteDb) { if (callback) callback(new Error('No SQLite')); return; }
    try {
        if (sqliteDb.prepare && !sqliteDb.configure) {
            const rows = sqliteDb.prepare(query).all(...(params || []));
            if (callback) setTimeout(() => callback(null, rows), 0);
            return rows;
        } else {
            sqliteDb.all(query, params, callback);
        }
    } catch (e) { if (callback) callback(e); }
}

module.exports = db;

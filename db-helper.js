// Database helper - abstracts SQLite and PostgreSQL differences
// VERSÃO CORRIGIDA - Pool de Conexões para PostgreSQL

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

let pgPool = null;
let USE_POSTGRES = false;

// Check if we're using PostgreSQL (Vercel)
const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

if (connectionString) {
    USE_POSTGRES = true;
    console.log('📦 Detectado PostgreSQL - modo produção (Vercel)');

    const { Pool } = require('pg');
    pgPool = new Pool({
        connectionString,
        max: 10, // Limit max connections to prevent exhaustion (Neon/Vercel limit is usually 10-20)
        idleTimeoutMillis: 2000, // Aggressively close idle connections (was 30s)
        connectionTimeoutMillis: 2000, // Fail fast if DB is unreachable
    });

    pgPool.on('error', (err, client) => {
        console.error('❌ Unexpected error on idle client', err);
    });
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
    run: function (query, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (USE_POSTGRES) {
            if (!callback) {
                return new Promise((resolve, reject) => {
                    runPostgres(query, params, (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
                });
            }
            return runPostgres(query, params, callback);
        } else {
            return runSQLite(query, params, callback);
        }
    },

    // Get single row
    get: function (query, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (USE_POSTGRES) {
            if (!callback) {
                return new Promise((resolve, reject) => {
                    getPostgres(query, params, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
            }
            return getPostgres(query, params, callback);
        } else {
            return getSQLite(query, params, callback);
        }
    },

    // Get all rows
    all: function (query, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (USE_POSTGRES) {
            if (!callback) {
                return new Promise((resolve, reject) => {
                    allPostgres(query, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
            }
            return allPostgres(query, params, callback);
        } else {
            return allSQLite(query, params, callback);
        }
    },

    // Prepare statement
    prepare: function (query) {
        if (USE_POSTGRES) {
            return preparePostgres(query);
        } else {
            return sqliteDb.prepare(query);
        }
    },

    // Direct query for PostgreSQL (for migrations)
    query: async function (queryText, params = []) {
        if (!USE_POSTGRES) {
            throw new Error('query() only available for PostgreSQL');
        }
        // Use pool directly
        return await pgPool.query(queryText, params);
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
        } else {
            // sqlite3 (async)
            sqliteDb.all(query, params, callback);
        }
    } catch (err) {
        if (callback) callback(err, null);
    }
}

// PostgreSQL functions using POOL
function runPostgres(query, params, callback) {
    (async () => {
        let client = null;
        try {
            // Convert ? to $1, $2, etc
            let paramIndex = 1;
            let convertedQuery = query.replace(/\?/g, () => {
                const idx = paramIndex++;
                return `$${idx}`;
            });

            // Fix syntax differences
            convertedQuery = convertedQuery
                .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
                .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

            // Handle INSERT OR IGNORE
            if (query.includes('INSERT OR IGNORE')) {
                const match = query.match(/INSERT OR IGNORE INTO (\w+)/);
                if (match) {
                    convertedQuery = convertedQuery.replace(/INSERT OR IGNORE/, 'INSERT') +
                        ` ON CONFLICT DO NOTHING`;
                }
            }

            // Get client from pool
            client = await pgPool.connect();

            const result = await client.query(convertedQuery, params);

            // Get last inserted ID if it's an INSERT
            let lastID = null;
            if (convertedQuery.trim().toUpperCase().startsWith('INSERT')) {
                const idResult = await client.query('SELECT LASTVAL() as id');
                lastID = idResult.rows[0]?.id || null;
            }

            const mockResult = {
                lastID: lastID,
                changes: result.rowCount || 0
            };

            if (callback) {
                callback(null, mockResult);
            }
        } catch (error) {
            console.error('PG Run Error:', error);
            if (callback) {
                callback(error);
            }
        } finally {
            if (client) client.release();
        }
    })();
}

function getPostgres(query, params, callback) {
    (async () => {
        let client = null;
        try {
            let paramIndex = 1;
            const convertedQuery = query.replace(/\?/g, () => {
                const idx = paramIndex++;
                return `$${idx}`;
            }).replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
                .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

            client = await pgPool.connect();
            const result = await client.query(convertedQuery, params);

            const row = result.rows && result.rows[0] ? result.rows[0] : null;

            if (callback) {
                callback(null, row);
            }
        } catch (error) {
            console.error('PG Get Error:', error);
            if (callback) {
                callback(error, null);
            }
        } finally {
            if (client) client.release();
        }
    })();
}

function allPostgres(query, params, callback) {
    (async () => {
        let client = null;
        try {
            let paramIndex = 1;
            const convertedQuery = query.replace(/\?/g, () => {
                const idx = paramIndex++;
                return `$${idx}`;
            }).replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
                .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

            client = await pgPool.connect();
            const result = await client.query(convertedQuery, params);

            if (callback) {
                callback(null, result.rows || []);
            }
        } catch (error) {
            console.error('PG All Error:', error);
            if (callback) {
                callback(error, []);
            }
        } finally {
            if (client) client.release();
        }
    })();
}

function preparePostgres(query) {
    return {
        run: async function (params = [], callback) {
            try {
                let paramIndex = 1;
                const convertedQuery = query.replace(/\?/g, () => {
                    const idx = paramIndex++;
                    return `$${idx}`;
                }).replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
                    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

                const { Client } = require('pg');
                const client = new Client({
                    connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
                });

                await client.connect();
                await client.query(convertedQuery, params);
                await client.end();

                if (callback) callback(null);
            } catch (error) {
                if (callback) callback(error);
                else throw error;
            }
        },
        all: async function (params = [], callback) {
            // Se params for callback (overload)
            if (typeof params === 'function') {
                callback = params;
                params = [];
            } else if (!Array.isArray(params) && params !== undefined) {
                // better-sqlite3 aceita varargs: .all(1, 2)
                // mas aqui vamos simplificar assumindo array ou nada
                params = [params];
            }

            try {
                // Reutilizar lógica de allPostgres
                if (!callback) {
                    return new Promise((resolve, reject) => {
                        allPostgres(query, params, (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        });
                    });
                }
                return allPostgres(query, params, callback);
            } catch (error) {
                if (callback) callback(error);
                else throw error;
            }
        },
        get: async function (params = [], callback) {
            // Se params for callback (overload)
            if (typeof params === 'function') {
                callback = params;
                params = [];
            } else if (!Array.isArray(params) && params !== undefined) {
                params = [params];
            }

            try {
                // Reutilizar lógica de getPostgres
                if (!callback) {
                    return new Promise((resolve, reject) => {
                        getPostgres(query, params, (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                }
                return getPostgres(query, params, callback);
            } catch (error) {
                if (callback) callback(error);
                else throw error;
            }
        },
        finalize: function (callback) {
            if (callback) callback();
        }
    };
}

// Direct query for migrations (returns promise)
async function queryPostgres(query, params = []) {
    const { Client } = require('pg');
    const client = new Client({
        connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
    });

    await client.connect();
    const result = await client.query(query, params);
    await client.end();

    return result;
}

// Initialize database
db.initialize = async function () {
    if (USE_POSTGRES && pgPool) {
        await initializePostgres();
    } else {
        initializeSQLite();
    }
};

async function initializePostgres() {
    let client = null;
    try {
        // Use the existing pool instead of creating a new Client
        client = await pgPool.connect();
        console.log('✅ Conectado ao PostgreSQL');

        // Create tables
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

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
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

        await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL
            )
        `);

        await client.query(`
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

        await client.query(`
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

        await client.query(`
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

        await client.query(`
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

        await client.query(`
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

        await client.query(`
            CREATE TABLE IF NOT EXISTS collection_products(
                collection_id INTEGER,
                product_id INTEGER,
                sort_order INTEGER DEFAULT 0,
                PRIMARY KEY (collection_id, product_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
            `);

        // Create admin user if doesn't exist
        const bcrypt = require('bcryptjs');
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        await client.query(`
            INSERT INTO users(username, email, password, role)
            SELECT 'admin', 'admin@strangerthings.com', $1, 'admin'
            WHERE NOT EXISTS(SELECT 1 FROM users WHERE username = 'admin')
            `, [defaultPassword]);

        // Seed Bestfy Gateway if doesn't exist
        await client.query(`
            INSERT INTO payment_gateways (name, gateway_type, public_key, secret_key, is_active, settings_json)
            SELECT 'BESTFY Payment Gateway', 'bestfy', '', '', 0, '{}'
            WHERE NOT EXISTS (SELECT 1 FROM payment_gateways WHERE gateway_type = 'bestfy')
        `);


        // Schema Migrations (Add missing columns to existing tables)
        try {
            await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT');
            await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT');
            await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT');

            // Fix: Adicionar colunas de transação que estavam faltando e causando erro 500 no PIX
            await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT');
            await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_data TEXT');

            // Meta Pixel: Adicionar coluna para rastrear quando PIX foi copiado
            await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_copied_at TIMESTAMP');

            console.log('✅ Migrações de schema aplicadas com sucesso');
        } catch (migError) {
            console.warn('⚠️ Nota sobre migração (pode ser ignorado se colunas já existirem):', migError.message);
        }

        // Criar tabela de configurações de rastreamento
        await client.query(`
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
    } finally {
        if (client) client.release();
    }
}

function initializeSQLite() {
    // SQLite initialization happens in server.js initializeDatabase()
    // This function is a placeholder for consistency
}

module.exports = db;

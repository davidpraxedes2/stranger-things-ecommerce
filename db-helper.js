// Database helper - abstracts SQLite and PostgreSQL differences
const sqlite3 = require('sqlite3').verbose();
let pgClient = null;
let USE_POSTGRES = false;

// Check if we're using PostgreSQL (Vercel)
if (process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL) {
    USE_POSTGRES = true;
    try {
        const { sql } = require('@vercel/postgres');
        pgClient = sql;
        console.log('📦 Usando PostgreSQL (Vercel Postgres)');
    } catch (error) {
        console.log('⚠️  @vercel/postgres não disponível, usando SQLite');
        USE_POSTGRES = false;
    }
}

let sqliteDb = null;

if (!USE_POSTGRES) {
    // Use SQLite (local development)
    console.log('📦 Usando SQLite (desenvolvimento local)');
    sqliteDb = new sqlite3.Database('database.sqlite', (err) => {
        if (err) {
            console.error('Erro ao conectar ao SQLite:', err.message);
        } else {
            console.log('✅ Conectado ao SQLite');
        }
    });
}

// Helper functions
const db = {
    // Run query (INSERT, UPDATE, DELETE)
    run: function(query, params = [], callback) {
        if (USE_POSTGRES && pgClient) {
            return runPostgres(query, params, callback);
        } else {
            return runSQLite(query, params, callback);
        }
    },
    
    // Get single row
    get: function(query, params = [], callback) {
        if (USE_POSTGRES && pgClient) {
            return getPostgres(query, params, callback);
        } else {
            return getSQLite(query, params, callback);
        }
    },
    
    // Get all rows
    all: function(query, params = [], callback) {
        if (USE_POSTGRES && pgClient) {
            return allPostgres(query, params, callback);
        } else {
            return allSQLite(query, params, callback);
        }
    },
    
    // Prepare statement
    prepare: function(query) {
        if (USE_POSTGRES && pgClient) {
            return preparePostgres(query);
        } else {
            return sqliteDb.prepare(query);
        }
    }
};

// SQLite functions
function runSQLite(query, params, callback) {
    sqliteDb.run(query, params, function(err) {
        if (callback) {
            callback(err, { lastID: this.lastID, changes: this.changes });
        }
    });
}

function getSQLite(query, params, callback) {
    sqliteDb.get(query, params, callback);
}

function allSQLite(query, params, callback) {
    sqliteDb.all(query, params, callback);
}

// PostgreSQL functions
async function runPostgres(query, params, callback) {
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
        
        // Use pg directly for raw queries (since @vercel/postgres sql template doesn't support raw strings well)
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
        });
        
        await client.connect();
        const result = await client.query(convertedQuery, params);
        
        // Get last inserted ID if it's an INSERT
        let lastID = null;
        if (convertedQuery.trim().toUpperCase().startsWith('INSERT')) {
            const idResult = await client.query('SELECT LASTVAL() as id');
            lastID = idResult.rows[0]?.id || null;
        }
        
        await client.end();
        
        const mockResult = {
            lastID: lastID,
            changes: result.rowCount || 0
        };
        
        if (callback) {
            callback(null, mockResult);
        }
    } catch (error) {
        if (callback) {
            callback(error);
        } else {
            throw error;
        }
    }
}

async function getPostgres(query, params, callback) {
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
        const result = await client.query(convertedQuery, params);
        await client.end();
        
        const row = result.rows && result.rows[0] ? result.rows[0] : null;
        
        if (callback) {
            callback(null, row);
        } else {
            return row;
        }
    } catch (error) {
        if (callback) {
            callback(error, null);
        } else {
            throw error;
        }
    }
}

async function allPostgres(query, params, callback) {
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
        const result = await client.query(convertedQuery, params);
        await client.end();
        
        const rows = result.rows || [];
        
        if (callback) {
            callback(null, rows);
        } else {
            return rows;
        }
    } catch (error) {
        if (callback) {
            callback(error, null);
        } else {
            throw error;
        }
    }
}

function preparePostgres(query) {
    return {
        run: async function(params = [], callback) {
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
        finalize: function(callback) {
            if (callback) callback();
        }
    };
}

// Initialize database
db.initialize = async function() {
    if (USE_POSTGRES && pgClient) {
        await initializePostgres();
    } else {
        initializeSQLite();
    }
};

async function initializePostgres() {
    try {
        // Create tables using template literals (safer for @vercel/postgres)
        await pgClient`
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
        `;
        
        await pgClient`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pgClient`
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
        `;
        
        await pgClient`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL
            )
        `;
        
        await pgClient`
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
        `;
        
        await pgClient`
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                selected_variant TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        console.log('✅ Tabelas PostgreSQL criadas');
    } catch (error) {
        console.error('❌ Erro ao criar tabelas PostgreSQL:', error);
    }
}

function initializeSQLite() {
    // SQLite initialization happens in server.js initializeDatabase()
    // This function is a placeholder for consistency
}

module.exports = db;


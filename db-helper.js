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

// Só inicializar SQLite se não estiver no Vercel (que tem sistema de arquivos read-only)
if (!USE_POSTGRES && !process.env.VERCEL) {
    try {
        // Use SQLite (local development)
        console.log('📦 Usando SQLite (desenvolvimento local)');
        sqliteDb = new sqlite3.Database('database.sqlite', (err) => {
            if (err) {
                console.error('Erro ao conectar ao SQLite:', err.message);
            } else {
                console.log('✅ Conectado ao SQLite');
            }
        });
    } catch (error) {
        console.error('Erro ao inicializar SQLite:', error.message);
        sqliteDb = null;
    }
}

// Helper functions
const db = {
    // Run query (INSERT, UPDATE, DELETE)
    run: function(query, params = [], callback) {
        if (USE_POSTGRES) {
            return runPostgres(query, params, callback);
        } else {
            return runSQLite(query, params, callback);
        }
    },
    
    // Get single row
    get: function(query, params = [], callback) {
        if (USE_POSTGRES) {
            return getPostgres(query, params, callback);
        } else {
            return getSQLite(query, params, callback);
        }
    },
    
    // Get all rows
    all: function(query, params = [], callback) {
        if (USE_POSTGRES) {
            return allPostgres(query, params, callback);
        } else {
            return allSQLite(query, params, callback);
        }
    },
    
    // Prepare statement
    prepare: function(query) {
        if (USE_POSTGRES) {
            return preparePostgres(query);
        } else {
            return sqliteDb.prepare(query);
        }
    }
};

// SQLite functions
function runSQLite(query, params, callback) {
    if (!sqliteDb) {
        if (callback) {
            callback(new Error('SQLite não disponível no Vercel'), null);
        }
        return;
    }
    sqliteDb.run(query, params, function(err) {
        if (callback) {
            callback(err, { lastID: this.lastID, changes: this.changes });
        }
    });
}

function getSQLite(query, params, callback) {
    if (!sqliteDb) {
        if (callback) {
            callback(new Error('SQLite não disponível no Vercel'), null);
        }
        return;
    }
    sqliteDb.get(query, params, callback);
}

function allSQLite(query, params, callback) {
    if (!sqliteDb) {
        if (callback) {
            callback(new Error('SQLite não disponível no Vercel'), []);
        }
        return;
    }
    sqliteDb.all(query, params, callback);
}

// PostgreSQL functions
function runPostgres(query, params, callback) {
    (async () => {
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
            
            // Use pg directly for raw queries
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
            }
        }
    })();
}

function getPostgres(query, params, callback) {
    (async () => {
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
            }
        } catch (error) {
            if (callback) {
                callback(error, null);
            }
        }
    })();
}

function allPostgres(query, params, callback) {
    // Wrapper para tornar async function compatível com callback
    (async () => {
        let client = null;
        try {
            console.log('🔍 allPostgres chamado');
            console.log('📝 Query original:', query.substring(0, 150));
            console.log('📋 Parâmetros:', params);
            
            let paramIndex = 1;
            const convertedQuery = query.replace(/\?/g, () => {
                const idx = paramIndex++;
                return `$${idx}`;
            }).replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
              .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            
            console.log('📝 Query convertida:', convertedQuery.substring(0, 150));
            
            const { Client } = require('pg');
            const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
            
            if (!connectionString) {
                throw new Error('POSTGRES_URL não configurada. Verifique as variáveis de ambiente.');
            }
            
            console.log('🔌 Conectando ao PostgreSQL...');
            client = new Client({
                connectionString: connectionString,
                connectionTimeoutMillis: 10000
            });
            
            await client.connect();
            console.log('✅ Conectado ao PostgreSQL');
            
            console.log('📤 Executando query...');
            const result = await client.query(convertedQuery, params);
            console.log(`✅ Query executada com sucesso, ${result.rows.length} linhas retornadas`);
            
            const rows = result.rows || [];
            
            if (callback) {
                callback(null, rows);
            }
        } catch (error) {
            console.error('❌ Erro em allPostgres:', error);
            console.error('❌ Tipo:', error.constructor.name);
            console.error('❌ Mensagem:', error.message);
            console.error('❌ Stack:', error.stack);
            
            if (callback) {
                callback(error, null);
            }
        } finally {
            if (client) {
                try {
                    await client.end();
                    console.log('🔌 Conexão PostgreSQL fechada');
                } catch (closeError) {
                    console.error('⚠️ Erro ao fechar conexão:', closeError);
                }
            }
        }
    })();
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
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
        });
        
        await client.connect();
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
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                selected_variant TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create admin user if doesn't exist
        const bcrypt = require('bcryptjs');
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        await client.query(`
            INSERT INTO users (username, email, password, role)
            SELECT 'admin', 'admin@strangerthings.com', $1, 'admin'
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
        `, [defaultPassword]);
        
        await client.end();
        console.log('✅ Tabelas PostgreSQL criadas com sucesso');
    } catch (error) {
        console.error('❌ Erro ao criar tabelas PostgreSQL:', error);
        throw error;
    }
}

function initializeSQLite() {
    // SQLite initialization happens in server.js initializeDatabase()
    // This function is a placeholder for consistency
}

module.exports = db;


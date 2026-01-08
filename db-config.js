// Database configuration - PostgreSQL or SQLite
const { Pool } = require('pg');

// Check if PostgreSQL is available (production/Vercel)
const POSTGRES_URL = process.env.POSTGRES_URL || 
                     process.env.PRISMA_DATABASE_URL ||
                     process.env.DATABASE_URL;

let pool = null;
let usingSQLite = false;

if (POSTGRES_URL && !POSTGRES_URL.includes('prisma+postgres')) {
    // Use PostgreSQL
    const connectionString = POSTGRES_URL.includes('prisma+postgres') 
        ? POSTGRES_URL.split('?')[0].replace('prisma+postgres', 'postgres')
        : POSTGRES_URL;
        
    pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('✅ Using PostgreSQL database');
} else {
    // Use SQLite as fallback
    try {
        const Database = require('better-sqlite3');
        const db = new Database('ecommerce.db');
        usingSQLite = true;
        console.log('✅ Using SQLite database (local)');
        module.exports = db;
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
    }
}

// Export database interface
if (pool) {
    module.exports = {
        isPostgres: true,
        pool: pool,
        
        // Query wrapper
        query: async (text, params) => {
            const client = await pool.connect();
            try {
                const result = await client.query(text, params);
                return result;
            } finally {
                client.release();
            }
        },
        
        // Get single row
        get: async (text, params) => {
            const result = await module.exports.query(text, params);
            return result.rows[0] || null;
        },
        
        // Get all rows
        all: async (text, params) => {
            const result = await module.exports.query(text, params);
            return result.rows;
        },
        
        // Run query (INSERT, UPDATE, DELETE)
        run: async (text, params) => {
            const result = await module.exports.query(text, params);
            return {
                changes: result.rowCount,
                lastID: result.rows[0]?.id || null
            };
        },
        
        // Prepare statement (for PostgreSQL, just return the query function)
        prepare: (text) => {
            return {
                run: async (...params) => {
                    const result = await module.exports.query(text, params);
                    return {
                        changes: result.rowCount,
                        lastID: result.rows[0]?.id || null
                    };
                },
                get: async (...params) => {
                    return await module.exports.get(text, params);
                },
                all: async (...params) => {
                    return await module.exports.all(text, params);
                }
            };
        }
    };
}

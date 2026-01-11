// Script to export Vercel Postgres database
const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ No database connection string found!');
    console.log('Set POSTGRES_URL_NON_POOLING, POSTGRES_URL, or DATABASE_URL environment variable');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function exportDatabase() {
    const client = await pool.connect();

    try {
        console.log('📊 Exporting database...\n');

        // Get all tables
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        const tables = tablesResult.rows.map(r => r.tablename);
        console.log(`Found ${tables.length} tables:`, tables.join(', '));

        let sqlDump = `-- Stranger Things E-commerce Database Export
-- Generated: ${new Date().toISOString()}
-- Source: Vercel Postgres

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;

        // Export each table
        for (const table of tables) {
            console.log(`\n📦 Exporting table: ${table}`);

            // Get table schema
            const schemaResult = await client.query(`
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    column_default,
                    is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            // Create table statement
            sqlDump += `\n-- Table: ${table}\n`;
            sqlDump += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;
            sqlDump += `CREATE TABLE ${table} (\n`;

            const columns = schemaResult.rows.map((col, idx) => {
                let def = `    ${col.column_name} ${col.data_type}`;
                if (col.character_maximum_length) {
                    def += `(${col.character_maximum_length})`;
                }
                if (col.column_default) {
                    def += ` DEFAULT ${col.column_default}`;
                }
                if (col.is_nullable === 'NO') {
                    def += ' NOT NULL';
                }
                return def;
            }).join(',\n');

            sqlDump += columns + '\n);\n\n';

            // Get data
            const dataResult = await client.query(`SELECT * FROM ${table}`);
            console.log(`  → ${dataResult.rows.length} rows`);

            if (dataResult.rows.length > 0) {
                const columnNames = Object.keys(dataResult.rows[0]);

                for (const row of dataResult.rows) {
                    const values = columnNames.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return val;
                    }).join(', ');

                    sqlDump += `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${values});\n`;
                }
                sqlDump += '\n';
            }
        }

        // Save to file
        const filename = `database-export-${Date.now()}.sql`;
        fs.writeFileSync(filename, sqlDump);

        console.log(`\n✅ Database exported to: ${filename}`);
        console.log(`📊 Total size: ${(sqlDump.length / 1024).toFixed(2)} KB`);

    } catch (error) {
        console.error('❌ Export failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

exportDatabase();

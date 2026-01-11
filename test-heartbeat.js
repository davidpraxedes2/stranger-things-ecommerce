const { Pool } = require('pg');

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL || "postgresql://postgres:tPgctZgbNVfjtQwdyPxpoxvYqpLVqpnu@mainline.proxy.rlwy.net:43118/railway";

const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
});

async function testHeartbeat() {
    const client = await pool.connect();

    try {
        console.log('💓 Testando Heartbeat no banco Railway...\n');

        // Simular dados do request
        const sessionId = 'test_session_' + Date.now();
        const data = {
            page: '/test-page',
            title: 'Test Page Title',
            timestamp: new Date().toISOString()
        };

        console.log(`Dados: Session=${sessionId}`, data);

        // 1. Tentar UPDATE (como no server.js)
        const updateQuery = `
            UPDATE analytics_sessions 
            SET last_active_at = NOW(), 
                current_page = $1,
                page_title = $2,
                last_action = 'heartbeat'
            WHERE session_id = $3
        `;

        console.log(`\nExecutando UPDATE...`);
        try {
            const res = await client.query(updateQuery, [data.page, data.title || null, sessionId]);
            console.log(`Update result: ${res.rowCount} rows`);
        } catch (err) {
            console.error('❌ ERRO NO UPDATE:', err.message);
        }

        // 2. Tentar INSERT (caso update falhe/não exista)
        const insertQuery = `
            INSERT INTO analytics_sessions (session_id, current_page, page_title, last_active_at, last_action)
            VALUES ($1, $2, $3, NOW(), 'heartbeat')
        `;

        console.log(`\nExecutando INSERT...`);
        try {
            const res = await client.query(insertQuery, [sessionId, data.page, data.title || null]);
            console.log(`✅ INSERT Sucesso! Rows: ${res.rowCount}`);
        } catch (err) {
            console.error('❌ ERRO NO INSERT:', err.message);
            // Check table columns to confirm schema match
            try {
                const cols = await client.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'analytics_sessions'
                `);
                console.log('\nColunas na tabela analytics_sessions:');
                cols.rows.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));
            } catch (e) {
                console.error('Erro ao listar colunas:', e);
            }
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

testHeartbeat();

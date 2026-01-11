const { Pool } = require('pg');

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL || "postgresql://postgres:tPgctZgbNVfjtQwdyPxpoxvYqpLVqpnu@mainline.proxy.rlwy.net:43118/railway";

const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugSchema() {
    const client = await pool.connect();

    try {
        console.log('🔍 Inspecionando tabela analytics_sessions...\n');

        // Listar colunas
        const cols = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'analytics_sessions'
            ORDER BY ordinal_position
        `);

        console.log('Colunas encontradas:');
        cols.rows.forEach(c => {
            console.log(` - ${c.column_name.padEnd(15)} (${c.data_type}) [Null: ${c.is_nullable}]`);
        });

        console.log('\n📝 Testando INSERT com 15 parâmetros...');

        const upsertQ = `
            INSERT INTO analytics_sessions 
            (session_id, ip, city, region, country, lat, lon, current_page, page_title, last_action, device, browser, utm_source, utm_medium, utm_campaign, last_active_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
            ON CONFLICT (session_id) 
            DO UPDATE SET 
                current_page = EXCLUDED.current_page,
                page_title = EXCLUDED.page_title,
                last_action = EXCLUDED.last_action,
                last_active_at = NOW();
        `;

        const params = [
            'test_full_' + Date.now(), // session_id
            '127.0.0.1', // ip
            'Sao Paulo', // city
            'SP', // region
            'BR', // country
            -23.55, // lat (REAL/NUMERIC)
            -46.63, // lon
            '/debug', // page
            'Debug Page', // title
            'debug_action', // last_action
            'Desktop', // device
            'Chrome', // browser
            'google', // utm_source
            'cpc', // utm_medium
            'summer_sale' // utm_campaign
        ];

        try {
            await client.query(upsertQ, params);
            console.log('✅ INSERT SUCESSO! O problema não é no banco.');
        } catch (err) {
            console.error('❌ INSERT FALHOU:', err.message);
            // Hint at what parameter caused it?
            if (err.message.includes('column')) {
                console.log('⚠️  Parece faltar uma coluna!');
            }
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugSchema();

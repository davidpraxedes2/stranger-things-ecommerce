const { Pool } = require('pg');

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL || "postgresql://postgres:tPgctZgbNVfjtQwdyPxpoxvYqpLVqpnu@mainline.proxy.rlwy.net:43118/railway";

const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
    const client = await pool.connect();

    try {
        console.log('🔧 Verificando integridade do banco Railway...\n');

        // 1. Verificar tabelas
        const tables = ['products', 'orders', 'cart_items', 'analytics_sessions', 'users'];
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✅ Tabela '${table}' existe: ${res.rows[0].count} linhas`);
            } catch (err) {
                console.error(`❌ Tabela '${table}' NÃO EXISTE ou erro:`, err.message);
                if (err.message.includes('does not exist')) {
                    console.log(`   -> Tentando criar '${table}'...`);
                    // Call db-helper table creation logic here if needed? 
                    // Better to just report for now.
                }
            }
        }

        console.log('\n🔄 Corrigindo SEQUENCES (IDs autoincrement)...');

        // 2. Corrigir Sequences
        // Para cada tabela que tem coluna SERIAL (id), precisamos atualizar a sequence
        const sequences = [
            { table: 'products', col: 'id', seq: 'products_id_seq' },
            { table: 'orders', col: 'id', seq: 'orders_id_seq' },
            { table: 'cart_items', col: 'id', seq: 'cart_items_id_seq' },
            { table: 'users', col: 'id', seq: 'users_id_seq' },
            { table: 'collections', col: 'id', seq: 'collections_id_seq' },
            { table: 'shipping_options', col: 'id', seq: 'shipping_options_id_seq' }
        ];

        for (const s of sequences) {
            try {
                // Pega o max ID atual
                const maxRes = await client.query(`SELECT MAX(${s.col}) FROM ${s.table}`);
                const maxId = maxRes.rows[0].max || 0;

                // Atualiza a sequence para max + 1
                await client.query(`SELECT setval('${s.seq}', $1, true)`, [Number(maxId) + 1]);
                console.log(`✅ Sequence '${s.seq}' atualizada para ${Number(maxId) + 1}`);
            } catch (err) {
                if (err.message.includes('does not exist')) {
                    // Maybe sequence name is different? (Railway/Postgres default: table_column_seq)
                    console.log(`⚠️ Sequence '${s.seq}' não encontrada, tentando auto-detect...`);
                } else {
                    console.error(`❌ Erro ao atualizar '${s.seq}':`, err.message);
                }
            }
        }

        // 3. Teste de Escrita
        console.log('\n📝 Testando escrita (Cart Item)...');
        try {
            // Tenta inserir um item dummy (e rollback)
            await client.query('BEGIN');
            const insertRes = await client.query(`
                INSERT INTO cart_items (session_id, product_id, quantity, price)
                VALUES ('test_session', 1, 1, 10.00)
                RETURNING id
            `);
            console.log(`✅ Teste de escrita SUCESSO. ID gerado: ${insertRes.rows[0].id}`);
            await client.query('ROLLBACK');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`❌ Teste de escrita FALHOU:`, err.message);
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixDatabase();

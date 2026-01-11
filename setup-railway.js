// Script para criar tabelas no Railway e importar dados
const { Pool } = require('pg');
const fs = require('fs');

// URL do Railway
const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL || "postgresql://postgres:tPgctZgbNVfjtQwdyPxpoxvYqpLVqpnu@mainline.proxy.rlwy.net:43118/railway";

const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupRailwayDatabase() {
    const client = await pool.connect();

    try {
        console.log('🚂 Configurando banco Railway...\n');

        // Importar o db-helper para usar as mesmas definições de tabela
        process.env.POSTGRES_URL = RAILWAY_URL;
        process.env.VERCEL = 'true'; // Force Postgres mode

        const db = require('./db-helper.js');

        // CRITICAL: Force schema creation
        console.log('⏳ Inicializando schema no DB...');
        if (db.initialize) {
            await db.initialize();
        } else {
            // Fallback: run a dummy query to trigger lazy init
            await db.run('SELECT 1');
        }

        console.log('✅ Schema criado via db-helper.js\n');

        // Aguardar um pouco para garantir que as tabelas foram criadas
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📊 Importando dados do Vercel...\n');

        // Encontrar arquivo de export
        const files = fs.readdirSync('.').filter(f => f.startsWith('database-export-') && f.endsWith('.sql'));
        if (files.length === 0) {
            console.error('❌ Nenhum arquivo database-export-*.sql encontrado!');
            process.exit(1);
        }

        const exportFile = files.sort().reverse()[0]; // Mais recente
        console.log(`📁 Usando: ${exportFile}\n`);

        const sql = fs.readFileSync(exportFile, 'utf8');

        // Extrair INSERTs tratando comandos multilinhas (descrições longas)
        // O export-db.js usa ";\n" como separador de comandos
        const statements = sql.split(';\n');

        const insertLines = statements
            .map(s => s.trim())
            .filter(s => s.startsWith('INSERT INTO'));

        console.log(`📝 ${insertLines.length} comandos INSERT encontrados (parser corrigido)\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const insert of insertLines) {
            try {
                await client.query(insert);
                successCount++;
                if (successCount % 100 === 0) {
                    process.stdout.write(`\r✅ Importados: ${successCount}/${insertLines.length}`);
                }
            } catch (err) {
                errorCount++;
                // Ignorar erros de duplicação (já existe)
                if (!err.message.includes('duplicate key')) {
                    console.error(`\n⚠️  Erro: ${err.message.substring(0, 100)}`);
                }
            }
        }

        console.log(`\n\n✅ Importação concluída!`);
        console.log(`   Sucesso: ${successCount}`);
        console.log(`   Erros: ${errorCount}\n`);

        // Verificar dados
        console.log('📊 Verificando dados importados:\n');

        const tables = ['products', 'collections', 'orders', 'users', 'analytics_sessions'];
        for (const table of tables) {
            try {
                const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   ${table}: ${result.rows[0].count} registros`);
            } catch (err) {
                console.log(`   ${table}: Erro - ${err.message}`);
            }
        }

        console.log('\n🎉 Railway configurado com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

setupRailwayDatabase();

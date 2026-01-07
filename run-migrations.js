// Run Migrations - Admin Dashboard Setup
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔄 Executando migrations...\n');

// Ler arquivo de migrations
const migrations = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');

// Dividir por statement (simples, pode melhorar)
const statements = migrations
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

let completed = 0;
let errors = 0;

db.serialize(() => {
    statements.forEach((statement, index) => {
        db.run(statement, (err) => {
            if (err) {
                // Ignorar erros de "column already exists" e "table already exists"
                if (!err.message.includes('already exists') && 
                    !err.message.includes('duplicate column name')) {
                    console.error(`❌ Erro no statement ${index + 1}:`, err.message);
                    errors++;
                } else {
                    completed++;
                }
            } else {
                completed++;
            }
            
            // Última iteração
            if (index === statements.length - 1) {
                setTimeout(() => {
                    console.log(`\n✅ Migrations concluídas!`);
                    console.log(`   Executados: ${completed}/${statements.length}`);
                    if (errors > 0) {
                        console.log(`   Erros: ${errors}`);
                    }
                    
                    // Verificar tabelas criadas
                    db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, tables) => {
                        if (!err) {
                            console.log('\n📋 Tabelas no banco:');
                            tables.forEach(t => console.log(`   - ${t.name}`));
                        }
                        db.close();
                        process.exit(0);
                    });
                }, 500);
            }
        });
    });
});

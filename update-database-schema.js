const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar:', err);
        process.exit(1);
    }
    console.log('✅ Conectado ao banco de dados\n');
    updateSchema();
});

function updateSchema() {
    console.log('🔄 Atualizando schema do banco de dados...\n');
    
    // Adicionar campos novos na tabela products
    db.serialize(() => {
        // Adicionar coluna images_json se não existir
        db.run(`ALTER TABLE products ADD COLUMN images_json TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️  Coluna images_json:', err.message);
            } else {
                console.log('✅ Coluna images_json adicionada');
            }
        });
        
        // Adicionar coluna original_price se não existir
        db.run(`ALTER TABLE products ADD COLUMN original_price REAL`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️  Coluna original_price:', err.message);
            } else {
                console.log('✅ Coluna original_price adicionada');
            }
        });
        
        // Adicionar coluna sku se não existir
        db.run(`ALTER TABLE products ADD COLUMN sku TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️  Coluna sku:', err.message);
            } else {
                console.log('✅ Coluna sku adicionada');
            }
        });
        
        // Criar tabela de clientes
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            cpf TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zip_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('❌ Erro ao criar tabela customers:', err.message);
            } else {
                console.log('✅ Tabela customers criada/verificada');
            }
        });
        
        // Criar tabela de carrinho (sessão)
        db.run(`CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            selected_variant TEXT,
            price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`, (err) => {
            if (err) {
                console.error('❌ Erro ao criar tabela cart_items:', err.message);
            } else {
                console.log('✅ Tabela cart_items criada/verificada');
            }
        });
        
        // Adicionar campos extras na tabela orders
        db.run(`ALTER TABLE orders ADD COLUMN customer_id INTEGER`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️  Coluna customer_id:', err.message);
            } else {
                console.log('✅ Coluna customer_id adicionada');
            }
        });
        
        db.run(`ALTER TABLE orders ADD COLUMN shipping_address TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️  Coluna shipping_address:', err.message);
            } else {
                console.log('✅ Coluna shipping_address adicionada');
            }
        });
        
        db.run(`ALTER TABLE orders ADD COLUMN payment_method TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('⚠️  Coluna payment_method:', err.message);
            } else {
                console.log('✅ Coluna payment_method adicionada');
            }
        });
        
        // Finalizar
        setTimeout(() => {
            console.log('\n✅ Schema atualizado com sucesso!\n');
            db.close();
            process.exit(0);
        }, 1000);
    });
}


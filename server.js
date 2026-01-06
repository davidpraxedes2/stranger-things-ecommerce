const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db-helper');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'stranger-things-secret-key-change-in-production';

// Log de inicialização
console.log('🚀 Servidor iniciando...');
console.log('📦 Ambiente:', process.env.NODE_ENV || 'development');
console.log('🗄️  PostgreSQL:', process.env.POSTGRES_URL ? 'Sim' : 'Não (usando SQLite)');

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos de public
app.use(express.static(path.join(__dirname, 'public')));

// Servir arquivos estáticos da raiz (styles.css, script.js, logo.png, etc)
app.use(express.static(__dirname));

// Rotas explícitas para arquivos estáticos importantes (fallback para Vercel)
app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles.css'), {
        headers: { 'Content-Type': 'text/css' }
    });
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.png'), {
        headers: { 'Content-Type': 'image/png' }
    });
});

app.get('/product-page.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'product-page.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/product-cart.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'product-cart.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

app.get('/checkout.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

// Rotas para servir HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/product.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'product.html'));
});

app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.html'));
});

app.get('/order-success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'order-success.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Configurar upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'));
        }
    }
});

// Inicializar banco de dados (não bloquear requisições)
(async function initializeDB() {
    try {
        console.log('🔄 Inicializando banco de dados...');
        await db.initialize();
        console.log('✅ Banco inicializado');
        initializeDatabase();
        console.log('✅ Tabelas criadas/verificadas');
        
        // Popular banco se estiver vazio (em background, não bloqueia)
        setImmediate(() => {
            populateDatabaseIfEmpty();
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
    }
})();

// Popular banco se estiver vazio
async function populateDatabaseIfEmpty() {
    db.get('SELECT COUNT(*) as count FROM products', [], async (err, row) => {
        if (!err && row && row.count === 0) {
            console.log('📦 Banco vazio detectado. Tentando importar produtos dos arquivos JSON...');
            
            // Tentar importar produtos reais primeiro
            const imported = await tryImportProductsFromJSON();
            
            if (!imported) {
                // Se não conseguiu importar, criar produtos de exemplo
                console.log('📦 Criando produtos de exemplo...');
                await createSampleProducts();
            }
        }
    });
}

async function createSampleProducts() {
    const sampleProducts = [
        {
            name: 'Stranger Things - Camiseta Eleven',
            description: 'Camiseta oficial com estampa exclusiva da Eleven, personagem icônico de Stranger Things.',
            price: 89.90,
            category: 'stranger-things',
            stock: 10
        },
        {
            name: 'Stranger Things - Moletom Hellfire Club',
            description: 'Moletom oficial do Hellfire Club. Perfeito para os fãs da série.',
            price: 149.90,
            category: 'stranger-things',
            stock: 10
        },
        {
            name: 'Stranger Things - Capinha para Celular',
            description: 'Capinha oficial Stranger Things com design exclusivo.',
            price: 59.90,
            category: 'stranger-things',
            stock: 10
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO products (name, description, price, category, image_url, stock, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const product of sampleProducts) {
        await new Promise((resolve, reject) => {
            stmt.run([
                product.name,
                product.description,
                product.price,
                product.category,
                null,
                product.stock,
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    stmt.finalize((err) => {
        if (err) {
            console.error('Erro ao criar produtos de exemplo:', err);
        } else {
            console.log('✅ Produtos de exemplo criados!');
        }
    });
}

// Tentar importar produtos dos arquivos JSON
async function tryImportProductsFromJSON() {
    try {
        const fs = require('fs');
        const allProducts = [];

        // Importar produtos da Netflix Shop
        if (fs.existsSync('netflix-shop-products.json')) {
            const netflixData = JSON.parse(fs.readFileSync('netflix-shop-products.json', 'utf8'));
            const netflixProducts = netflixData.products || [];
            allProducts.push(...netflixProducts);
        }

        // Importar produtos da GoCase
        if (fs.existsSync('gocase-products-api.json')) {
            const gocaseData = JSON.parse(fs.readFileSync('gocase-products-api.json', 'utf8'));
            const gocaseProducts = gocaseData.products || [];
            if (gocaseProducts.length > 0) {
                allProducts.push(...gocaseProducts);
            }
        }

        if (allProducts.length === 0) {
            return false;
        }

        console.log(`📥 Importando ${allProducts.length} produtos dos arquivos JSON...`);

        let imported = 0;
        for (const product of allProducts) {
            try {
                const imagesJson = product.images ? JSON.stringify(product.images) : null;
                const imageUrl = product.image || (product.images && product.images[0]) || null;
                const price = parseFloat(product.price) || 0;
                const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;

                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        product.name || 'Produto sem nome',
                        product.description || '',
                        price,
                        product.category || 'stranger-things',
                        imageUrl,
                        product.inStock !== false ? 10 : 0,
                        1,
                        imagesJson,
                        originalPrice,
                        product.sku || null
                    ], (err) => {
                        if (err && !err.message.includes('UNIQUE constraint') && !err.message.includes('duplicate')) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                imported++;
                if (imported % 100 === 0) {
                    console.log(`   ✅ Importados ${imported}/${allProducts.length} produtos...`);
                }
            } catch (error) {
                // Ignorar erros de duplicação
                if (!error.message.includes('UNIQUE') && !error.message.includes('duplicate')) {
                    console.error(`Erro ao importar produto:`, error.message);
                }
            }
        }

        console.log(`✅ ${imported} produtos importados com sucesso!`);
        return imported > 0;
    } catch (error) {
        console.log('⚠️  Erro ao importar produtos dos arquivos JSON:', error.message);
        return false;
    }
}

// Criar tabelas
function initializeDatabase() {
    // Tabela de produtos
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        image_url TEXT,
        stock INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de usuários/admin
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de pedidos
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de itens do pedido
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Criar usuário admin padrão (senha: admin123)
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
            VALUES ('admin', 'admin@strangerthings.com', ?, 'admin')`, [defaultPassword], (err) => {
        if (err) {
            console.error('Erro ao criar usuário admin:', err.message);
        } else {
            console.log('Usuário admin criado: admin / admin123');
        }
    });
}

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// ===== ROTAS PÚBLICAS =====

// Listar produtos (público)
app.get('/api/products', (req, res) => {
    const startTime = Date.now();
    console.log('📦 GET /api/products - Requisição recebida');
    console.log('📍 Origem:', req.headers.origin || req.headers.referer);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🗄️  Banco inicializado:', dbInitialized);
    
    try {
        const { category, search, minPrice, maxPrice } = req.query;
        let query = 'SELECT * FROM products WHERE active = 1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (minPrice) {
            query += ' AND price >= ?';
            params.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            query += ' AND price <= ?';
            params.push(parseFloat(maxPrice));
        }

        query += ' ORDER BY created_at DESC';

        console.log('🔍 Executando query:', query);
        console.log('📋 Parâmetros:', params);

        // Usar callback (db.all já trata PostgreSQL e SQLite)
        db.all(query, params, (err, rows) => {
            const duration = Date.now() - startTime;
            console.log(`⏱️ Query executada em ${duration}ms`);
            
            if (err) {
                console.error('❌ Erro na query:', err);
                console.error('❌ Mensagem:', err.message);
                console.error('❌ Stack:', err.stack);
                res.status(500).json({ 
                    error: 'Erro ao buscar produtos',
                    message: err.message,
                    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
                });
                return;
            }
            
            // Garantir que sempre retorna um array
            const safeRows = Array.isArray(rows) ? rows : [];
            console.log(`✅ Retornando ${safeRows.length} produtos`);
            console.log(`⏱️ Total: ${Date.now() - startTime}ms`);
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.json(safeRows);
        });
    } catch (error) {
        console.error('❌ Erro ao processar requisição:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Buscar produto por ID (público)
app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM products WHERE id = ? AND active = 1', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        
        // Parse images_json if exists
        if (row.images_json) {
            try {
                row.images = JSON.parse(row.images_json);
            } catch (e) {
                row.images = [];
            }
        } else {
            row.images = row.image_url ? [row.image_url] : [];
        }
        
        res.json(row);
    });
});

// Criar pedido (público)
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_email, customer_phone, shipping_address, payment_method, items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Pedido vazio' });
    }

    db.run(
        'INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, payment_method, total) VALUES (?, ?, ?, ?, ?, ?)',
        [customer_name, customer_email, customer_phone, shipping_address || null, payment_method || null, total],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const orderId = this.lastID;
            const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');

            items.forEach(item => {
                stmt.run([orderId, item.product_id, item.quantity, item.price]);
            });

            stmt.finalize((err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ 
                    success: true, 
                    message: 'Pedido criado com sucesso',
                    order_id: orderId 
                });
            });
        }
    );
});

// ===== ROTAS DE CARRINHO =====

// Gerar session ID se não existir
function getSessionId(req) {
    return req.headers['x-session-id'] || req.body.session_id || req.query.session_id || 'default';
}

// Buscar carrinho
app.get('/api/cart', (req, res) => {
    const sessionId = getSessionId(req);
    
    db.all(`
        SELECT ci.*, p.name, p.image_url, p.sku 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.session_id = ?
        ORDER BY ci.created_at DESC
    `, [sessionId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        res.json({ items: rows, total: total });
    });
});

// Adicionar item ao carrinho
app.post('/api/cart/add', (req, res) => {
    const sessionId = getSessionId(req);
    const { product_id, quantity = 1, selected_variant, price } = req.body;
    
    if (!product_id || !price) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    
    // Verificar se o produto já está no carrinho
    db.get(`
        SELECT * FROM cart_items 
        WHERE session_id = ? AND product_id = ? AND selected_variant = ?
    `, [sessionId, product_id, selected_variant || null], (err, existing) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (existing) {
            // Atualizar quantidade
            const newQuantity = existing.quantity + quantity;
            db.run(`
                UPDATE cart_items 
                SET quantity = ?, price = ?
                WHERE id = ?
            `, [newQuantity, price, existing.id], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ success: true, message: 'Item atualizado no carrinho', id: existing.id });
            });
        } else {
            // Adicionar novo item
            db.run(`
                INSERT INTO cart_items (session_id, product_id, quantity, selected_variant, price)
                VALUES (?, ?, ?, ?, ?)
            `, [sessionId, product_id, quantity, selected_variant || null, price], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ success: true, message: 'Item adicionado ao carrinho', id: this.lastID });
            });
        }
    });
});

// Atualizar quantidade do item
app.put('/api/cart/update/:id', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    const sessionId = getSessionId(req);
    
    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Quantidade inválida' });
    }
    
    db.run(`
        UPDATE cart_items 
        SET quantity = ?
        WHERE id = ? AND session_id = ?
    `, [quantity, id, sessionId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Quantidade atualizada' });
    });
});

// Remover item do carrinho
app.delete('/api/cart/remove/:id', (req, res) => {
    const { id } = req.params;
    const sessionId = getSessionId(req);
    
    db.run('DELETE FROM cart_items WHERE id = ? AND session_id = ?', [id, sessionId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Item removido do carrinho' });
    });
});

// Limpar carrinho
app.delete('/api/cart/clear', (req, res) => {
    const sessionId = getSessionId(req);
    
    db.run('DELETE FROM cart_items WHERE session_id = ?', [sessionId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Carrinho limpo' });
    });
});

// ===== ROTAS DE AUTENTICAÇÃO =====

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    });
});

// ===== ROTAS ADMIN (PROTEGIDAS) =====

// Dashboard stats
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    db.all(`
        SELECT 
            (SELECT COUNT(*) FROM products) as total_products,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT SUM(total) FROM orders WHERE status = 'completed') as total_revenue
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows[0] || { total_products: 0, total_orders: 0, total_revenue: 0 });
    });
});

// Listar todos os produtos (admin)
app.get('/api/admin/products', authenticateToken, (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Criar produto (admin)
app.post('/api/admin/products', authenticateToken, upload.single('image'), (req, res) => {
    const { name, description, price, category, stock } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;

    db.run(
        'INSERT INTO products (name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, parseFloat(price), category, image_url, parseInt(stock) || 0],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                success: true, 
                message: 'Produto criado com sucesso',
                id: this.lastID 
            });
        }
    );
});

// Atualizar produto (admin)
app.put('/api/admin/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, stock, active } = req.body;

    let query = 'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, active = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [name, description, parseFloat(price), category, parseInt(stock) || 0, active ? 1 : 0];

    if (req.file) {
        query += ', image_url = ?';
        params.push(`/uploads/products/${req.file.filename}`);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Produto atualizado com sucesso' });
    });
});

// Deletar produto (admin)
app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Produto deletado com sucesso' });
    });
});

// Listar pedidos (admin)
app.get('/api/admin/orders', authenticateToken, (req, res) => {
    db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Atualizar status do pedido (admin)
app.put('/api/admin/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Status do pedido atualizado' });
    });
});

// Buscar pedido completo com itens (admin)
app.get('/api/admin/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!order) {
            res.status(404).json({ error: 'Pedido não encontrado' });
            return;
        }
        
        db.all(`
            SELECT oi.*, p.name, p.image_url 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id], (err, items) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ ...order, items: items });
        });
    });
});

// ===== ROTAS DE CLIENTES (ADMIN) =====

// Listar clientes (admin)
app.get('/api/admin/customers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customers ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Buscar cliente por ID (admin)
app.get('/api/admin/customers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json(row);
    });
});

// Criar cliente (admin)
app.post('/api/admin/customers', authenticateToken, (req, res) => {
    const { name, email, phone, cpf, address, city, state, zip_code } = req.body;
    
    db.run(`
        INSERT INTO customers (name, email, phone, cpf, address, city, state, zip_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email, phone, cpf, address, city, state, zip_code], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'Cliente criado com sucesso', id: this.lastID });
    });
});

// Atualizar cliente (admin)
app.put('/api/admin/customers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, email, phone, cpf, address, city, state, zip_code } = req.body;
    
    db.run(`
        UPDATE customers 
        SET name = ?, email = ?, phone = ?, cpf = ?, address = ?, city = ?, state = ?, zip_code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [name, email, phone, cpf, address, city, state, zip_code, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Cliente atualizado com sucesso' });
    });
});

// Deletar cliente (admin)
app.delete('/api/admin/customers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }
        res.json({ success: true, message: 'Cliente deletado com sucesso' });
    });
});

// Iniciar servidor (apenas em desenvolvimento local)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📦 Admin: http://localhost:${PORT}/admin.html`);
    });
}

// Exportar app para Vercel
module.exports = app;


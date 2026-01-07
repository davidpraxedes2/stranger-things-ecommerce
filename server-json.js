const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let productsCache = null;

function loadProducts() {
    if (productsCache) return productsCache;
    
    try {
        const data = fs.readFileSync(path.join(__dirname, 'netflix-shop-products.json'), 'utf8');
        const parsed = JSON.parse(data);
        productsCache = parsed.products || [];
        console.log(`✅ ${productsCache.length} produtos carregados do JSON`);
        return productsCache;
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error.message);
        return [];
    }
}

app.get('/api/products', (req, res) => {
    const products = loadProducts();
    const collections = loadJSON('collections.json');
    const productCollections = loadJSON('product-collections.json');
    
    const limit = parseInt(req.query.limit) || products.length;
    const limitedProducts = products.slice(0, limit).map((p, idx) => {
        const productId = idx + 1;
        
        // Buscar coleções deste produto
        const productCollectionIds = productCollections
            .filter(pc => pc.product_id === productId)
            .map(pc => pc.collection_id);
        
        const productCollectionNames = collections
            .filter(col => productCollectionIds.includes(col.id))
            .map(col => col.name);
        
        return {
            id: productId,
            name: p.name,
            description: p.description,
            price: parseFloat(p.price) || 0,
            original_price: p.originalPrice ? parseFloat(p.originalPrice) : null,
            image_url: p.image,
            images: p.images,
            images_json: JSON.stringify(p.images || []),
            category: 'stranger-things',
            stock: p.inStock ? 10 : 0,
            active: 1,
            sku: p.sku,
            url: p.url,
            vendor: p.vendor,
            tags: p.tags,
            collections: productCollectionNames
        };
    });
    res.json(limitedProducts);
});

app.get('/api/products/:id', (req, res) => {
    const products = loadProducts();
    const collections = loadJSON('collections.json');
    const productCollections = loadJSON('product-collections.json');
    const id = parseInt(req.params.id);
    const product = products[id - 1];
    
    if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Buscar coleções deste produto
    const productCollectionIds = productCollections
        .filter(pc => pc.product_id === id)
        .map(pc => pc.collection_id);
    
    const productCollectionNames = collections
        .filter(col => productCollectionIds.includes(col.id))
        .map(col => col.name);
    
    res.json({
        id: id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price) || 0,
        original_price: product.originalPrice ? parseFloat(product.originalPrice) : null,
        image_url: product.image,
        images: product.images,
        images_json: JSON.stringify(product.images || []),
        category: 'stranger-things',
        stock: product.inStock ? 10 : 0,
        active: 1,
        sku: product.sku,
        url: product.url,
        vendor: product.vendor,
        tags: product.tags,
        collections: productCollectionNames
    });
});

let cartSessions = {};

app.get('/api/cart', (req, res) => {
    const sessionId = req.query.session_id || req.headers['x-session-id'];
    const cart = cartSessions[sessionId] || { items: [] };
    res.json(cart);
});

app.post('/api/cart/add', (req, res) => {
    const sessionId = req.body.session_id || req.headers['x-session-id'];
    if (!cartSessions[sessionId]) {
        cartSessions[sessionId] = { items: [] };
    }
    
    const { product_id, quantity, selected_variant, price } = req.body;
    const products = loadProducts();
    const product = products[product_id - 1];
    
    if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const existingItem = cartSessions[sessionId].items.find(
        item => item.product_id === product_id && item.selected_variant === selected_variant
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cartSessions[sessionId].items.push({
            id: Date.now(),
            product_id,
            name: product.name,
            price: price || parseFloat(product.price),
            quantity,
            selected_variant,
            image_url: product.image
        });
    }
    
    res.json({ success: true, cart: cartSessions[sessionId] });
});

app.put('/api/cart/update/:id', (req, res) => {
    const sessionId = req.body.session_id || req.headers['x-session-id'];
    const itemId = parseInt(req.params.id);
    const { quantity } = req.body;
    
    if (cartSessions[sessionId]) {
        const item = cartSessions[sessionId].items.find(i => i.id === itemId);
        if (item) {
            item.quantity = quantity;
        }
    }
    
    res.json({ success: true });
});

app.delete('/api/cart/remove/:id', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    const itemId = parseInt(req.params.id);
    
    if (cartSessions[sessionId]) {
        cartSessions[sessionId].items = cartSessions[sessionId].items.filter(
            i => i.id !== itemId
        );
    }
    
    res.json({ success: true });
});

// Criar pedido
app.post('/api/orders', (req, res) => {
    const orders = loadJSON('orders.json');
    const { customer_name, customer_email, customer_phone, items, total, payment_method } = req.body;
    
    const newOrder = {
        id: orders.length + 1,
        customer_name,
        customer_email,
        customer_phone: customer_phone || '',
        items,
        total: parseFloat(total),
        payment_method: payment_method || 'pix',
        status: 'pending', // pending, paid, shipped, completed, cancelled
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    orders.push(newOrder);
    
    if (saveJSON('orders.json', orders)) {
        res.json({ success: true, order: newOrder });
    } else {
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});

// ===== ADMIN ENDPOINTS =====

// Função auxiliar para carregar JSON
function loadJSON(filename) {
    try {
        const data = fs.readFileSync(path.join(__dirname, filename), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erro ao carregar ${filename}:`, error.message);
        return [];
    }
}

// Função auxiliar para salvar JSON
function saveJSON(filename, data) {
    try {
        fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Erro ao salvar ${filename}:`, error.message);
        return false;
    }
}

// Middleware de autenticação (simples para demo)
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token === 'demo-token-admin-2024') {
        next();
    } else {
        res.status(401).json({ error: 'Não autorizado' });
    }
}

// Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ token: 'demo-token-admin-2024', username: 'admin' });
    } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
    }
});

// Estatísticas Dashboard
app.get('/api/admin/stats', authMiddleware, (req, res) => {
    const products = loadProducts();
    const collections = loadJSON('collections.json');
    const orders = loadJSON('orders.json');
    
    // Calcular vendas de hoje
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => {
        if (!o.created_at) return false;
        const orderDate = o.created_at.split('T')[0];
        return orderDate === today && o.status === 'paid';
    });
    
    const todaySales = todayOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    // Contar pedidos pagos
    const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed');
    
    res.json({
        today_sales: todaySales.toFixed(2).replace('.', ','),
        total_orders: paidOrders.length,
        total_products: products.length,
        total_collections: collections.filter(c => c.is_active).length,
        online_users: Math.floor(Math.random() * 50) + 10
    });
});

// Endpoint público - Coleções ativas (para o frontend da loja)
app.get('/api/collections', (req, res) => {
    const collections = loadJSON('collections.json');
    const productCollections = loadJSON('product-collections.json');
    
    // Retornar apenas coleções ativas, ordenadas por sort_order
    const activeCollections = collections
        .filter(col => col.is_active)
        .map(col => ({
            ...col,
            product_count: productCollections.filter(pc => pc.collection_id === col.id).length
        }))
        .sort((a, b) => a.sort_order - b.sort_order);
    
    res.json(activeCollections);
});

// Coleções - GET all
app.get('/api/admin/collections', authMiddleware, (req, res) => {
    const collections = loadJSON('collections.json');
    const productCollections = loadJSON('product-collections.json');
    
    // Contar produtos por coleção
    const collectionsWithCount = collections.map(col => ({
        ...col,
        product_count: productCollections.filter(pc => pc.collection_id === col.id).length
    }));
    
    res.json(collectionsWithCount.sort((a, b) => a.sort_order - b.sort_order));
});

// Coleções - GET one
app.get('/api/admin/collections/:id', authMiddleware, (req, res) => {
    const collections = loadJSON('collections.json');
    const collection = collections.find(c => c.id === parseInt(req.params.id));
    if (collection) {
        res.json(collection);
    } else {
        res.status(404).json({ error: 'Coleção não encontrada' });
    }
});

// Coleções - POST (criar)
app.post('/api/admin/collections', authMiddleware, (req, res) => {
    const collections = loadJSON('collections.json');
    const newCollection = {
        id: Math.max(0, ...collections.map(c => c.id)) + 1,
        name: req.body.name,
        slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-'),
        description: req.body.description || '',
        sort_order: collections.length,
        is_active: req.body.is_active !== false,
        product_count: 0,
        created_at: new Date().toISOString()
    };
    
    collections.push(newCollection);
    if (saveJSON('collections.json', collections)) {
        res.json(newCollection);
    } else {
        res.status(500).json({ error: 'Erro ao salvar coleção' });
    }
});

// Coleções - Reordenar (DEVE VIR ANTES de /:id)
app.put('/api/admin/collections/reorder', authMiddleware, (req, res) => {
    const collections = loadJSON('collections.json');
    const { order } = req.body;
    
    order.forEach(item => {
        const collection = collections.find(c => c.id === item.id);
        if (collection) {
            collection.sort_order = item.sort_order;
        }
    });
    
    if (saveJSON('collections.json', collections)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Erro ao reordenar coleções' });
    }
});

// Coleções - PUT (atualizar)
app.put('/api/admin/collections/:id', authMiddleware, (req, res) => {
    const collections = loadJSON('collections.json');
    const index = collections.findIndex(c => c.id === parseInt(req.params.id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Coleção não encontrada' });
    }
    
    collections[index] = { ...collections[index], ...req.body };
    
    if (saveJSON('collections.json', collections)) {
        res.json(collections[index]);
    } else {
        res.status(500).json({ error: 'Erro ao atualizar coleção' });
    }
});

// Coleções - DELETE
app.delete('/api/admin/collections/:id', authMiddleware, (req, res) => {
    const collections = loadJSON('collections.json');
    const filtered = collections.filter(c => c.id !== parseInt(req.params.id));
    
    if (saveJSON('collections.json', filtered)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Erro ao excluir coleção' });
    }
});

// ===== SHIPPING OPTIONS (Opções de Frete) =====

// GET - Listar todas as opções de frete ativas (para front-end)
app.get('/api/shipping-options', (req, res) => {
    const shippingOptions = loadJSON('shipping-options.json');
    const activeOptions = shippingOptions
        .filter(opt => opt.active)
        .sort((a, b) => a.sort_order - b.sort_order);
    res.json(activeOptions);
});

// GET - Listar todas as opções de frete (admin)
app.get('/api/admin/shipping-options', authMiddleware, (req, res) => {
    const shippingOptions = loadJSON('shipping-options.json');
    res.json(shippingOptions);
});

// POST - Criar nova opção de frete
app.post('/api/admin/shipping-options', authMiddleware, (req, res) => {
    const shippingOptions = loadJSON('shipping-options.json');
    const newOption = {
        id: shippingOptions.length > 0 ? Math.max(...shippingOptions.map(o => o.id)) + 1 : 1,
        name: req.body.name || '',
        delivery_time: req.body.delivery_time || '',
        price: parseFloat(req.body.price) || 0,
        icon_svg: req.body.icon_svg || '',
        active: req.body.active !== undefined ? req.body.active : true,
        sort_order: req.body.sort_order || shippingOptions.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    shippingOptions.push(newOption);
    
    if (saveJSON('shipping-options.json', shippingOptions)) {
        res.status(201).json(newOption);
    } else {
        res.status(500).json({ error: 'Erro ao criar opção de frete' });
    }
});

// PUT - Atualizar opção de frete
app.put('/api/admin/shipping-options/:id', authMiddleware, (req, res) => {
    const shippingOptions = loadJSON('shipping-options.json');
    const index = shippingOptions.findIndex(o => o.id === parseInt(req.params.id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Opção de frete não encontrada' });
    }
    
    shippingOptions[index] = {
        ...shippingOptions[index],
        ...req.body,
        updated_at: new Date().toISOString()
    };
    
    if (saveJSON('shipping-options.json', shippingOptions)) {
        res.json(shippingOptions[index]);
    } else {
        res.status(500).json({ error: 'Erro ao atualizar opção de frete' });
    }
});

// DELETE - Excluir opção de frete
app.delete('/api/admin/shipping-options/:id', authMiddleware, (req, res) => {
    const shippingOptions = loadJSON('shipping-options.json');
    const filtered = shippingOptions.filter(o => o.id !== parseInt(req.params.id));
    
    if (saveJSON('shipping-options.json', filtered)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Erro ao excluir opção de frete' });
    }
});

// Servir arquivos estáticos DEPOIS de todas as rotas de API
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log('\n🚀 Servidor JSON iniciado!');
    console.log(`📦 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 Produtos: http://localhost:${PORT}/api/products`);
    console.log(`📦 Admin: http://localhost:${PORT}/admin.html`);
    console.log(`\n✨ Abra no navegador: http://localhost:${PORT}\n`);
    loadProducts();
});

-- ================================
-- MIGRATIONS - Admin Dashboard
-- Stranger Things E-commerce
-- ================================

-- 1. COLLECTIONS (Coleções Dinâmicas)
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCT_COLLECTIONS (Relação N:N entre Produtos e Coleções)
CREATE TABLE IF NOT EXISTS product_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    UNIQUE(product_id, collection_id)
);

-- 3. Atualizar tabela ORDERS (adicionar campos faltantes)
ALTER TABLE orders ADD COLUMN shipping_address TEXT;
ALTER TABLE orders ADD COLUMN payment_method TEXT;
ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 4. SESSIONS (Analytics básico de usuários online)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar sessões ativas rapidamente
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);

-- 5. CART_ITEMS (já existe, mas vamos garantir)
CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    selected_variant TEXT,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 6. Inserir coleções padrão
INSERT OR IGNORE INTO collections (name, slug, description, sort_order, is_active) VALUES
('Novidades', 'novidades', 'Últimos lançamentos da loja', 1, 1),
('Mais Vendidos', 'mais-vendidos', 'Produtos mais populares', 2, 1),
('Promoções', 'promocoes', 'Ofertas imperdíveis', 3, 1),
('Camisetas', 'camisetas', 'Camisetas oficiais Stranger Things', 4, 1),
('Acessórios', 'acessorios', 'Bonés, mochilas e mais', 5, 1);

-- ================================
-- VIEWS úteis para o Admin
-- ================================

-- View: Produtos com suas coleções
CREATE VIEW IF NOT EXISTS vw_products_with_collections AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock,
    p.active,
    GROUP_CONCAT(c.name, ', ') as collections,
    COUNT(DISTINCT pc.collection_id) as collection_count
FROM products p
LEFT JOIN product_collections pc ON p.id = pc.product_id
LEFT JOIN collections c ON pc.collection_id = c.id
GROUP BY p.id;

-- View: Estatísticas de pedidos
CREATE VIEW IF NOT EXISTS vw_order_stats AS
SELECT 
    COUNT(*) as total_orders,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
    SUM(CASE WHEN DATE(created_at) = DATE('now') THEN total ELSE 0 END) as sales_today,
    SUM(total) as total_revenue
FROM orders;

-- 7. SHIPPING_OPTIONS (Opções de Frete / Logística)
CREATE TABLE IF NOT EXISTS shipping_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    delivery_time TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    icon_svg TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir opções de frete padrão
INSERT OR IGNORE INTO shipping_options (name, delivery_time, price, active, sort_order, icon_svg) VALUES
('PAC', 'Entrega em até 10 dias úteis', 15.00, 1, 1, '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5m1.5-9 1.96 2.5H17V9.5M9 18.5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 9 15.5a1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3 3 3 0 0 0 3-3h6a3 3 0 0 0 3 3 3 3 0 0 0 3-3h2v-5z"/></svg>'),
('SEDEX', 'Entrega em até 5 dias úteis', 30.00, 1, 2, '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13.5L2.25 12H7.5L6.9 10.5H2L1.25 9H9.05L8.45 7.5H1.11L.25 6H10.05L11.11 3H5.25L4.5 1.5H12.95L15.5 7.08V3H21.5C22.32 3 23 3.68 23 4.5V18.5C23 19.32 22.32 20 21.5 20H15.5V16.92L12.95 22.5H4.5L5.25 21H11.11L11.71 19.5H6.36L7.11 18H12.31L13.36 15.5H7.86L8.61 14H13.96L14.56 12.5H9.21L9.96 11H15.16L15.5 10.15V20H3V13.5M18 7C17.17 7 16.5 7.67 16.5 8.5S17.17 10 18 10 19.5 9.33 19.5 8.5 18.83 7 18 7Z"/></svg>'),
('Retira na Loja', 'Disponível em 2 horas', 0, 1, 3, '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');

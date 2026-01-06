const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// ROTAS DE ARQUIVOS ESTÁTICOS - LER E SERVIR DIRETAMENTE
const fs = require('fs');

app.get('/styles.css', (req, res) => {
    try {
        const paths = [
            path.join(__dirname, 'styles.css'),
            path.join(__dirname, 'public', 'styles.css'),
            path.join(process.cwd(), 'styles.css'),
            path.join(process.cwd(), 'public', 'styles.css')
        ];
        
        for (const cssPath of paths) {
            if (fs.existsSync(cssPath)) {
                res.setHeader('Content-Type', 'text/css');
                const content = fs.readFileSync(cssPath, 'utf8');
                return res.send(content);
            }
        }
        res.status(404).send('/* CSS not found */');
    } catch (error) {
        res.status(404).send('/* CSS error: ' + error.message + ' */');
    }
});

app.get('/script.js', (req, res) => {
    try {
        const paths = [
            path.join(__dirname, 'script.js'),
            path.join(__dirname, 'public', 'script.js'),
            path.join(process.cwd(), 'script.js'),
            path.join(process.cwd(), 'public', 'script.js')
        ];
        
        for (const jsPath of paths) {
            if (fs.existsSync(jsPath)) {
                res.setHeader('Content-Type', 'application/javascript');
                const content = fs.readFileSync(jsPath, 'utf8');
                return res.send(content);
            }
        }
        res.status(404).send('// JS not found');
    } catch (error) {
        res.status(404).send('// JS error: ' + error.message);
    }
});

app.get('/logo.png', (req, res) => {
    try {
        const paths = [
            path.join(__dirname, 'logo.png'),
            path.join(__dirname, 'public', 'logo.png'),
            path.join(process.cwd(), 'logo.png'),
            path.join(process.cwd(), 'public', 'logo.png')
        ];
        
        for (const imgPath of paths) {
            if (fs.existsSync(imgPath)) {
                res.setHeader('Content-Type', 'image/png');
                const content = fs.readFileSync(imgPath);
                return res.send(content);
            }
        }
        res.status(404).send('Image not found');
    } catch (error) {
        res.status(404).send('Image error: ' + error.message);
    }
});

app.get('/product-page.js', (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(path.join(__dirname, 'product-page.js'));
    } catch (error) {
        res.status(404).send('JS not found');
    }
});

app.get('/product-cart.js', (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(path.join(__dirname, 'product-cart.js'));
    } catch (error) {
        res.status(404).send('JS not found');
    }
});

app.get('/checkout.js', (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(path.join(__dirname, 'checkout.js'));
    } catch (error) {
        res.status(404).send('JS not found');
    }
});

app.get('/product.html', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'product.html'));
    } catch (error) {
        res.status(404).send('Page not found');
    }
});

app.get('/checkout.html', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'checkout.html'));
    } catch (error) {
        res.status(404).send('Page not found');
    }
});

// Servir outros arquivos estáticos
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Rota raiz - DEVE SER A ÚLTIMA
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        res.status(500).send('Erro ao carregar página');
    }
});

// Servir arquivos estáticos da pasta public com prefixo /public
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rota de produtos - VERSÃO ULTRA SIMPLIFICADA
app.get('/api/products', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    let client = null;
    
    try {
        // Pegar URL do PostgreSQL
        const connectionString = process.env.POSTGRES_URL || 
                                process.env.POSTGRES_PRISMA_URL || 
                                process.env.DATABASE_URL;
        
        if (!connectionString) {
            return res.json([]);
        }
        
        // Conectar e criar tabela + produtos
        const { Client } = require('pg');
        client = new Client({ connectionString });
        await client.connect();
        
        // Criar tabela com todas as colunas necessárias
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT,
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                images_json TEXT,
                original_price REAL,
                sku TEXT
            )
        `);
        
        // SEMPRE importar produtos reais - SEM MOCKS
        // Limpar TODOS os produtos primeiro (incluindo mocks)
        await client.query('DELETE FROM products');
        
        // Importar produtos reais dos arquivos JSON
        const fs = require('fs');
        const allProducts = [];
        
        // Tentar múltiplos caminhos para o arquivo JSON
        const netflixPaths = [
            path.join(__dirname, 'netflix-shop-products.json'),
            path.join(process.cwd(), 'netflix-shop-products.json'),
            '/var/task/netflix-shop-products.json',
            path.join(__dirname, '..', 'netflix-shop-products.json')
        ];
        
        let netflixFound = false;
        for (const netflixPath of netflixPaths) {
            try {
                if (fs.existsSync(netflixPath)) {
                    console.log(`📂 Encontrado arquivo Netflix em: ${netflixPath}`);
                    const netflixData = JSON.parse(fs.readFileSync(netflixPath, 'utf8'));
                    if (netflixData.products && Array.isArray(netflixData.products)) {
                        allProducts.push(...netflixData.products);
                        console.log(`✅ ${netflixData.products.length} produtos da Netflix Shop carregados`);
                        netflixFound = true;
                        break;
                    }
                }
            } catch (err) {
                console.log(`⚠️ Erro ao ler ${netflixPath}:`, err.message);
            }
        }
        
        if (!netflixFound) {
            console.error('❌ Arquivo netflix-shop-products.json NÃO encontrado em nenhum caminho!');
            console.log('📁 Caminhos testados:', netflixPaths);
            console.log('📁 __dirname:', __dirname);
            console.log('📁 process.cwd():', process.cwd());
        }
        
        // Importar da GoCase
        const gocasePaths = [
            path.join(__dirname, 'gocase-products-api.json'),
            path.join(process.cwd(), 'gocase-products-api.json'),
            '/var/task/gocase-products-api.json',
            path.join(__dirname, '..', 'gocase-products-api.json')
        ];
        
        for (const gocasePath of gocasePaths) {
            try {
                if (fs.existsSync(gocasePath)) {
                    const gocaseData = JSON.parse(fs.readFileSync(gocasePath, 'utf8'));
                    if (gocaseData.products && Array.isArray(gocaseData.products) && gocaseData.products.length > 0) {
                        allProducts.push(...gocaseData.products);
                        console.log(`✅ ${gocaseData.products.length} produtos da GoCase carregados`);
                        break;
                    }
                }
            } catch (err) {
                // Ignorar
            }
        }
        
        if (allProducts.length > 0) {
            console.log(`📥 Importando ${allProducts.length} produtos reais...`);
            let imported = 0;
            let errors = 0;
            
            for (const product of allProducts) {
                try {
                    const name = product.name || product.title || 'Produto sem nome';
                    const description = product.description || '';
                    const price = parseFloat(product.price) || 0;
                    const imageUrl = product.image || (product.images && product.images[0]) || null;
                    const imagesJson = product.images ? JSON.stringify(product.images) : null;
                    const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
                    const sku = product.sku || null;
                    const category = product.category || 'stranger-things';
                    const stock = product.inStock !== false ? 10 : 0;
                    
                    await client.query(`
                        INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [name, description, price, category, imageUrl, stock, 1, imagesJson, originalPrice, sku]);
                    imported++;
                } catch (err) {
                    errors++;
                    if (errors <= 5) {
                        console.error(`Erro ao importar produto ${product.name || 'sem nome'}:`, err.message);
                    }
                }
            }
            
            console.log(`✅ ${imported} produtos importados com sucesso! (${errors} erros)`);
        } else {
            console.error('❌ ERRO CRÍTICO: Nenhum produto real encontrado! Verifique se o arquivo JSON está no repositório.');
            // NÃO criar produtos mock - retornar erro
            return res.status(500).json({ 
                error: 'Nenhum produto encontrado. Verifique se netflix-shop-products.json está no repositório.',
                products: []
            });
        }
        
        // Buscar produtos
        const result = await client.query('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC');
        res.json(result.rows || []);
        
    } catch (error) {
        console.error('ERRO:', error.message);
        res.json([]);
    } finally {
        if (client) {
            try {
                await client.end();
            } catch (e) {}
        }
    }
});

// Rota para forçar reimportação dos produtos
app.get('/api/reimport-products', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    let client = null;
    
    try {
        const connectionString = process.env.POSTGRES_URL || 
                                process.env.POSTGRES_PRISMA_URL || 
                                process.env.DATABASE_URL;
        
        if (!connectionString) {
            return res.json({ error: 'No database connection' });
        }
        
        const { Client } = require('pg');
        client = new Client({ connectionString });
        await client.connect();
        
        // Limpar todos os produtos
        await client.query('DELETE FROM products');
        
        // Importar produtos reais
        const fs = require('fs');
        const allProducts = [];
        
        const netflixPaths = [
            path.join(__dirname, 'netflix-shop-products.json'),
            path.join(process.cwd(), 'netflix-shop-products.json'),
            '/var/task/netflix-shop-products.json'
        ];
        
        for (const netflixPath of netflixPaths) {
            if (fs.existsSync(netflixPath)) {
                const netflixData = JSON.parse(fs.readFileSync(netflixPath, 'utf8'));
                if (netflixData.products && Array.isArray(netflixData.products)) {
                    allProducts.push(...netflixData.products);
                    break;
                }
            }
        }
        
        let imported = 0;
        for (const product of allProducts) {
            try {
                const name = product.name || product.title || 'Produto sem nome';
                const description = product.description || '';
                const price = parseFloat(product.price) || 0;
                const imageUrl = product.image || (product.images && product.images[0]) || null;
                const imagesJson = product.images ? JSON.stringify(product.images) : null;
                const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
                const sku = product.sku || null;
                const category = product.category || 'stranger-things';
                const stock = product.inStock !== false ? 10 : 0;
                
                await client.query(`
                    INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [name, description, price, category, imageUrl, stock, 1, imagesJson, originalPrice, sku]);
                imported++;
            } catch (err) {
                console.error('Erro ao importar produto:', err.message);
            }
        }
        
        res.json({ success: true, imported });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.end();
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('ERRO:', err.message);
    res.status(500).json({ error: 'Erro interno' });
});

module.exports = app;


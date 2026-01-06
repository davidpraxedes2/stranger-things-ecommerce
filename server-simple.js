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
        // Usar tipos mais específicos para evitar problemas
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(500) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                images_json TEXT,
                original_price DECIMAL(10,2),
                sku VARCHAR(100)
            )
        `);
        
        // Garantir que as colunas existem (caso a tabela já exista sem essas colunas)
        try {
            const columns = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'products'
            `);
            const existingColumns = columns.rows.map(r => r.column_name);
            console.log('📊 Colunas existentes:', existingColumns);
            
            if (!existingColumns.includes('images_json')) {
                await client.query('ALTER TABLE products ADD COLUMN images_json TEXT');
                console.log('✅ Coluna images_json adicionada');
            }
            if (!existingColumns.includes('original_price')) {
                await client.query('ALTER TABLE products ADD COLUMN original_price DECIMAL(10,2)');
                console.log('✅ Coluna original_price adicionada');
            }
            if (!existingColumns.includes('sku')) {
                await client.query('ALTER TABLE products ADD COLUMN sku VARCHAR(100)');
                console.log('✅ Coluna sku adicionada');
            }
        } catch (e) {
            console.log('⚠️ Erro ao verificar/adicionar colunas:', e.message);
        }
        
        // Verificar se tem produtos
        const countResult = await client.query('SELECT COUNT(*) as count FROM products');
        const count = parseInt(countResult.rows[0]?.count || 0);
        console.log(`📊 Total de produtos no banco: ${count}`);
        
        // SEMPRE importar se tiver menos de 50 produtos
        // (50 é um número seguro - sabemos que temos 513 produtos da Netflix)
        if (count < 50) {
            console.log(`🚀 Iniciando importação (count=${count} < 50)...`);
            console.log(`📊 Apenas ${count} produtos encontrados. Limpando e importando produtos reais...`);
            
            // Limpar TODOS os produtos (incluindo mocks)
            await client.query('DELETE FROM products');
            console.log('🗑️ Todos os produtos foram deletados');
            
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
            
            console.log('🔍 Procurando arquivo netflix-shop-products.json...');
            console.log('📁 __dirname:', __dirname);
            console.log('📁 process.cwd():', process.cwd());
            
            let netflixFound = false;
            let netflixData = null;
            for (const netflixPath of netflixPaths) {
                try {
                    console.log(`🔍 Testando caminho: ${netflixPath}`);
                    if (fs.existsSync(netflixPath)) {
                        console.log(`✅ Arquivo encontrado em: ${netflixPath}`);
                        netflixData = JSON.parse(fs.readFileSync(netflixPath, 'utf8'));
                        if (netflixData.products && Array.isArray(netflixData.products)) {
                            allProducts.push(...netflixData.products);
                            console.log(`✅ ${netflixData.products.length} produtos da Netflix Shop carregados`);
                            netflixFound = true;
                            break;
                        } else {
                            console.log(`⚠️ Arquivo encontrado mas sem array de produtos. Estrutura:`, Object.keys(netflixData));
                        }
                    } else {
                        console.log(`❌ Arquivo não existe em: ${netflixPath}`);
                    }
                } catch (err) {
                    console.error(`❌ Erro ao ler ${netflixPath}:`, err.message);
                    console.error('Stack:', err.stack);
                }
            }
            
            if (!netflixFound) {
                console.error('❌ Arquivo netflix-shop-products.json NÃO encontrado em nenhum caminho!');
                // Tentar listar arquivos no diretório
                try {
                    const files = fs.readdirSync(__dirname);
                    console.log('📁 Arquivos no __dirname:', files.filter(f => f.includes('netflix') || f.includes('.json')).slice(0, 10));
                } catch (e) {
                    console.error('Erro ao listar arquivos:', e.message);
                }
                
                // Não retornar aqui - deixar continuar para tentar buscar produtos existentes
                console.error('⚠️ Arquivo não encontrado, mas continuando...');
            }
            
            // Importar da GoCase (opcional)
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
                
                // Importar TODOS os produtos - usar INSERT em lote para ser mais rápido
                // Limitar a 1000 produtos por vez para não exceder timeout do Vercel
                const maxProducts = Math.min(allProducts.length, 1000);
                const productsToImport = allProducts.slice(0, maxProducts);
                
                console.log(`📦 Importando ${productsToImport.length} produtos (de ${allProducts.length} total)...`);
                
                // Usar transação para ser mais rápido
                await client.query('BEGIN');
                
                try {
                    for (const product of productsToImport) {
                        try {
                            const name = (product.name || product.title || 'Produto sem nome').substring(0, 500);
                            const description = (product.description || '').substring(0, 2000);
                            const price = parseFloat(product.price) || 0;
                            const imageUrl = product.image || (product.images && product.images[0]) || null;
                            const imagesJson = product.images ? JSON.stringify(product.images).substring(0, 10000) : null;
                            const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
                            const sku = (product.sku || null) ? String(product.sku).substring(0, 100) : null;
                            const category = (product.category || 'stranger-things').substring(0, 100);
                            const stock = product.inStock !== false ? 10 : 0;
                            
                            await client.query(`
                                INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                            `, [name, description, price, category, imageUrl, stock, 1, imagesJson, originalPrice, sku]);
                            imported++;
                            
                            // Log a cada 100 produtos
                            if (imported % 100 === 0) {
                                console.log(`📊 Progresso: ${imported}/${productsToImport.length} produtos importados...`);
                            }
                        } catch (err) {
                            errors++;
                            if (errors <= 5) {
                                console.error(`Erro ao importar produto:`, err.message);
                            }
                        }
                    }
                    
                    await client.query('COMMIT');
                    console.log(`✅ ${imported} produtos importados com sucesso! (${errors} erros)`);
                    
                    // Se tiver mais produtos, logar
                    if (allProducts.length > maxProducts) {
                        console.log(`⚠️ Ainda há ${allProducts.length - maxProducts} produtos não importados. Use /api/reimport-products para importar o restante.`);
                    }
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('❌ Erro na transação:', err.message);
                    throw err;
                }
            } else {
                console.error('❌ ERRO CRÍTICO: Nenhum produto real encontrado no array allProducts!');
                console.log('📊 allProducts.length:', allProducts.length);
                // NÃO retornar aqui - deixar continuar para buscar produtos existentes
            }
        } else {
            console.log(`✅ ${count} produtos já existem no banco. Pulando importação.`);
        }
        
        // Buscar produtos - SEMPRE buscar, mesmo que tenha importado
        const result = await client.query('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC');
        const products = result.rows || [];
        console.log(`📦 Retornando ${products.length} produtos da API`);
        
        // Verificar se há produtos mas a query retornou vazio
        if (products.length === 0) {
            const totalCount = await client.query('SELECT COUNT(*) as count FROM products');
            const total = parseInt(totalCount.rows[0]?.count || 0);
            console.log(`⚠️ Query retornou 0 produtos, mas há ${total} produtos no banco`);
            
            // Tentar buscar sem filtro de active
            const allResult = await client.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 10');
            console.log(`📦 Produtos sem filtro active: ${allResult.rows.length}`);
        }
        
        // Log do primeiro produto para debug
        if (products.length > 0) {
            console.log(`📦 Primeiro produto:`, {
                id: products[0].id,
                name: products[0].name?.substring(0, 50),
                price: products[0].price,
                image_url: products[0].image_url?.substring(0, 50),
                active: products[0].active
            });
        }
        
        res.json(products);
        
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

// Rota para buscar um produto específico por ID
app.get('/api/products/:id', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    let client = null;
    
    try {
        const productId = parseInt(req.params.id);
        
        if (!productId || isNaN(productId)) {
            return res.status(400).json({ error: 'ID de produto inválido' });
        }
        
        const connectionString = process.env.POSTGRES_URL || 
                                process.env.POSTGRES_PRISMA_URL || 
                                process.env.DATABASE_URL;
        
        if (!connectionString) {
            return res.status(500).json({ error: 'No database connection' });
        }
        
        const { Client } = require('pg');
        client = new Client({ connectionString });
        await client.connect();
        
        // Buscar produto por ID
        const result = await client.query('SELECT * FROM products WHERE id = $1 AND active = 1', [productId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        const product = result.rows[0];
        console.log(`📦 Produto ${productId} encontrado:`, product.name);
        res.json(product);
        
    } catch (error) {
        console.error('ERRO ao buscar produto:', error.message);
        res.status(500).json({ error: 'Erro ao buscar produto' });
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
        
        // Dropar e recriar a tabela para garantir estrutura correta
        console.log('🗑️ Recriando tabela products...');
        await client.query('DROP TABLE IF EXISTS products CASCADE');
        await client.query(`
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(500) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                images_json TEXT,
                original_price DECIMAL(10,2),
                sku VARCHAR(100)
            )
        `);
        console.log('✅ Tabela products recriada com sucesso');
        
        // Importar produtos reais
        const fs = require('fs');
        const allProducts = [];
        
        const netflixPaths = [
            path.join(__dirname, 'netflix-shop-products.json'),
            path.join(process.cwd(), 'netflix-shop-products.json'),
            '/var/task/netflix-shop-products.json',
            path.join(__dirname, '..', 'netflix-shop-products.json')
        ];
        
        console.log('🔍 Procurando arquivo netflix-shop-products.json...');
        let netflixFound = false;
        let netflixData = null;
        
        for (const netflixPath of netflixPaths) {
            try {
                console.log(`🔍 Testando: ${netflixPath}`);
                if (fs.existsSync(netflixPath)) {
                    console.log(`✅ Arquivo encontrado em: ${netflixPath}`);
                    const fileContent = fs.readFileSync(netflixPath, 'utf8');
                    console.log(`📄 Tamanho do arquivo: ${fileContent.length} caracteres`);
                    netflixData = JSON.parse(fileContent);
                    console.log(`📊 Estrutura do JSON:`, Object.keys(netflixData));
                    
                    if (netflixData.products && Array.isArray(netflixData.products)) {
                        console.log(`✅ Array de produtos encontrado com ${netflixData.products.length} itens`);
                        allProducts.push(...netflixData.products);
                        netflixFound = true;
                        break;
                    } else {
                        console.error(`❌ netflixData.products não é um array. Tipo:`, typeof netflixData.products);
                        console.error(`📊 Chaves disponíveis:`, Object.keys(netflixData));
                    }
                } else {
                    console.log(`❌ Arquivo não existe em: ${netflixPath}`);
                }
            } catch (err) {
                console.error(`❌ Erro ao ler ${netflixPath}:`, err.message);
                console.error('Stack:', err.stack);
            }
        }
        
        if (!netflixFound) {
            return res.status(500).json({ 
                error: 'Arquivo netflix-shop-products.json não encontrado ou inválido',
                paths: netflixPaths,
                dirname: __dirname,
                cwd: process.cwd()
            });
        }
        
        if (allProducts.length === 0) {
            return res.status(500).json({ 
                error: 'Array de produtos está vazio',
                netflixDataKeys: netflixData ? Object.keys(netflixData) : null,
                netflixDataProductsType: netflixData && netflixData.products ? typeof netflixData.products : null
            });
        }
        
        console.log(`📥 Iniciando importação de ${allProducts.length} produtos...`);
        let imported = 0;
        let errors = 0;
        
        // Limitar a 1000 produtos para não exceder timeout
        const maxProducts = Math.min(allProducts.length, 1000);
        const productsToImport = allProducts.slice(0, maxProducts);
        console.log(`📦 Importando ${maxProducts} produtos (de ${allProducts.length} total)...`);
        
        await client.query('BEGIN');
        
        try {
            for (let i = 0; i < productsToImport.length; i++) {
                const product = productsToImport[i];
                try {
                    const name = (product.name || product.title || 'Produto sem nome').substring(0, 500);
                    const description = (product.description || '').substring(0, 2000);
                    const price = parseFloat(product.price) || 0;
                    const imageUrl = product.image || (product.images && product.images[0]) || null;
                    const imagesJson = product.images ? JSON.stringify(product.images).substring(0, 10000) : null;
                    const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
                    const sku = (product.sku || null) ? String(product.sku).substring(0, 100) : null;
                    const category = (product.category || 'stranger-things').substring(0, 100);
                    const stock = product.inStock !== false ? 10 : 0;
                    
                    await client.query(`
                        INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [name, description, price, category, imageUrl, stock, 1, imagesJson, originalPrice, sku]);
                    imported++;
                    
                    if (imported % 100 === 0) {
                        console.log(`📊 Progresso: ${imported}/${productsToImport.length} produtos importados...`);
                    }
                } catch (err) {
                    errors++;
                    if (errors === 1) {
                        // Logar o primeiro erro completo para debug
                        console.error(`❌ PRIMEIRO ERRO ao importar produto ${i}:`, err.message);
                        console.error('Stack completo:', err.stack);
                        console.error('Produto completo:', JSON.stringify(product, null, 2));
                        console.error('Valores tentados:', {
                            name: (product.name || product.title || 'Produto sem nome').substring(0, 500),
                            description: (product.description || '').substring(0, 2000),
                            price: parseFloat(product.price) || 0,
                            imageUrl: product.image || (product.images && product.images[0]) || null,
                            category: (product.category || 'stranger-things').substring(0, 100),
                            stock: product.inStock !== false ? 10 : 0
                        });
                    } else if (errors <= 5) {
                        console.error(`❌ Erro ao importar produto ${i}:`, err.message);
                    }
                }
            }
            
            await client.query('COMMIT');
            console.log(`✅ ${imported} produtos importados com sucesso! (${errors} erros)`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Erro na transação:', err.message);
            throw err;
        }
        
        res.json({ 
            success: true, 
            imported, 
            errors, 
            total: allProducts.length,
            importedFrom: maxProducts
        });
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

// Debug route - mostra informações sobre produtos e arquivos
app.get('/api/debug', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const fs = require('fs');
    const debug = {
        timestamp: new Date().toISOString(),
        dirname: __dirname,
        cwd: process.cwd(),
        files: [],
        db: null
    };
    
    // Listar arquivos JSON
    try {
        const files = fs.readdirSync(__dirname);
        debug.files = files.filter(f => f.includes('netflix') || f.includes('gocase') || f.endsWith('.json')).slice(0, 20);
    } catch (e) {
        debug.filesError = e.message;
    }
    
    // Verificar arquivo JSON
    const netflixPath = path.join(__dirname, 'netflix-shop-products.json');
    debug.netflixFile = {
        path: netflixPath,
        exists: fs.existsSync(netflixPath),
        size: fs.existsSync(netflixPath) ? fs.statSync(netflixPath).size : 0
    };
    
    // Verificar banco de dados
    try {
        const connectionString = process.env.POSTGRES_URL || 
                                process.env.POSTGRES_PRISMA_URL || 
                                process.env.DATABASE_URL;
        
        if (connectionString) {
            const { Client } = require('pg');
            const client = new Client({ connectionString });
            await client.connect();
            
            const countResult = await client.query('SELECT COUNT(*) as count FROM products');
            const count = parseInt(countResult.rows[0]?.count || 0);
            
            const sampleResult = await client.query('SELECT id, name, price FROM products LIMIT 5');
            
            debug.db = {
                connected: true,
                productCount: count,
                sampleProducts: sampleResult.rows
            };
            
            await client.end();
        } else {
            debug.db = { connected: false, error: 'No connection string' };
        }
    } catch (e) {
        debug.db = { connected: false, error: e.message };
    }
    
    res.json(debug);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('ERRO:', err.message);
    res.status(500).json({ error: 'Erro interno' });
});

module.exports = app;


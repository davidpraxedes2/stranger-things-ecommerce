const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// ROTAS DE ARQUIVOS ESTÁTICOS PRIMEIRO (ANTES DE TUDO)
app.get('/styles.css', (req, res) => {
    try {
        const fs = require('fs');
        const cssPath = path.join(__dirname, 'styles.css');
        console.log('📄 Tentando servir styles.css de:', cssPath);
        
        if (fs.existsSync(cssPath)) {
            res.setHeader('Content-Type', 'text/css');
            res.sendFile(cssPath);
        } else {
            console.error('❌ styles.css não encontrado em:', cssPath);
            res.status(404).send('/* CSS not found */');
        }
    } catch (error) {
        console.error('❌ Erro ao servir CSS:', error.message);
        res.status(404).send('/* CSS error */');
    }
});

app.get('/script.js', (req, res) => {
    try {
        const fs = require('fs');
        const jsPath = path.join(__dirname, 'script.js');
        console.log('📄 Tentando servir script.js de:', jsPath);
        
        if (fs.existsSync(jsPath)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.sendFile(jsPath);
        } else {
            console.error('❌ script.js não encontrado em:', jsPath);
            res.status(404).send('// JS not found');
        }
    } catch (error) {
        console.error('❌ Erro ao servir JS:', error.message);
        res.status(404).send('// JS error');
    }
});

app.get('/logo.png', (req, res) => {
    try {
        const fs = require('fs');
        const imgPath = path.join(__dirname, 'logo.png');
        console.log('📄 Tentando servir logo.png de:', imgPath);
        
        if (fs.existsSync(imgPath)) {
            res.setHeader('Content-Type', 'image/png');
            res.sendFile(imgPath);
        } else {
            console.error('❌ logo.png não encontrado em:', imgPath);
            res.status(404).send('Image not found');
        }
    } catch (error) {
        console.error('❌ Erro ao servir imagem:', error.message);
        res.status(404).send('Image error');
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
        
        // Criar tabela
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar se tem produtos
        const countResult = await client.query('SELECT COUNT(*) as count FROM products');
        const count = parseInt(countResult.rows[0]?.count || 0);
        
        if (count === 0) {
            // Criar produtos
            await client.query(`
                INSERT INTO products (name, description, price, category, image_url, stock, active) VALUES
                ('Stranger Things T-Shirt', 'Camiseta oficial', 79.90, 'stranger-things', 'https://via.placeholder.com/300', 10, 1),
                ('Stranger Things Poster', 'Pôster oficial', 29.90, 'stranger-things', 'https://via.placeholder.com/300', 20, 1),
                ('Stranger Things Mug', 'Caneca temática', 39.90, 'stranger-things', 'https://via.placeholder.com/300', 15, 1)
            `);
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


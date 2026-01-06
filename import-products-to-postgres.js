// Script para importar produtos dos arquivos JSON para o PostgreSQL
const fs = require('fs');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const POSTGRES_URL = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

if (!POSTGRES_URL) {
    console.error('❌ POSTGRES_URL não encontrada! Configure a variável de ambiente.');
    process.exit(1);
}

const client = new Client({
    connectionString: POSTGRES_URL
});

async function importProducts() {
    try {
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL\n');

        const allProducts = [];

        // Importar produtos da Netflix Shop
        if (fs.existsSync('netflix-shop-products.json')) {
            console.log('📦 Carregando produtos da Netflix Shop...');
            const netflixData = JSON.parse(fs.readFileSync('netflix-shop-products.json', 'utf8'));
            const netflixProducts = netflixData.products || [];
            allProducts.push(...netflixProducts);
            console.log(`   ✅ ${netflixProducts.length} produtos carregados`);
        }

        // Importar produtos da GoCase
        if (fs.existsSync('gocase-products-api.json')) {
            console.log('📦 Carregando produtos da GoCase...');
            const gocaseData = JSON.parse(fs.readFileSync('gocase-products-api.json', 'utf8'));
            const gocaseProducts = gocaseData.products || [];
            allProducts.push(...gocaseProducts);
            console.log(`   ✅ ${gocaseProducts.length} produtos carregados\n`);
        }

        if (allProducts.length === 0) {
            console.log('⚠️  Nenhum produto encontrado nos arquivos JSON');
            await client.end();
            return;
        }

        console.log(`\n🚀 Importando ${allProducts.length} produtos para o PostgreSQL...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const product of allProducts) {
            try {
                const imagesJson = product.images ? JSON.stringify(product.images) : null;
                const imageUrl = product.image || (product.images && product.images[0]) || null;
                const price = parseFloat(product.price) || 0;
                const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;

                await client.query(`
                    INSERT INTO products (name, description, price, category, image_url, stock, active, images_json, original_price, sku)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT DO NOTHING
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
                ]);

                successCount++;
                if (successCount % 50 === 0) {
                    console.log(`   ✅ Importados ${successCount}/${allProducts.length} produtos...`);
                }
            } catch (error) {
                errorCount++;
                console.error(`   ❌ Erro ao importar "${product.name}":`, error.message);
            }
        }

        console.log(`\n✅ Importação concluída!`);
        console.log(`   ✅ Sucesso: ${successCount} produtos`);
        if (errorCount > 0) {
            console.log(`   ⚠️  Erros: ${errorCount} produtos`);
        }

        await client.end();
    } catch (error) {
        console.error('❌ Erro na importação:', error);
        await client.end();
        process.exit(1);
    }
}

importProducts();


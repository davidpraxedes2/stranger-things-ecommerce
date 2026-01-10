// setup-collections-api.js
const API_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };

async function setupCollections() {
    try {
        console.log('🚀 Iniciando configuração de coleções via API...');

        // 1. Login
        console.log('🔐 Realizando login...');
        const loginRes = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ADMIN_CREDENTIALS)
        });

        if (!loginRes.ok) throw new Error(`Falha no login: ${loginRes.statusText}`);
        const { token } = await loginRes.json();
        console.log('✅ Login OK.');

        // 2. Fetch Products
        const productsRes = await fetch(`${API_URL}/products`);
        const products = await productsRes.json();
        console.log(`✅ ${products.length} produtos totais.`);

        // 3. Config
        const collectionsConfig = [
            {
                name: 'Quenchers & Copos',
                slug: 'quenchers-copos',
                description: 'Coleção de Quenchers, Copos e Garrafas térmicas',
                keywords: ['quencher', 'copo', 'garrafa', 'caneca', 'tumbler', 'stanley']
            },
            {
                name: 'Mochilas',
                slug: 'mochilas',
                description: 'Mochilas e Bags exclusivas',
                keywords: ['mochila', 'bag', 'costas', 'backpack']
            },
            {
                name: 'Roupas',
                slug: 'roupas',
                description: 'Vestuário: Camisetas, Moletons e mais',
                keywords: ['camiseta', 'shirt', 'moletom', 'casaco', 'vestido', 'boné', 'roupa', 'vestuário']
            }
        ];

        // 4. Process
        for (const colConfig of collectionsConfig) {
            console.log(`\n🧩 Coleção: ${colConfig.name}`);

            const matchingProducts = products.filter(p => {
                const text = (p.name + ' ' + (p.description || '')).toLowerCase();
                return colConfig.keywords.some(k => text.includes(k.toLowerCase()));
            });
            console.log(`   ${matchingProducts.length} produtos compatíveis.`);
            if (matchingProducts.length === 0) continue;

            // List existing
            const listRes = await fetch(`${API_URL}/admin/collections`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const allCollections = await listRes.json();
            let collection = allCollections.find(c => c.slug === colConfig.slug);

            // Create if needed
            if (!collection) {
                console.log('   Criando coleção...');
                const createRes = await fetch(`${API_URL}/admin/collections`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        name: colConfig.name,
                        slug: colConfig.slug,
                        description: colConfig.description,
                        is_active: 1
                    })
                });

                if (!createRes.ok) {
                    console.error('   ❌ Erro ao criar:', await createRes.text());
                    continue;
                }
                const result = await createRes.json();
                collection = { id: result.collectionId || result.id };
                console.log(`   ✅ Criada com ID: ${collection.id}`);
            } else {
                console.log(`   Já existe ID: ${collection.id}`);
            }

            // Add products
            const prodRes = await fetch(`${API_URL}/admin/collections/${collection.id}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const existingProds = await prodRes.json();
            const existingIds = new Set(existingProds.map(p => p.id));
            let added = 0;

            for (const prod of matchingProducts) {
                if (existingIds.has(prod.id)) continue;
                const addRes = await fetch(`${API_URL}/admin/collections/${collection.id}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ product_id: prod.id })
                });
                if (addRes.ok) added++;
            }
            console.log(`   ✅ Adicionados ${added} novos produtos.`);
        }
        console.log('\n✨ Fim.');

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

setupCollections();

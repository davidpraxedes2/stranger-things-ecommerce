// Script para categorizar produtos em coleções
const fs = require('fs');
const path = require('path');

// Carregar produtos
const productsData = JSON.parse(fs.readFileSync('netflix-shop-products.json', 'utf8'));
const products = productsData.products;

console.log(`📦 Total de produtos: ${products.length}`);

// Regras de categorização
const rules = [
    { collectionId: 1, keywords: ['T-Shirt', 'Tee', 'Raglan', 'Tank', 'Ringer'] }, // Camisetas
    { collectionId: 2, keywords: ['Sweatshirt', 'Hoodie', 'Pullover', 'Fleece'] }, // Moletons
    { collectionId: 3, keywords: ['Kids', 'Youth', 'Toddler', 'Baby'] }, // Kids
    { collectionId: 4, keywords: ['Hellfire'] }, // Hellfire Club
    { collectionId: 5, keywords: ['Eleven', 'Mike', 'Dustin', 'Lucas', 'Will', 'Max', 'Steve', 'Eddie', 'Joyce', 'Hopper'] }, // Personagens
    { collectionId: 6, keywords: ['Hat', 'Cap', 'Sock', 'Pin', 'Bag', 'Backpack', 'Beanie', 'Scarf'] } // Acessórios
];

const productCollections = [];

products.forEach((product, index) => {
    const productId = index + 1;
    const productName = product.name;
    const matchedCollections = new Set();
    
    // Verificar cada regra
    rules.forEach(rule => {
        const matches = rule.keywords.some(keyword => 
            productName.includes(keyword)
        );
        
        if (matches) {
            matchedCollections.add(rule.collectionId);
        }
    });
    
    // Se não encontrou nenhuma categoria específica, adicionar à primeira (Camisetas) como padrão
    if (matchedCollections.size === 0 && productName.includes('Stranger Things')) {
        matchedCollections.add(1);
    }
    
    // Adicionar ao array
    matchedCollections.forEach(collectionId => {
        productCollections.push({
            product_id: productId,
            collection_id: collectionId,
            sort_order: 0
        });
    });
});

// Salvar
fs.writeFileSync('product-collections.json', JSON.stringify(productCollections, null, 2));

// Estatísticas
console.log(`\n✅ Categorizações criadas: ${productCollections.length}`);
console.log(`\n📊 Produtos por coleção:`);

const collectionNames = {
    1: 'Camisetas',
    2: 'Moletons & Hoodies',
    3: 'Kids',
    4: 'Hellfire Club',
    5: 'Personagens',
    6: 'Acessórios'
};

Object.keys(collectionNames).forEach(colId => {
    const count = productCollections.filter(pc => pc.collection_id === parseInt(colId)).length;
    console.log(`  ${collectionNames[colId]}: ${count} produtos`);
});

console.log(`\n✨ Arquivo product-collections.json criado!`);

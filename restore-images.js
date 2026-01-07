const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const JSON_FILE = 'netflix-shop-products.json';
const DB_FILE = 'database.sqlite';

function restoreImages() {
    console.log('🚀 Starting Image Restoration Process...');

    // 1. Read JSON Backup
    const jsonPath = path.resolve(__dirname, JSON_FILE);
    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ JSON file not found: ${jsonPath}`);
        process.exit(1);
    }

    console.log(`📖 Reading backup file: ${JSON_FILE}...`);
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const backupData = JSON.parse(rawData);

    const products = backupData.products || [];
    console.log(`📊 Found ${products.length} products in backup.`);

    // 2. Connect to Database
    const dbPath = path.resolve(__dirname, DB_FILE);
    const db = new Database(dbPath);
    console.log(`💾 Connected to database: ${DB_FILE}`);

    // 3. Prepare Statements
    const findProduct = db.prepare('SELECT id, name FROM products WHERE name = ?');
    const updateProduct = db.prepare('UPDATE products SET images_json = ? WHERE id = ?');

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    // 4. Iterate and Restore
    db.transaction(() => {
        for (const item of products) {
            // Find product in DB
            const dbProduct = findProduct.get(item.name);

            if (!dbProduct) {
                // console.warn(`⚠️ Product not found in DB: "${item.name}"`);
                notFoundCount++;
                continue;
            }

            // Check if backup has images
            if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                const imagesJson = JSON.stringify(item.images);

                // Update DB
                updateProduct.run(imagesJson, dbProduct.id);
                updatedCount++;
                // console.log(`✅ Updated: "${item.name}" with ${item.images.length} images`);
            } else {
                skippedCount++;
            }
        }
    })();

    console.log('\n🎉 Restoration Complete!');
    console.log('-----------------------------');
    console.log(`✅ Updated:    ${updatedCount} products`);
    console.log(`⚠️ Not Found:  ${notFoundCount} products (in DB)`);
    console.log(`⏭️ Skipped:    ${skippedCount} products (no extra images in backup)`);
    console.log('-----------------------------');

    db.close();
}

restoreImages();

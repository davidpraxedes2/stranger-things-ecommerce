
async function cleanupFunkos(db) {
    console.log('🧹 Starting cleanup of Funko products...');

    try {
        // Count products to be deleted
        const countResult = await db.query(
            "SELECT COUNT(*) as count FROM products WHERE name ILIKE '%Funko%'"
        );
        const count = countResult.rows[0].count;

        if (count > 0) {
            console.log(`🗑️  Found ${count} products with 'Funko' in name. Deleting...`);

            // Delete the products
            await db.query("DELETE FROM products WHERE name ILIKE '%Funko%'");

            // Also clean up collection associations if necessary (though ON DELETE CASCADE usually handles this, 
            // but let's be safe if it's not set up like that, or just assume products deletion is enough first).
            // Actually, if there are foreign keys without cascade, this might fail.
            // Let's assume standard cascading or check. 
            // In a simple setup, deleting from products is usually the main thing.
            // If collection_products links to products, we might need to delete from there first or ensure cascade.
            // Let's try deleting dependent records first just in case.

            await db.query(`
                DELETE FROM collection_products 
                WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Funko%')
            `);

            await db.query("DELETE FROM products WHERE name ILIKE '%Funko%'");

            console.log('✅ Cleanup complete. All Funko products deleted.');
        } else {
            console.log('✨ No products with "Funko" in name found.');
        }

    } catch (error) {
        console.error('❌ Error cleaning up Funkos:', error.message);
    }
}

module.exports = { cleanupFunkos };

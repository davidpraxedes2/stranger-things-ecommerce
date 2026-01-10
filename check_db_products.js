const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('ecommerce.db');

db.all("SELECT name, image_url, price FROM products WHERE name LIKE '%Stranger%'", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Found ${rows.length} existing Stranger Things products:`);
    rows.forEach(r => {
        console.log(`- [${r.price}] ${r.name} | ${r.image_url}`);
    });
});

db.close();

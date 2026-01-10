const db = require('./db-helper');

async function check() {
    await db.initialize();
    console.log('📦 Checando tabela collections...');
    try {
        const rows = await db.all('SELECT * FROM collections');
        console.log('Rows:', rows);
    } catch (e) {
        console.error(e);
    }
}
check();

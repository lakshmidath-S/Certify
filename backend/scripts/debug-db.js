const { pool } = require('../src/db/pool');
const fs = require('fs');

async function debugDB() {
    const data = {};
    try {
        const users = await pool.query('SELECT id, email, role, status FROM users');
        data.users = users.rows;

        const wallets = await pool.query('SELECT * FROM wallets');
        data.wallets = wallets.rows;

        fs.writeFileSync('db_debug.json', JSON.stringify(data, null, 2));
        console.log('✅ DB debug data written to db_debug.json');
    } catch (e) {
        fs.writeFileSync('db_debug.json', JSON.stringify({ error: e.message }, null, 2));
    } finally {
        process.exit();
    }
}
debugDB();

const { pool } = require('../src/db/pool');
const fs = require('fs');

async function verify() {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        fs.writeFileSync('user_count.txt', result.rows[0].count.toString());
    } catch (e) {
        fs.writeFileSync('user_count.txt', 'error: ' + e.message);
    } finally {
        process.exit();
    }
}
verify();

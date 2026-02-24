const { pool } = require('../src/db/pool');

async function checkDatabase() {
    try {
        const result = await pool.query('SELECT email, role FROM users');
        console.log('👥 Current Users:');
        console.table(result.rows);
    } catch (error) {
        console.error('❌ Failed to check database:', error.message);
    } finally {
        process.exit();
    }
}

checkDatabase();

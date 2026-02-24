const { pool } = require('../src/db/pool');
const fs = require('fs');

async function run() {
    try {
        const res = await pool.query(`
            SELECT w.wallet_address, u.email 
            FROM wallets w 
            JOIN users u ON w.user_id = u.id
            WHERE u.email = 'admin@certify.com'
        `);

        let out = 'RESULT:\n';
        if (res.rows.length > 0) {
            res.rows.forEach(r => {
                out += `Wallet: ${r.wallet_address} -> Email: ${r.email}\n`;
            });
        } else {
            out += 'No mappings found for admin.';
        }
        fs.writeFileSync('mapping_status.txt', out);
    } catch (e) {
        fs.writeFileSync('mapping_status.txt', 'ERROR: ' + e.message);
    } finally {
        process.exit();
    }
}
run();

require('dotenv').config();
const db = require('./src/db/pool');

async function check() {
    try {
        console.log("--- USERS ---");
        const users = await db.query("SELECT id, email, role, status FROM users");
        console.table(users.rows);

        console.log("\n--- WALLETS ---");
        const wallets = await db.query("SELECT id, user_id, wallet_address, is_active FROM wallets");
        console.table(wallets.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();

const db = require('./src/db/pool');

async function check() {
    const address = '0x2565Cb3fBb1Ee78771F2b1C7316b5D632179f863'; // The address typically used
    console.log(`Checking mappings for ${address}...`);

    try {
        const result = await db.query(
            `
            SELECT w.id, w.wallet_address, w.is_active, u.id as user_id, u.email, u.role
            FROM wallets w
            JOIN users u ON w.user_id = u.id
            WHERE LOWER(w.wallet_address) = LOWER($1)
            `,
            [address]
        );

        console.table(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

check();

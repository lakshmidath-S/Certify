const db = require('./src/db/pool');

async function resetIssuerWallet() {
    try {
        const email = 'cet@certify.com'; // Adjust if using a different email
        console.log(`Resetting wallet state for ${email}...`);

        const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;

            // Delete any existing wallets for this user so they can map a new one cleanly
            await db.query('DELETE FROM wallets WHERE user_id = $1', [userId]);

            // Set user back to PENDING_WALLET
            await db.query(`UPDATE users SET status = 'PENDING_WALLET' WHERE id = $1`, [userId]);

            console.log(`✅ Cleared wallet mappings and reset status to PENDING_WALLET for ${email}`);
        } else {
            console.log(`User ${email} not found.`);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.end();
    }
}

resetIssuerWallet();

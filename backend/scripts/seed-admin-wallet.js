const { pool } = require('../src/db/pool');

async function seedAdminWallet() {
    try {
        const walletAddress = '0x2565cb3fbb1ee78771f2b1c7316b5d632179f863'.toLowerCase();
        const adminEmail = 'admin@certify.com';

        console.log(`🔗 Mapping admin wallet ${walletAddress} to ${adminEmail}...`);

        // 1. Get Admin User ID
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (userRes.rows.length === 0) {
            throw new Error(`Admin user ${adminEmail} not found in database.`);
        }
        const adminId = userRes.rows[0].id;

        // 2. Insert mapping into wallets table
        await pool.query(
            `INSERT INTO wallets (wallet_address, user_id, is_active)
             VALUES ($1, $2, true)
             ON CONFLICT (wallet_address) DO UPDATE SET user_id = $2, is_active = true`,
            [walletAddress, adminId]
        );

        console.log('✅ Admin wallet mapping restored!');

    } catch (error) {
        console.error('❌ Failed to seed admin wallet:', error.message);
    } finally {
        process.exit();
    }
}

seedAdminWallet();

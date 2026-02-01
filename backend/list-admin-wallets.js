const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function listAdminWallets() {
    try {
        console.log('\n📋 CERTIFY - Admin Wallets List\n');

        // Get admin user
        const adminResult = await pool.query(
            "SELECT id, email, role, first_name, last_name FROM users WHERE email = 'admin@certify.test' AND role = 'ADMIN'"
        );

        if (adminResult.rows.length === 0) {
            console.log('❌ Admin account not found');
            return;
        }

        const admin = adminResult.rows[0];
        console.log(`Admin Account: ${admin.email}`);
        console.log(`Name: ${admin.first_name || 'N/A'} ${admin.last_name || 'N/A'}`);
        console.log(`User ID: ${admin.id}\n`);

        // Get all wallets (using camelCase column names)
        const walletsResult = await pool.query(
            `SELECT 
                id,
                "walletAddress",
                "userId",
                "createdAt"
             FROM wallets
             WHERE "userId" = $1
             ORDER BY "createdAt" DESC`,
            [admin.id]
        );

        if (walletsResult.rows.length === 0) {
            console.log('⚠️  No wallets mapped to admin account\n');
            return;
        }

        console.log(`Total Wallets: ${walletsResult.rows.length}\n`);
        console.log('Wallet Details:');
        console.log('═══════════════════════════════════════════════════════════════════════════════');

        walletsResult.rows.forEach((wallet, index) => {
            console.log(`\n${index + 1}. Wallet`);
            console.log(`   Address:     ${wallet.walletAddress}`);
            console.log(`   Mapped:      ${wallet.createdAt}`);
            console.log(`   Wallet ID:   ${wallet.id}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════════════════════');
        console.log(`\n📊 Total: ${walletsResult.rows.length} wallet(s) mapped\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

listAdminWallets();

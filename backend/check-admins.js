const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkAdmins() {
    try {
        const result = await pool.query(
            "SELECT id, email, role, first_name, last_name FROM users WHERE role = 'ADMIN'"
        );

        console.log('\n📋 Admin users in database:');
        console.log('═══════════════════════════════════════════════════════════════');

        if (result.rows.length === 0) {
            console.log('❌ No admin users found\n');
            return;
        }

        result.rows.forEach((admin, i) => {
            console.log(`\n${i + 1}. ${admin.email}`);
            console.log(`   ID:   ${admin.id}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Name: ${admin.first_name || 'N/A'} ${admin.last_name || 'N/A'}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════');

        // Get wallets for each admin
        for (const admin of result.rows) {
            const wallets = await pool.query(
                'SELECT id, "walletAddress", "createdAt" FROM wallets WHERE "userId" = $1',
                [admin.id]
            );

            console.log(`\n💼 Wallets for ${admin.email}:`);
            if (wallets.rows.length === 0) {
                console.log('   ⚠️  No wallets mapped');
            } else {
                wallets.rows.forEach((w, i) => {
                    console.log(`   ${i + 1}. ${w.walletAddress} (${w.createdAt})`);
                });
            }
        }

        console.log('\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkAdmins();

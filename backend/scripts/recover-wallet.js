const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function recoverWallet() {
    try {
        console.log('\n🔧 CERTIFY - Recover Admin Wallet\n');
        console.log('This script adds a wallet to the database that was already mapped on blockchain.\n');

        // The wallet that was successfully mapped on blockchain
        const walletAddress = '0xfa258b9f026aca36000374c795f6656f370ac33e';
        const txHash = '0x251a11dd9a72e64445e3d192eefa83c6b12d6597b549f3d954adaf13c91c51b3';

        // Get admin account
        const adminResult = await pool.query(
            "SELECT id, email FROM users WHERE email = 'admin@certify.test' AND role = 'ADMIN'"
        );

        if (adminResult.rows.length === 0) {
            throw new Error('Admin account not found');
        }

        const adminUser = adminResult.rows[0];
        console.log(`✅ Found admin: ${adminUser.email}`);

        // Check if wallet already exists in DB
        const existing = await pool.query(
            'SELECT id FROM wallets WHERE "walletAddress" = $1',
            [walletAddress]
        );

        if (existing.rows.length > 0) {
            console.log('✅ Wallet already in database!');
            console.log(`   Wallet ID: ${existing.rows[0].id}`);
            return;
        }

        // Add to database
        console.log(`⏳ Adding wallet ${walletAddress} to database...`);

        const walletId = uuidv4();
        const result = await pool.query(
            `INSERT INTO wallets (id, "walletAddress", "userId")
             VALUES ($1, $2, $3)
             RETURNING id, "walletAddress", "createdAt"`,
            [walletId, walletAddress, adminUser.id]
        );

        const wallet = result.rows[0];

        console.log('\n✅ Wallet recovered successfully!\n');
        console.log('Details:');
        console.log('─────────────────────────────────────────────────');
        console.log(`Wallet ID:   ${wallet.id}`);
        console.log(`Address:     ${wallet.walletAddress}`);
        console.log(`User:        ${adminUser.email}`);
        console.log(`Created:     ${wallet.createdAt}`);
        console.log(`TX Hash:     ${txHash}`);
        console.log('─────────────────────────────────────────────────\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

recoverWallet();

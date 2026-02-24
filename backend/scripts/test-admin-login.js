const { ethers } = require('ethers');
const db = require('../src/db/pool');

const API_URL = 'http://localhost:3000/api';

async function testAdminLogin() {
    try {
        console.log('🚀 Starting Admin Wallet Login Test...');

        // 1. Get Admin User ID
        const adminRes = await db.query("SELECT id FROM users WHERE email = 'admin@certify.com'");
        if (adminRes.rows.length === 0) {
            throw new Error('Admin user not found');
        }
        const adminId = adminRes.rows[0].id;
        console.log(`✅ Found Admin ID: ${adminId}`);

        // 2. Create a Random Wallet
        const wallet = ethers.Wallet.createRandom();
        const walletAddress = wallet.address;
        console.log(`✅ Generated Test Wallet: ${walletAddress}`);

        // 3. Map Wallet to Admin in DB (Simulate manual mapping)
        await db.query(`
            INSERT INTO wallets (wallet_address, user_id, is_active)
            VALUES ($1, $2, true)
        `, [walletAddress, adminId]);
        console.log('✅ Mapped wallet to Admin in DB');

        // 4. Request Challenge
        console.log('🔄 Requesting challenge...');

        const challengeRes = await fetch(`${API_URL}/wallet-auth/challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress })
        });

        if (!challengeRes.ok) throw new Error(`Challenge failed: ${challengeRes.statusText}`);
        const challengeData = await challengeRes.json();
        const message = challengeData.message;
        console.log(`✅ Received Challenge: "${message}"`);

        // 5. Sign Message
        console.log('✍️  Signing message...');
        const signature = await wallet.signMessage(message);
        console.log('✅ Signature generated');

        // 6. Verify Signature & Login
        console.log('🔐 Verifying signature...');
        const verifyRes = await fetch(`${API_URL}/wallet-auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress,
                signature,
                message
            })
        });

        if (!verifyRes.ok) throw new Error(`Verify failed: ${verifyRes.statusText}`);
        const verifyData = await verifyRes.json();

        const { user, signingToken } = verifyData;

        if (user.role === 'ADMIN' && signingToken) {
            console.log('✅ Login Successful!');
            console.log('👤 User:', user.email, 'Role:', user.role);
            console.log('🔑 Token:', signingToken.substring(0, 20) + '...');
        } else {
            throw new Error('Login failed or invalid role');
        }

        // Cleanup
        await db.query("DELETE FROM wallets WHERE wallet_address = $1", [walletAddress]);
        console.log('🧹 Cleanup complete');

    } catch (error) {
        console.error('❌ Test Failed:', error);

        // Try to cleanup even on failure
        if (error.walletAddress) {
            await db.query("DELETE FROM wallets WHERE wallet_address = $1", [error.walletAddress]);
        }
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

testAdminLogin();

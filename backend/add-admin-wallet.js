const { Pool } = require('pg');
const { ethers } = require('ethers');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function addAdminWallet() {
    try {
        console.log('\n🔐 CERTIFY - Add Admin Wallet\n');
        console.log('This script maps a new wallet to the shared admin account.');
        console.log('Each admin uses the same email (admin@certify.test) but different wallets.\n');

        // Get admin account
        const adminResult = await pool.query(
            "SELECT id, email, role FROM users WHERE email = 'admin@certify.test' AND role = 'ADMIN'"
        );

        if (adminResult.rows.length === 0) {
            throw new Error('Admin account (admin@certify.test) not found in database');
        }

        const adminUser = adminResult.rows[0];
        console.log(`✅ Found admin account: ${adminUser.email} (ID: ${adminUser.id})\n`);

        // Get existing admin wallets
        const existingWallets = await pool.query(
            'SELECT "walletAddress", "createdAt" FROM wallets WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            [adminUser.id]
        );

        if (existingWallets.rows.length > 0) {
            console.log('📋 Existing admin wallets:');
            console.log('─────────────────────────────────────────────────────────────');
            existingWallets.rows.forEach((w, i) => {
                console.log(`${i + 1}. ${w.walletAddress}`);
            });
            console.log('─────────────────────────────────────────────────────────────\n');
        } else {
            console.log('⚠️  No wallets currently mapped to admin account.\n');
        }

        // Get new wallet details
        const walletAddress = await question('Enter new admin wallet address: ');
        const adminPrivateKey = await question('Enter admin private key (for blockchain tx): ');

        // Validate wallet address
        if (!ethers.isAddress(walletAddress)) {
            throw new Error('Invalid wallet address format');
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // Check if wallet already exists
        const existingWallet = await pool.query(
            'SELECT id, "userId" FROM wallets WHERE "walletAddress" = $1',
            [normalizedAddress]
        );

        if (existingWallet.rows.length > 0) {
            const existing = existingWallet.rows[0];
            if (existing.userId === adminUser.id) {
                throw new Error('This wallet is already mapped to the admin account');
            } else {
                throw new Error('This wallet is already mapped to another user');
            }
        }

        console.log('\n⏳ Connecting to blockchain...');

        // Setup blockchain connection
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

        console.log(`📝 Admin signer address: ${adminSigner.address}`);

        // Get WalletRegistry contract
        const walletRegistryAddress = process.env.CONTRACT_WALLET_REGISTRY;
        const walletRegistryABI = [
            'function mapWallet(address issuer) external',
            'function admin() external view returns (address)',
            'function isValidIssuer(address issuer) external view returns (bool)'
        ];

        const walletRegistry = new ethers.Contract(
            walletRegistryAddress,
            walletRegistryABI,
            adminSigner
        );

        // Verify signer is admin on contract
        console.log('⏳ Verifying admin permissions on contract...');
        const contractAdmin = await walletRegistry.admin();

        if (adminSigner.address.toLowerCase() !== contractAdmin.toLowerCase()) {
            throw new Error(`Signer ${adminSigner.address} is not the contract admin. Contract admin is: ${contractAdmin}`);
        }

        console.log('✅ Admin verification successful');

        // Map wallet on blockchain
        console.log(`⏳ Mapping wallet ${normalizedAddress} on blockchain...`);
        const tx = await walletRegistry.mapWallet(normalizedAddress);
        console.log(`📤 Transaction sent: ${tx.hash}`);

        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

        // Store in database (using camelCase column names)
        console.log('⏳ Storing wallet mapping in database...');

        // Generate UUID for id column (database doesn't auto-generate)
        const { v4: uuidv4 } = require('uuid');
        const walletId = uuidv4();

        const dbResult = await pool.query(
            `INSERT INTO wallets (id, "walletAddress", "userId")
             VALUES ($1, $2, $3)
             RETURNING id, "walletAddress", "createdAt"`,
            [walletId, normalizedAddress, adminUser.id]
        );

        const newWallet = dbResult.rows[0];

        console.log('\n✅ Admin wallet added successfully!\n');
        console.log('Wallet Details:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`Wallet ID:      ${newWallet.id}`);
        console.log(`Address:        ${newWallet.walletAddress}`);
        console.log(`User:           ${adminUser.email}`);
        console.log(`Role:           ${adminUser.role}`);
        console.log(`TX Hash:        ${tx.hash}`);
        console.log(`Block:          ${receipt.blockNumber}`);
        console.log(`Mapped At:      ${newWallet.createdAt}`);
        console.log('─────────────────────────────────────────────────────────────\n');
        console.log('🎉 This wallet can now be used for admin operations!\n');

        // Verify on blockchain
        const isValid = await walletRegistry.isValidIssuer(normalizedAddress);
        console.log(`🔍 Blockchain verification: ${isValid ? '✅ Valid issuer' : '❌ Not valid'}\n`);

    } catch (error) {
        console.error('\n❌ Error adding admin wallet:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

// Run the script
addAdminWallet();

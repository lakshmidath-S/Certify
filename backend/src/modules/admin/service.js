const db = require('../../db/pool');
const bcrypt = require('bcrypt');

// Admin creates issuer (organization)
async function createIssuer(adminUserId, issuerData) {
    const {
        institutionName,
        officialEmail,
        contactPerson,
        contactPhone,
        website,
        walletAddress,
        adminPrivateKey
    } = issuerData;

    // Validate admin
    const adminResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [adminUserId]
    );

    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
    }

    // Check if email already exists
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [officialEmail.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
    }

    // Generate robust temporary password (12 chars, alphanumeric)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let tempPassword = '';
    for (let i = 0; i < 12; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const normalizedEmail = officialEmail.toLowerCase().trim();

    // Create issuer user
    const userResult = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
     VALUES ($1, $2, $3, $4, 'ISSUER', 'PENDING_WALLET')
     RETURNING id, email, role`,
        [
            normalizedEmail,
            hashedPassword,
            institutionName,
            contactPerson || ''
        ]
    );

    const user = userResult.rows[0];

    // Note: Wallet mapping and activation now happen in Phase 1 Step 2 (Verification)
    // We don't map the wallet here to ensure the issuer proves ownership first.

    // Store institution metadata
    await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, result, metadata)
     VALUES ($1, 'ISSUER_CREATED', 'USER', 'SUCCESS', $2)`,
        [
            user.id,
            JSON.stringify({
                institutionName,
                contactPerson,
                contactPhone,
                website,
                walletAddress,
                createdBy: adminUserId
            })
        ]
    );

    return {
        user,
        tempPassword, // Send this securely to institution
        institutionName,
        message: 'Issuer created successfully. Wallet must be mapped separately.'
    };
}

// List all issuers (admin only)
async function listIssuers(adminUserId) {
    const adminResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [adminUserId]
    );

    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
    }

    const issuers = await db.query(
        `SELECT u.id, u.email, u.first_name as institution_name, u.status, u.created_at,
            w.wallet_address, w.is_active as wallet_active
     FROM users u
     LEFT JOIN wallets w ON u.id = w.user_id
     WHERE u.role = 'ISSUER'
     ORDER BY u.created_at DESC`
    );

    return issuers.rows;
}

async function suspendIssuer(issuerId) {
    const blockchain = require('../../config/blockchain');

    // 1. Fetch wallet for on-chain action
    const walletResult = await db.query(
        'SELECT wallet_address FROM wallets WHERE user_id = $1 AND is_active = true',
        [issuerId]
    );

    // 2. Update DB status
    await db.query(
        "UPDATE users SET status = 'SUSPENDED' WHERE id = $1",
        [issuerId]
    );

    // 3. Trigger on-chain suspension
    if (walletResult.rows.length > 0) {
        const walletAddress = walletResult.rows[0].wallet_address;
        console.log(`⛓️  Suspending issuer ${walletAddress} on-chain...`);
        await blockchain.suspendIssuerOnChain(walletAddress, blockchain.blockchainSigner);
    }

    return { success: true, message: 'Issuer suspended in DB and on-chain' };
}

async function reactivateIssuer(issuerId) {
    const blockchain = require('../../config/blockchain');

    // 1. Fetch wallet for on-chain action
    const walletResult = await db.query(
        'SELECT wallet_address FROM wallets WHERE user_id = $1 AND is_active = true',
        [issuerId]
    );

    // 2. Update DB status
    await db.query(
        "UPDATE users SET status = 'ACTIVE' WHERE id = $1",
        [issuerId]
    );

    // 3. Trigger on-chain reactivation
    if (walletResult.rows.length > 0) {
        const walletAddress = walletResult.rows[0].wallet_address;
        console.log(`⛓️  Reactivating issuer ${walletAddress} on-chain...`);
        await blockchain.reactivateIssuerOnChain(walletAddress, blockchain.blockchainSigner);
    }

    return { success: true, message: 'Issuer reactivated in DB and on-chain' };
}

async function reportCompromise(issuerId) {
    const blockchain = require('../../config/blockchain');

    // 1. Fetch wallet for on-chain action
    const walletResult = await db.query(
        'SELECT wallet_address FROM wallets WHERE user_id = $1 AND is_active = true',
        [issuerId]
    );

    // 2. Update DB status and compromise timestamp
    await db.query(
        "UPDATE users SET status = 'SUSPENDED', compromise_reported_at = NOW() WHERE id = $1",
        [issuerId]
    );

    // 3. Trigger on-chain suspension (as protection)
    if (walletResult.rows.length > 0) {
        const walletAddress = walletResult.rows[0].wallet_address;
        console.log(`⛓️  Reporting compromise: Suspending issuer ${walletAddress} on-chain...`);
        await blockchain.suspendIssuerOnChain(walletAddress, blockchain.blockchainSigner);
    }

    return { success: true, message: 'Compromise reported. Issuer suspended and timestamp recorded.' };
}

module.exports = {
    createIssuer,
    listIssuers,
    suspendIssuer,
    reactivateIssuer,
    reportCompromise
};

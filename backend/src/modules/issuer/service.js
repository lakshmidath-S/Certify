const crypto = require('crypto');
const { ethers } = require('ethers');
const db = require('../../db/pool');
const config = require('../../config/env');

async function generateVerificationNonce(userId) {
    // 1. Fetch user status
    const userResult = await db.query(
        'SELECT status FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const { status } = userResult.rows[0];

    // 2. Reject if status is not allowed
    if (status !== 'PENDING_WALLET' && status !== 'ACTIVE') {
        throw new Error(`Nonce generation rejected: Invalid status (${status})`);
    }

    // 3. Generate 32-byte cryptographically secure random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // 4. Store in DB
    await db.query(
        `UPDATE users 
         SET wallet_nonce = $1, nonce_expiry = $2, nonce_used = false 
         WHERE id = $3`,
        [nonce, expiry, userId]
    );

    return {
        nonce,
        expiry,
        message: `Certify Security: Authorize wallet mapping with nonce ${nonce}`
    };
}

async function verifyWalletSignature(userId, walletAddress, signature) {
    // 1. Fetch user data
    const userResult = await db.query(
        'SELECT wallet_nonce, nonce_expiry, nonce_used, status FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const { wallet_nonce, nonce_expiry, nonce_used, status } = userResult.rows[0];

    // 2. Security Validations
    if (!wallet_nonce) throw new Error('No nonce found for this user');
    if (nonce_used) throw new Error('Nonce already used');
    if (new Date() > new Date(nonce_expiry)) throw new Error('Nonce expired');

    // 3. Verify Signature using ethers
    // The message signed by the issuer is the full challenge string
    const expectedMessage = `Certify Security: Authorize wallet mapping with nonce ${wallet_nonce}`;
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Signature verification failed: Wallet mismatch');
    }

    // 4. Success: Mark as verified and clear nonce
    await db.query(
        `UPDATE users 
         SET status = 'VERIFIED', nonce_used = true, wallet_nonce = NULL 
         WHERE id = $1`,
        [userId]
    );

    // 5. Map wallet address in wallets table (if not exists)
    const walletResult = await db.query(
        `INSERT INTO wallets (wallet_address, user_id, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (wallet_address) DO UPDATE SET is_active = true
         RETURNING id`,
        [walletAddress.toLowerCase(), userId]
    );

    const walletId = walletResult.rows[0].id;

    // 6. ⛓️ Trigger On-Chain Registration (Phase 1 Step 3)
    try {
        const blockchain = require('../../config/blockchain');
        console.log(`⛓️  Registering issuer ${walletAddress} on blockchain...`);
        const txResult = await blockchain.registerIssuerOnChain(walletAddress, blockchain.blockchainSigner);

        // Update wallet with tx hash
        await db.query(
            `UPDATE wallets SET mapped_tx_hash = $1 WHERE id = $2`,
            [txResult.txHash, walletId]
        );

        // Final status: ACTIVE
        await db.query(
            `UPDATE users SET status = 'ACTIVE' WHERE id = $1`,
            [userId]
        );

        // Generate a signing token to return immediately
        const jwt = require('jsonwebtoken');
        const signingToken = jwt.sign(
            {
                type: 'signing',
                walletAddress: walletAddress.toLowerCase(),
                userId: userId,
                role: 'ISSUER'
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        return {
            success: true,
            message: 'Wallet verified and registered on-chain',
            txHash: txResult.txHash,
            signingToken: signingToken
        };
    } catch (bcError) {
        console.error('❌ On-chain registration failed:', bcError.message);
        // We keep user as VERIFIED so admin can retry or system can cron it
        return {
            success: true,
            message: 'Wallet verified locally, but on-chain registration pending',
            warning: bcError.message
        };
    }
}

async function issueCertificate(issuerId, metadata) {
    const blockchain = require('../../config/blockchain');
    const { hashMetadata } = require('../../utils/hashing');
    const { v4: uuidv4 } = require('uuid');

    // 1. Validate metadata fields
    const { recipientEmail, recipientName, courseName, issueDate } = metadata;
    if (!recipientEmail || !recipientName || !courseName) {
        throw new Error('Missing required certificate metadata fields');
    }

    // 2. Comprehensive Issuer Status Check
    const issuerResult = await db.query(
        'SELECT u.status, w.wallet_address FROM users u JOIN wallets w ON u.id = w.user_id WHERE u.id = $1 AND w.is_active = true',
        [issuerId]
    );

    if (issuerResult.rows.length === 0) {
        throw new Error('Active issuer wallet not found. Please verify your wallet first.');
    }

    const { status, wallet_address } = issuerResult.rows[0];

    // Status check
    if (status !== 'ACTIVE') {
        throw new Error(`Issuance rejected: Issuer status is ${status}. Must be ACTIVE.`);
    }

    // ⛓️ On-chain status check
    const isBCValid = await blockchain.isIssuerValidOnChain(wallet_address);
    if (!isBCValid) {
        throw new Error('Issuance rejected: Issuer is not active on blockchain.');
    }

    // 3. Deterministic Hashing (Phase 3 Hardening)
    // Add stable uniqueness components to metadata
    const enrichedMetadata = {
        ...metadata,
        id: uuidv4(),
        issuer_id: issuerId,
        issuer_wallet: wallet_address.toLowerCase(),
        nonce: uuidv4(),
        timestamp: Date.now()
    };

    const metadata_hash = hashMetadata(enrichedMetadata);

    // 4. Duplicate Check (Phase 5 Hardening)
    const duplicateCheck = await db.query(
        'SELECT id FROM certificates WHERE metadata_hash = $1',
        [metadata_hash]
    );

    if (duplicateCheck.rows.length > 0) {
        throw new Error('Issuance rejected: A certificate with this metadata already exists (Duplicate Hash)');
    }

    // 5. Store in Database
    const result = await db.query(
        `INSERT INTO certificates
         (id, recipient_email, recipient_name, course_name, issuer_id, metadata_hash, issued_at, certificate_hash, certificate_number, nonce, timestamp, additional_info)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            enrichedMetadata.id,
            enrichedMetadata.recipientEmail,
            enrichedMetadata.recipientName,
            enrichedMetadata.courseName,
            issuerId,
            metadata_hash,
            metadata_hash.substring(0, 64), // Using metadata_hash as placeholder for certificate_hash
            'CERT-' + Date.now().toString().slice(-8),
            enrichedMetadata.nonce,
            enrichedMetadata.timestamp,
            JSON.stringify(enrichedMetadata)
        ]
    );

    return result.rows[0];
}

module.exports = {
    generateVerificationNonce,
    verifyWalletSignature,
    issueCertificate
};

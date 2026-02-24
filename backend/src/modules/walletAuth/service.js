const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const db = require('../../db/pool');
const config = require('../../config/env');
const { isIssuerValidOnChain, walletRegistry } = require('../../config/blockchain');

/**
 * Generate wallet signing challenge
 */
async function generateChallenge(walletAddress) {
    if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const nonce = uuidv4();
    const challenge = `Sign this message to authorize certificate issuance: ${nonce}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 🔒 Always remove previous challenge (simple & safe)
    await db.query(
        'DELETE FROM wallet_challenges WHERE wallet_address = $1',
        [normalizedAddress]
    );

    // ✅ Insert fresh challenge (matches DB schema exactly)
    await db.query(
        `
        INSERT INTO wallet_challenges (wallet_address, challenge, nonce, expires_at)
        VALUES ($1, $2, $3, $4)
        `,
        [normalizedAddress, challenge, nonce, expiresAt]
    );

    return {
        message: challenge
    };
}

/**
 * Verify wallet signature and issue signing token
 */
async function verifySignature(walletAddress, signature, message) {
    if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const result = await db.query(
        `
        SELECT challenge, nonce, expires_at
        FROM wallet_challenges
        WHERE wallet_address = $1
        `,
        [normalizedAddress]
    );

    if (result.rows.length === 0) {
        throw new Error('No active challenge found');
    }

    const challengeRow = result.rows[0];

    if (new Date() > new Date(challengeRow.expires_at)) {
        await db.query(
            'DELETE FROM wallet_challenges WHERE wallet_address = $1',
            [normalizedAddress]
        );
        throw new Error('Challenge expired');
    }

    if (message !== challengeRow.challenge) {
        throw new Error('Invalid challenge message');
    }

    let recoveredAddress;
    try {
        recoveredAddress = ethers.verifyMessage(message, signature);
    } catch {
        throw new Error('Invalid signature');
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        throw new Error('Signature does not match wallet');
    }

    let user;

    // 🔍 1. CHECK DB MAPPING (Prioritize explicit mappings)
    try {
        const walletResult = await db.query(
            `
            SELECT user_id
            FROM wallets
            WHERE LOWER(wallet_address) = $1 AND is_active = true
            `,
            [normalizedAddress]
        );

        if (walletResult.rows.length > 0) {
            const userId = walletResult.rows[0].user_id;

            const userResult = await db.query(
                `
                SELECT id, email, role
                FROM users
                WHERE id = $1
                `,
                [userId]
            );

            if (userResult.rows.length > 0) {
                user = userResult.rows[0];
                console.log('✅ Authenticated via DB Mapping:', user.email);
            }
        }
    } catch (dbErr) {
        console.warn('⚠️ DB Mapping check failed:', dbErr.message);
    }

    // 👑 2. CHECK ON-CHAIN ADMIN (Fallback if no DB mapping found)
    if (!user) {
        try {
            // Check if user is an admin on the smart contract
            let isAdmin = false;
            try {
                isAdmin = await walletRegistry.isAdmin(normalizedAddress);
            } catch (err1) {
                try {
                    // Fallback to admins mapping
                    isAdmin = await walletRegistry.admins(normalizedAddress);
                } catch (err2) {
                    // Fallback to single admin() variable
                    const contractAdmin = await walletRegistry.admin();
                    isAdmin = (contractAdmin.toLowerCase() === normalizedAddress);
                }
            }

            if (isAdmin) {
                console.log('👑 Authenticated as On-Chain Admin:', normalizedAddress);

                // Get the system admin user profile
                const adminRes = await db.query("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1");

                if (adminRes.rows.length === 0) {
                    console.warn('⚠️ On-chain admin verified, but no ADMIN user found in DB');
                } else {
                    user = adminRes.rows[0];
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to check on-chain admin (non-critical):', error.message);
        }
    }

    if (!user) {
        throw new Error('Wallet not mapped or inactive, and not an on-chain admin');
    }

    // ✅ Allow ISSUER and ADMIN
    if (user.role !== 'ISSUER' && user.role !== 'ADMIN') {
        throw new Error('User is not authorized for wallet login');
    }

    // 🔗 Blockchain issuer check (ONLY for ISSUER)
    if (user.role === 'ISSUER') {
        const isValidIssuer = await isIssuerValidOnChain(normalizedAddress);
        if (!isValidIssuer) {
            throw new Error('Wallet is not a valid issuer on blockchain');
        }
    }

    const signingToken = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
            walletAddress: normalizedAddress,
            type: 'signing'
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    // 🧹 Cleanup challenge
    await db.query(
        'DELETE FROM wallet_challenges WHERE wallet_address = $1',
        [normalizedAddress]
    );

    // 🧾 Audit log
    await db.query(
        `
        INSERT INTO audit_logs
        (user_id, action, resource_type, resource_id, result, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
            user.id,
            'WALLET_SIGNATURE_VERIFIED',
            'WALLET',
            normalizedAddress,
            'SUCCESS',
            JSON.stringify({ signature: signature.slice(0, 20) + '...' })
        ]
    );

    return {
        signingToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            walletAddress: normalizedAddress
        }
    };
}

module.exports = {
    generateChallenge,
    verifySignature
};

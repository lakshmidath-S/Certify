const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const db = require('../../db/pool');
const config = require('../../config/env');
const { isIssuerValidOnChain } = require('../../config/blockchain');

async function generateChallenge(walletAddress) {
    if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
    }

    const nonce = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
        `INSERT INTO wallet_challenges (wallet_address, nonce, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet_address)
     DO UPDATE SET nonce = $2, expires_at = $3`,
        [walletAddress.toLowerCase(), nonce, expiresAt]
    );

    const message = `Sign this message to authorize certificate issuance: ${nonce}`;

    return { message, nonce };
}

async function verifySignature(walletAddress, signature, message) {
    if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const challengeResult = await db.query(
        'SELECT nonce, expires_at FROM wallet_challenges WHERE wallet_address = $1',
        [normalizedAddress]
    );

    if (challengeResult.rows.length === 0) {
        throw new Error('No challenge found for this wallet');
    }

    const challenge = challengeResult.rows[0];

    if (new Date() > new Date(challenge.expires_at)) {
        await db.query('DELETE FROM wallet_challenges WHERE wallet_address = $1', [normalizedAddress]);
        throw new Error('Challenge expired');
    }

    const expectedMessage = `Sign this message to authorize certificate issuance: ${challenge.nonce}`;
    if (message !== expectedMessage) {
        throw new Error('Invalid message format');
    }

    let recoveredAddress;
    try {
        recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
        throw new Error('Invalid signature');
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        throw new Error('Signature does not match wallet address');
    }

    const isValidIssuer = await isIssuerValidOnChain(walletAddress);
    if (!isValidIssuer) {
        throw new Error('Wallet is not a valid issuer on blockchain');
    }

    const walletResult = await db.query(
        'SELECT user_id FROM wallets WHERE wallet_address = $1 AND is_active = true',
        [normalizedAddress]
    );

    if (walletResult.rows.length === 0) {
        throw new Error('Wallet not mapped or inactive');
    }

    const userId = walletResult.rows[0].user_id;

    const userResult = await db.query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (user.role !== 'ISSUER') {
        throw new Error('Wallet owner is not an issuer');
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
        { expiresIn: '5m' }
    );

    await db.query('DELETE FROM wallet_challenges WHERE wallet_address = $1', [normalizedAddress]);

    await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, result, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            userId,
            'WALLET_SIGNATURE_VERIFIED',
            'WALLET',
            normalizedAddress,
            'SUCCESS',
            JSON.stringify({ signature: signature.substring(0, 20) + '...' })
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

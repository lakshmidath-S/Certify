const db = require('../../db/pool');
const { mapWalletOnChain, revokeWalletOnChain } = require('../../config/blockchain');

async function mapWallet(userId, walletAddress, adminSigner) {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const existingWallet = await client.query(
            'SELECT id FROM wallets WHERE wallet_address = $1',
            [walletAddress]
        );

        if (existingWallet.rows.length > 0) {
            throw new Error('Wallet already mapped');
        }

        const blockchainResult = await mapWalletOnChain(walletAddress, adminSigner);

        const result = await client.query(
            `INSERT INTO wallets (wallet_address, user_id, mapped_tx_hash, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
            [walletAddress, userId, blockchainResult.txHash]
        );

        await client.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                userId,
                'WALLET_MAPPED',
                'WALLET',
                walletAddress,
                'SUCCESS',
                JSON.stringify({ txHash: blockchainResult.txHash, blockNumber: blockchainResult.blockNumber })
            ]
        );

        await client.query('COMMIT');

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function revokeWallet(walletAddress, revokedBy, reason, adminSigner) {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const wallet = await client.query(
            'SELECT * FROM wallets WHERE wallet_address = $1 AND is_active = true',
            [walletAddress]
        );

        if (wallet.rows.length === 0) {
            throw new Error('Wallet not found or already revoked');
        }

        const blockchainResult = await revokeWalletOnChain(walletAddress, adminSigner);

        await client.query(
            `UPDATE wallets
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_tx_hash = $1
       WHERE wallet_address = $2`,
            [blockchainResult.txHash, walletAddress]
        );

        await client.query(
            `INSERT INTO revocations (revocation_type, wallet_id, revoked_by, reason, blockchain_tx_hash)
       VALUES ($1, $2, $3, $4, $5)`,
            ['WALLET', wallet.rows[0].id, revokedBy, reason, blockchainResult.txHash]
        );

        await client.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                revokedBy,
                'WALLET_REVOKED',
                'WALLET',
                walletAddress,
                'SUCCESS',
                JSON.stringify({ txHash: blockchainResult.txHash, reason })
            ]
        );

        await client.query('COMMIT');

        return { success: true, txHash: blockchainResult.txHash };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function getWalletByAddress(walletAddress) {
    const result = await db.query(
        `SELECT w.*, u.email, u.first_name, u.last_name
     FROM wallets w
     JOIN users u ON w.user_id = u.id
     WHERE w.wallet_address = $1`,
        [walletAddress]
    );

    return result.rows[0];
}

async function getWalletsByUserId(userId) {
    const result = await db.query(
        'SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );

    return result.rows;
}

module.exports = {
    mapWallet,
    revokeWallet,
    getWalletByAddress,
    getWalletsByUserId
};

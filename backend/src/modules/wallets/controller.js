const walletService = require('./service');
const { ethers } = require('ethers');

async function mapWallet(req, res) {
    try {
        const { walletAddress, userId, adminPrivateKey } = req.body;

        if (!walletAddress || !userId || !adminPrivateKey) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address, user ID, and admin private key are required'
            });
        }

        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const { provider } = require('../../config/blockchain');
        const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

        const wallet = await walletService.mapWallet(userId, walletAddress, adminSigner);

        res.status(201).json({
            success: true,
            wallet: {
                id: wallet.id,
                walletAddress: wallet.wallet_address,
                userId: wallet.user_id,
                txHash: wallet.mapped_tx_hash,
                mappedAt: wallet.mapped_at
            }
        });
    } catch (error) {
        console.error('Map wallet error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function revokeWallet(req, res) {
    try {
        const { walletAddress, reason, adminPrivateKey } = req.body;

        if (!walletAddress || !reason || !adminPrivateKey) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address, reason, and admin private key are required'
            });
        }

        const { provider } = require('../../config/blockchain');
        const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

        const result = await walletService.revokeWallet(
            walletAddress,
            req.user.id,
            reason,
            adminSigner
        );

        res.json({
            success: true,
            txHash: result.txHash
        });
    } catch (error) {
        console.error('Revoke wallet error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function getWallet(req, res) {
    try {
        const { address } = req.params;

        const wallet = await walletService.getWalletByAddress(address);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }

        res.json({
            success: true,
            wallet: {
                id: wallet.id,
                walletAddress: wallet.wallet_address,
                userId: wallet.user_id,
                userEmail: wallet.email,
                isActive: wallet.is_active,
                mappedAt: wallet.mapped_at,
                revokedAt: wallet.revoked_at
            }
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get wallet'
        });
    }
}

async function getUserWallets(req, res) {
    try {
        const wallets = await walletService.getWalletsByUserId(req.user.id);

        res.json({
            success: true,
            wallets: wallets.map(w => ({
                id: w.id,
                walletAddress: w.wallet_address,
                isActive: w.is_active,
                mappedAt: w.mapped_at,
                revokedAt: w.revoked_at
            }))
        });
    } catch (error) {
        console.error('Get user wallets error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get wallets'
        });
    }
}

module.exports = {
    mapWallet,
    revokeWallet,
    getWallet,
    getUserWallets
};

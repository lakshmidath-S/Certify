const walletService = require('./service');
const { ethers } = require('ethers');
const { adminSigner } = require('../../config/blockchain');

async function mapWallet(req, res) {
    try {
        const { walletAddress, userId } = req.body;

        if (!walletAddress || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address and user ID are required'
            });
        }

        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        if (!adminSigner) {
            return res.status(500).json({
                success: false,
                error: 'Server admin signer not configured. Check DEPLOYER_PRIVATE_KEY in .env'
            });
        }

        const wallet = await walletService.mapWallet(userId, walletAddress, adminSigner);

        res.status(201).json({
            success: true,
            wallet: {
                id: wallet.id,
                walletAddress: wallet.wallet_address,
                userId: wallet.user_id,
                txHash: wallet.mapped_tx_hash,
                mappedAt: wallet.created_at
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
        const { walletAddress, reason } = req.body;

        if (!walletAddress || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address and reason are required'
            });
        }

        if (!adminSigner) {
            return res.status(500).json({
                success: false,
                error: 'Server admin signer not configured. Check DEPLOYER_PRIVATE_KEY in .env'
            });
        }

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
                mappedAt: wallet.created_at,
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
                mappedAt: w.created_at,
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

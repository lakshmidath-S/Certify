const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../db/pool');

async function requireIssuerSignature(req, res, next) {
    try {
        // 🔐 Ensure normal auth ran first
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const signingToken = req.headers['issuer-signature-token'];

        if (!signingToken) {
            return res.status(401).json({
                success: false,
                error: 'Issuer signature token required'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(signingToken, config.jwt.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Signing token expired. Please sign again.'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid signing token'
            });
        }

        if (decoded.type !== 'signing') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token type'
            });
        }

        if (decoded.role !== 'ISSUER' && decoded.role !== 'ADMIN') {
            console.log(`[DEBUG] Signing token role mismatch: ${decoded.role}`);
            return res.status(403).json({
                success: false,
                error: 'Only issuers or admins can use signing tokens'
            });
        }

        if (decoded.userId !== req.user.id) {
            console.error(`[DEBUG] Token user mismatch: decoded.userId=${decoded.userId}, req.user.id=${req.user.id}`);
            return res.status(403).json({
                success: false,
                error: `Token user mismatch. Your active session (User ID: ${req.user.id}) does not match the wallet signature token (User ID: ${decoded.userId}). Try logging out and back in.`
            });
        }

        const walletResult = await db.query(
            `SELECT id FROM wallets
             WHERE wallet_address = $1
             AND user_id = $2
             AND is_active = true`,
            [decoded.walletAddress, decoded.userId]
        );

        if (walletResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Wallet not found or inactive'
            });
        }

        req.issuerWallet = {
            address: decoded.walletAddress,
            walletId: walletResult.rows[0].id
        };

        next();
    } catch (error) {
        console.error('Issuer signature middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Signature verification failed'
        });
    }
}

/* 🔥 THIS LINE IS CRITICAL */
module.exports = requireIssuerSignature;

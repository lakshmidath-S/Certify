const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../db/pool');

async function requireIssuerSignature(req, res, next) {
    try {
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

        if (decoded.role !== 'ISSUER') {
            return res.status(403).json({
                success: false,
                error: 'Only issuers can use signing tokens'
            });
        }

        if (decoded.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Token user mismatch'
            });
        }

        const walletResult = await db.query(
            'SELECT * FROM wallets WHERE \"walletAddress\" = $1 AND \"userId\" = $2',
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

module.exports = requireIssuerSignature;

const walletAuthService = require('./service');

const requestChallenge = async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required',
            });
        }

        // ✅ DELEGATE to service (handles UPSERT safely)
        const { message } = await walletAuthService.generateChallenge(walletAddress);

        return res.json({
            success: true,
            message, // frontend expects `message`
        });
    } catch (err) {
        console.error('REQUEST CHALLENGE ERROR:', err);
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }
};

const verifySignature = async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address, signature, and message are required',
            });
        }

        const result = await walletAuthService.verifySignature(
            walletAddress,
            signature,
            message
        );

        // 🛡️ Set httpOnly cookie (Phase 8 Hardening)
        res.cookie('token', result.signingToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        return res.json({
            success: true,
            signingToken: result.signingToken,
            user: result.user,
            expiresIn: '1h',
        });
    } catch (error) {
        console.error('Signature verification error:', error);
        return res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

module.exports = {
    requestChallenge,
    verifySignature,
};

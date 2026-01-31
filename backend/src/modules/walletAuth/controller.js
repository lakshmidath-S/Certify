const walletAuthService = require('./service');

async function requestChallenge(req, res) {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const result = await walletAuthService.generateChallenge(walletAddress);

        res.json({
            success: true,
            message: result.message,
            walletAddress: walletAddress.toLowerCase()
        });
    } catch (error) {
        console.error('Challenge generation error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function verifySignature(req, res) {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address, signature, and message are required'
            });
        }

        const result = await walletAuthService.verifySignature(walletAddress, signature, message);

        res.json({
            success: true,
            signingToken: result.signingToken,
            user: result.user,
            expiresIn: '5m'
        });
    } catch (error) {
        console.error('Signature verification error:', error);

        let statusCode = 400;
        if (error.message.includes('expired')) {
            statusCode = 401;
        } else if (error.message.includes('not a valid issuer') || error.message.includes('not mapped')) {
            statusCode = 403;
        }

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    requestChallenge,
    verifySignature
};

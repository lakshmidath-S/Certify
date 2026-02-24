const issuerService = require('./service');

async function requestWalletVerificationNonce(req, res) {
    try {
        const userId = req.user.id;
        const result = await issuerService.generateVerificationNonce(userId);

        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
}

async function verifyWalletSignature(req, res) {
    try {
        const userId = req.user.id;
        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({
                success: false,
                error: 'walletAddress and signature are required'
            });
        }

        const result = await issuerService.verifyWalletSignature(userId, walletAddress, signature);

        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
}

async function issueCertificate(req, res) {
    try {
        const issuerId = req.user.id;
        const metadata = req.body;

        const cert = await issuerService.issueCertificate(
            issuerId,
            metadata
        );

        res.status(201).json({
            success: true,
            certificate: cert
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
}

module.exports = {
    requestWalletVerificationNonce,
    verifyWalletSignature,
    issueCertificate
};

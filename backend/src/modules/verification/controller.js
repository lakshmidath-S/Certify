const verificationService = require('./service');

async function verifyHash(req, res) {
    try {
        const { hash } = req.body;

        if (!hash) {
            return res.status(400).json({
                success: false,
                error: 'Certificate hash is required'
            });
        }

        if (!/^[a-f0-9]{64}$/i.test(hash)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid hash format'
            });
        }

        const result = await verificationService.verifySingleCertificate(hash);

        res.json({
            success: true,
            verification: result
        });
    } catch (error) {
        console.error('Verify hash error:', error);
        res.status(500).json({
            success: false,
            error: 'Verification failed'
        });
    }
}

async function verifyBulk(req, res) {
    try {
        const { hashes } = req.body;

        if (!hashes || !Array.isArray(hashes)) {
            return res.status(400).json({
                success: false,
                error: 'Hashes array is required'
            });
        }

        if (hashes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one hash is required'
            });
        }

        if (hashes.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 hashes per request'
            });
        }

        const invalidHashes = hashes.filter(h => !/^[a-f0-9]{64}$/i.test(h));
        if (invalidHashes.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid hash format',
                invalidHashes
            });
        }

        const results = await verificationService.verifyBulkCertificates(hashes);

        const summary = {
            total: results.length,
            valid: results.filter(r => r.valid).length,
            invalid: results.filter(r => !r.valid && r.exists).length,
            notFound: results.filter(r => !r.exists).length
        };

        res.json({
            success: true,
            summary,
            results
        });
    } catch (error) {
        console.error('Verify bulk error:', error);
        res.status(500).json({
            success: false,
            error: 'Bulk verification failed'
        });
    }
}

module.exports = {
    verifyHash,
    verifyBulk
};

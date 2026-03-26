const verificationService = require('./service');
const { extractCertificateDataFromPDF } = require('../certificates/pdf');
const { canonicalizeJSON, generateSHA256 } = require('../certificates/hash');
const { verifyPdfSignature } = require('./verifySignature');

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

/**
 * Verify an uploaded certificate PDF.
 *
 * Secure flow:
 *   1. Extract embedded canonical JSON from PDF metadata
 *   2. Recompute SHA-256 hash from canonical JSON (never trust embedded hash)
 *   3. Verify computed hash against DB + blockchain
 *   4. Verify issuer wallet is authorized
 */
/**
 * Verify an uploaded certificate PDF.
 *
 * Secure flow: "Verify-then-Hydrate"
 *   1. Extract metadata and compute hash (Stateless)
 *   2. Check Blockchain (Truth)
 *   3. Hydrate from DB (Optional enrichment)
 */
async function verifyUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'PDF file is required'
            });
        }

        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are accepted'
            });
        }

        // Step 1: Verify PDF digital signature
        const sigResult = verifyPdfSignature(req.file.buffer);
        if (!sigResult.valid) {
            return res.status(400).json({
                success: false,
                verification: {
                    status: 'SIGNATURE_INVALID',
                    valid: false,
                    message: sigResult.reason || 'PDF digital signature is invalid or missing'
                }
            });
        }

        // Step 2-4: Use Stateless Service (Extract -> Re-hash -> Chain Check -> DB Hydrate)
        const result = await verificationService.verifyFileStateless(req.file.buffer);

        res.json({
            success: true,
            verification: result
        });
    } catch (error) {
        console.error('Verify upload error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Certificate verification failed'
        });
    }
}

module.exports = {
    verifyHash,
    verifyBulk,
    verifyUpload
};

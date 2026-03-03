const verificationService = require('./service');
const { extractCertificateDataFromPDF } = require('../certificates/pdf');
const { canonicalizeJSON, generateSHA256 } = require('../certificates/hash');

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
async function verifyUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'PDF file is required'
            });
        }

        // Only accept PDF files
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are accepted'
            });
        }

        // Step 1: Extract embedded certificate data from PDF metadata
        const certData = await extractCertificateDataFromPDF(req.file.buffer);

        if (!certData) {
            return res.json({
                success: true,
                verification: {
                    status: 'INVALID',
                    valid: false,
                    exists: false,
                    message: 'No certificate data found in PDF. This may not be a valid Certify certificate.'
                }
            });
        }

        // Validate required fields exist
        const requiredFields = ['ownerName', 'courseName', 'issuerWallet'];
        const missingFields = requiredFields.filter(f => !certData[f]);
        if (missingFields.length > 0) {
            return res.json({
                success: true,
                verification: {
                    status: 'INVALID',
                    valid: false,
                    exists: false,
                    message: `Invalid certificate data. Missing fields: ${missingFields.join(', ')}`
                }
            });
        }

        // Step 2: Recompute hash from extracted canonical JSON
        // NEVER trust any embedded hash — always recompute
        const canonical = canonicalizeJSON(certData);
        const canonicalJSON = JSON.stringify(canonical);
        const computedHash = generateSHA256(canonicalJSON);

        // Step 3: Verify computed hash against DB + blockchain
        const result = await verificationService.verifySingleCertificate(computedHash);

        // Step 4: Additional issuer wallet verification
        if (result.valid && certData.issuerWallet) {
            const issuerVerified = await verificationService.verifyIssuerWallet(certData.issuerWallet);
            if (!issuerVerified) {
                result.status = 'ISSUER_INVALID';
                result.valid = false;
                result.message = 'Issuer wallet is no longer authorized';
            }
        }

        res.json({
            success: true,
            verification: {
                ...result,
                hash: computedHash,
                certificateData: {
                    ownerName: certData.ownerName,
                    courseName: certData.courseName,
                    department: certData.department,
                    issueMonth: certData.issueMonth,
                    issueYear: certData.issueYear,
                    graduationMonth: certData.graduationMonth,
                    graduationYear: certData.graduationYear,
                }
            }
        });
    } catch (error) {
        console.error('Verify upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Certificate verification failed'
        });
    }
}

module.exports = {
    verifyHash,
    verifyBulk,
    verifyUpload
};

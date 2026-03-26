const db = require('../../db/pool');
const { verifyCertificateOnChain, isIssuerValidOnChain } = require('../../config/blockchain');
const { extractCertificateDataFromPDF } = require('../certificates/pdf');
const { generateCertificateHash } = require('../certificates/hash');

/**
 * Verify a certificate hash against Blockchain (Primary Truth) 
 * and optionally hydrate with Database data.
 */
async function verifySingleCertificate(hash) {
    // 1. Check Blockchain FIRST
    let chainResult;
    try {
        chainResult = await verifyCertificateOnChain(hash);
    } catch (error) {
        return {
            status: 'CHAIN_ERROR',
            exists: false,
            valid: false,
            message: 'Failed to verify on blockchain'
        };
    }

    if (!chainResult.exists) {
        return {
            status: 'NOT_ON_CHAIN',
            exists: false,
            valid: false,
            message: 'Certificate not found on blockchain'
        };
    }

    // 2. Check Database for hydration (Optional)
    const dbResult = await db.query(
        `SELECT c.*, w.wallet_address, w.is_active as wallet_active
     FROM certificates c
     LEFT JOIN wallets w ON c.issuer_wallet_id = w.id
     WHERE c.certificate_hash = $1`,
        [hash]
    ).catch(err => {
        console.warn('Database hydration failed (optional):', err.message);
        return { rows: [] };
    });

    const cert = dbResult.rows[0];

    // 3. Evaluate Validity based on Chain + (DB if present)
    if (cert && cert.is_revoked) {
        return {
            status: 'REVOKED',
            exists: true,
            valid: false,
            message: 'Certificate marked as revoked in database',
            revokedAt: cert.revoked_at,
            revocationReason: cert.revocation_reason
        };
    }

    if (chainResult.revoked) {
        return {
            status: 'REVOKED_ON_CHAIN',
            exists: true,
            valid: false,
            message: 'Certificate has been revoked on blockchain',
            revokedAt: chainResult.revokedAt
        };
    }

    // 4. Verify Issuer
    const issuerAddress = cert ? cert.wallet_address : chainResult.issuer;
    let issuerValid = false;
    try {
        issuerValid = await isIssuerValidOnChain(issuerAddress);
    } catch (error) {
        // Fallback to DB active flag if chain fails
        if (cert) issuerValid = cert.wallet_active;
    }

    if (!issuerValid) {
        return {
            status: 'ISSUER_INVALID',
            exists: true,
            valid: false,
            message: 'Issuer is no longer authorized on blockchain'
        };
    }

    // 5. Success
    return {
        status: 'VALID',
        exists: true,
        valid: true,
        message: 'Certificate is valid',
        certificate: cert ? {
            certificateNumber: cert.certificate_number,
            recipientName: cert.recipient_name,
            courseName: cert.course_name,
            issueDate: cert.issue_date,
            issuedAt: chainResult.issuedAt,
            txHash: cert.blockchain_tx_hash
        } : {
            // Minimal data from chain if DB is missing
            issuer: chainResult.issuer,
            issuedAt: chainResult.issuedAt
        }
    };
}

/**
 * Perform purely stateless verification from a PDF buffer.
 */
async function verifyFileStateless(pdfBuffer) {
    // 1. Extract metadata from PDF
    const certData = await extractCertificateDataFromPDF(pdfBuffer);
    if (!certData) {
        throw new Error('No certificate metadata found in PDF');
    }

    // 2. Recompute Hash
    const { hash } = generateCertificateHash(certData);

    // 3. Verify via Blockchain (Primary) and DB (Hydration)
    const result = await verifySingleCertificate(hash);

    // 4. Add extracted data if DB hydration failed
    if (result.valid && !result.certificate.recipientName) {
        result.certificateData = certData;
    }

    return {
        ...result,
        hash
    };
}

async function verifyBulkCertificates(hashes) {
    const results = await Promise.all(
        hashes.map(async (hash) => {
            try {
                const result = await verifySingleCertificate(hash);
                return { hash, ...result };
            } catch (error) {
                return {
                    hash,
                    status: 'ERROR',
                    exists: false,
                    valid: false,
                    message: error.message
                };
            }
        })
    );

    return results;
}

async function verifyIssuerWallet(walletAddress) {
    try {
        return await isIssuerValidOnChain(walletAddress);
    } catch (error) {
        console.error('Issuer wallet verification error:', error);
        return false;
    }
}

module.exports = {
    verifySingleCertificate,
    verifyBulkCertificates,
    verifyIssuerWallet,
    verifyFileStateless
};

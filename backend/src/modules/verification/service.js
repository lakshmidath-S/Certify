const db = require('../../db/pool');
const { verifyCertificateOnChain, isIssuerValidOnChain } = require('../../config/blockchain');

async function verifySingleCertificate(hash) {
    const dbResult = await db.query(
        `SELECT c.*, w.wallet_address, w.is_active as wallet_active
     FROM certificates c
     LEFT JOIN wallets w ON c.issuer_wallet_id = w.id
     WHERE c.certificate_hash = $1`,
        [hash]
    );

    if (dbResult.rows.length === 0) {
        return {
            status: 'NOT_FOUND',
            exists: false,
            valid: false,
            message: 'Certificate not found in database'
        };
    }

    const cert = dbResult.rows[0];

    let chainResult;
    try {
        chainResult = await verifyCertificateOnChain(hash);
    } catch (error) {
        return {
            status: 'CHAIN_ERROR',
            exists: true,
            valid: false,
            message: 'Failed to verify on blockchain'
        };
    }

    if (!chainResult.exists) {
        return {
            status: 'NOT_ON_CHAIN',
            exists: true,
            valid: false,
            message: 'Certificate not found on blockchain'
        };
    }

    if (cert.is_revoked) {
        return {
            status: 'REVOKED',
            exists: true,
            valid: false,
            message: 'Certificate has been revoked',
            revokedAt: cert.revoked_at,
            revocationReason: cert.revocation_reason
        };
    }

    if (!cert.wallet_active) {
        return {
            status: 'ISSUER_REVOKED',
            exists: true,
            valid: false,
            message: 'Issuer wallet has been revoked'
        };
    }

    let issuerValid;
    try {
        issuerValid = await isIssuerValidOnChain(cert.wallet_address);
    } catch (error) {
        return {
            status: 'CHAIN_ERROR',
            exists: true,
            valid: false,
            message: 'Failed to verify issuer on blockchain'
        };
    }

    if (!issuerValid) {
        return {
            status: 'ISSUER_INVALID',
            exists: true,
            valid: false,
            message: 'Issuer is no longer valid on blockchain'
        };
    }

    if (!chainResult.isValid) {
        return {
            status: 'INVALID_ON_CHAIN',
            exists: true,
            valid: false,
            message: 'Certificate is invalid on blockchain'
        };
    }

    return {
        status: 'VALID',
        exists: true,
        valid: true,
        message: 'Certificate is valid',
        certificate: {
            certificateNumber: cert.certificate_number,
            recipientName: cert.recipient_name,
            courseName: cert.course_name,
            issueDate: cert.issue_date,
            issuedAt: chainResult.issuedAt,
            txHash: cert.blockchain_tx_hash
        }
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

module.exports = {
    verifySingleCertificate,
    verifyBulkCertificates
};

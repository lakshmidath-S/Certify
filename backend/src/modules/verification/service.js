const db = require('../../db/pool');
const { verifyCertificateOnChain, isIssuerValidOnChain } = require('../../config/blockchain');

async function verifySingleCertificate(metadata_hash) {
    const { hashMetadata } = require('../../utils/hashing');
    const blockchain = require('../../config/blockchain');

    // 1. Fetch from Database (Step 1)
    const dbResult = await db.query(
        `SELECT c.*, u.status as issuer_status, u.compromise_reported_at
         FROM certificates c
         JOIN users u ON c.issuer_id = u.id
         WHERE c.metadata_hash = $1`,
        [metadata_hash]
    );

    if (dbResult.rows.length === 0) {
        return { status: 'NOT_FOUND', valid: false, message: 'Certificate not found in database' };
    }

    const cert = dbResult.rows[0];

    // 2. Fetch from Blockchain (Step 2)
    // We use the 32-byte hash (first 64 hex chars) for the blockchain lookup
    const chainHash = metadata_hash.startsWith('0x') ? metadata_hash.slice(2, 66) : metadata_hash.slice(0, 64);
    const chainResult = await blockchain.verifyCertificateOnChain(chainHash);

    if (!chainResult.exists) {
        return { status: 'NOT_ON_CHAIN', valid: false, message: 'Certificate not verified on blockchain' };
    }

    // 3. Compare Hash (Integrity Check) (Step 3)
    // Re-hash local metadata to detect DB tampering
    let localReHash;
    try {
        localReHash = hashMetadata(cert.additional_info);
    } catch (e) {
        return { status: 'DATA_TAMPERED', valid: false, message: 'Metadata canonicalization failed' };
    }

    if (localReHash !== metadata_hash) {
        return { status: 'DATA_TAMPERED', valid: false, message: 'Database metadata has been altered after issuance' };
    }

    // 4. Check Revocation status (Step 4)
    if (cert.is_revoked || chainResult.revoked) {
        return {
            status: 'REVOKED',
            valid: false,
            message: 'Certificate has been revoked',
            revokedAt: cert.revoked_at || (chainResult.revokedAt ? new Date(chainResult.revokedAt * 1000) : null)
        };
    }

    // 5. Check Issuer Suspension status (Step 5)
    if (cert.issuer_status === 'SUSPENDED') {
        return { status: 'ISSUER_SUSPENDED', valid: false, message: 'Issuing institution is currently suspended' };
    }

    // Double check on-chain issuer status
    const isIssuerActiveOnChain = await blockchain.isIssuerValidOnChain(chainResult.issuer);
    if (!isIssuerActiveOnChain) {
        return { status: 'ISSUER_SUSPENDED', valid: false, message: 'Issuer is not authorized or suspended on-chain' };
    }

    // 6. Check Issuer Compromise (Step 6)
    if (cert.compromise_reported_at && new Date(cert.issued_at) > new Date(cert.compromise_reported_at)) {
        return {
            status: 'ISSUER_COMPROMISED',
            valid: false,
            message: 'Certificate was issued after the issuer reported a wallet compromise'
        };
    }

    // SUCCESS
    return {
        status: 'VALID',
        valid: true,
        message: 'Certificate is authentic and valid',
        details: {
            recipientName: cert.recipient_name,
            courseName: cert.course_name,
            issuedAt: cert.issued_at,
            issuer: chainResult.issuer
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

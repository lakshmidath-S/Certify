const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/pool');
const { generateCertificateHash } = require('./hash');
const { generateQR } = require('./qr');
const { generatePDF } = require('./pdf');
const { storeCertificateHashOnChain, isIssuerValidOnChain } = require('../../config/blockchain');

const STORAGE_DIR = path.join(__dirname, '../../../storage/certificates');

async function ensureStorageDir() {
    try {
        await fs.access(STORAGE_DIR);
    } catch {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    }
}

async function issueCertificate(certificateData, issuerSigner, issuerWalletFromToken) {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');
        await ensureStorageDir();

        const {
            ownerName,
            ownerEmail,
            courseName,
            issuerId,
            ownerId
        } = certificateData;

        const issuerWalletResult = await client.query(
            'SELECT * FROM wallets WHERE id = $1 AND user_id = $2 AND is_active = true',
            [issuerWalletFromToken.walletId, issuerId]
        );

        if (issuerWalletResult.rows.length === 0) {
            throw new Error('Issuer wallet not found or inactive');
        }

        const issuerWallet = issuerWalletResult.rows[0];

        if (issuerWallet.wallet_address.toLowerCase() !== issuerWalletFromToken.address.toLowerCase()) {
            throw new Error('Wallet address mismatch');
        }

        const isValidOnChain = await isIssuerValidOnChain(issuerWallet.wallet_address);
        if (!isValidOnChain) {
            throw new Error('Issuer wallet revoked or invalid on blockchain');
        }

        const issuedAt = new Date().toISOString();

        const { hash, nonce } = generateCertificateHash({
            ownerName,
            ownerEmail,
            courseName,
            issuerId,
            issuerWallet: issuerWallet.wallet_address,
            issuedAt
        });

        const existingCert = await client.query(
            'SELECT id FROM certificates WHERE certificate_hash = $1',
            [hash]
        );

        if (existingCert.rows.length > 0) {
            throw new Error('Duplicate certificate hash');
        }

        const blockchainResult = await storeCertificateHashOnChain(hash, issuerSigner);

        const qrBuffer = await generateQR(hash);

        const issuerUserResult = await client.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [issuerId]
        );

        const issuerName = issuerUserResult.rows[0]
            ? `${issuerUserResult.rows[0].first_name} ${issuerUserResult.rows[0].last_name}`
            : 'Issuer';

        const pdfBuffer = await generatePDF({
            ownerName,
            courseName,
            issuerName,
            issuedAt,
            certificateHash: hash
        }, qrBuffer);

        const certificateId = uuidv4();
        const pdfFilename = `${certificateId}.pdf`;
        const pdfPath = path.join(STORAGE_DIR, pdfFilename);

        await fs.writeFile(pdfPath, pdfBuffer);

        const certResult = await client.query(
            `INSERT INTO certificates (
        id, certificate_hash, certificate_number, recipient_name, recipient_email,
        course_name, issue_date, issuer_id, owner_id, issuer_wallet_id,
        blockchain_tx_hash, nonce, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
            [
                certificateId,
                hash,
                `CERT-${Date.now()}`,
                ownerName,
                ownerEmail,
                courseName,
                issuedAt,
                issuerId,
                ownerId,
                issuerWallet.id,
                blockchainResult.txHash,
                nonce,
                Date.now()
            ]
        );

        await client.query(
            `INSERT INTO certificate_files (certificate_id, file_type, file_path, file_size_bytes, mime_type)
       VALUES ($1, $2, $3, $4, $5)`,
            [certificateId, 'PDF', pdfPath, pdfBuffer.length, 'application/pdf']
        );

        await client.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, result, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                issuerId,
                'CERTIFICATE_ISSUED',
                'CERTIFICATE',
                certificateId,
                'SUCCESS',
                JSON.stringify({ hash, txHash: blockchainResult.txHash })
            ]
        );

        await client.query('COMMIT');

        return {
            certificateId,
            hash,
            txHash: blockchainResult.txHash,
            certificate: certResult.rows[0]
        };
    } catch (error) {
        await client.query('ROLLBACK');

        await client.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, result, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                certificateData.issuerId,
                'CERTIFICATE_ISSUED',
                'CERTIFICATE',
                null,
                'FAILURE',
                error.message
            ]
        );

        throw error;
    } finally {
        client.release();
    }
}

async function getCertificatesByOwner(ownerId, limit = 50, offset = 0) {
    const result = await db.query(
        `SELECT c.*, i.email as issuer_email, i.first_name as issuer_first_name, i.last_name as issuer_last_name
     FROM certificates c
     JOIN users i ON c.issuer_id = i.id
     WHERE c.owner_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
        [ownerId, limit, offset]
    );

    return result.rows;
}

async function getCertificateById(certificateId, userId, userRole) {
    const result = await db.query(
        `SELECT c.*, 
            i.email as issuer_email, i.first_name as issuer_first_name, i.last_name as issuer_last_name,
            o.email as owner_email, o.first_name as owner_first_name, o.last_name as owner_last_name,
            w.wallet_address as issuer_wallet_address
     FROM certificates c
     JOIN users i ON c.issuer_id = i.id
     JOIN users o ON c.owner_id = o.id
     LEFT JOIN wallets w ON c.issuer_wallet_id = w.id
     WHERE c.id = $1`,
        [certificateId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const cert = result.rows[0];

    if (userRole !== 'ADMIN' && cert.owner_id !== userId) {
        throw new Error('Access denied');
    }

    return cert;
}

async function getCertificateFilePath(certificateId) {
    const result = await db.query(
        'SELECT file_path FROM certificate_files WHERE certificate_id = $1 AND file_type = $2',
        [certificateId, 'PDF']
    );

    return result.rows[0]?.file_path;
}

module.exports = {
    issueCertificate,
    getCertificatesByOwner,
    getCertificateById,
    getCertificateFilePath
};

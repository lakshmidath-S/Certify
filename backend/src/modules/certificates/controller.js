const fs = require('fs').promises;
const certificateService = require('./service');
const db = require('../../db/pool');

async function issueCertificate(req, res) {
    try {
        const {
            ownerName,
            ownerEmail,
            courseName,
            issuerPrivateKey
        } = req.body;

        // ✅ Basic validation
        if (!ownerName || !ownerEmail || !courseName || !issuerPrivateKey) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: ownerName, ownerEmail, courseName, issuerPrivateKey'
            });
        }

        // ✅ Wallet signature already verified by middleware
        if (!req.issuerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Issuer wallet signature required'
            });
        }

        // ⚠️ Initialize signer from private key
        // In a true enterprise system, keys should ideally be kept strictly on client side or in HSMs
        const { ethers } = require('ethers');
        const blockchainConfig = require('../../config/blockchain');
        let signer;
        try {
            signer = new ethers.Wallet(issuerPrivateKey, blockchainConfig.provider);
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Invalid issuer private key format'
            });
        }

        // 🔎 STEP 1: Resolve or create OWNER by email
        let ownerId;

        const userResult = await db.query(
            `SELECT id FROM users WHERE email = $1`,
            [ownerEmail]
        );

        if (userResult.rows.length > 0) {
            ownerId = userResult.rows[0].id;
        } else {
            // 🔒 Create OWNER placeholder (no password yet)
            const newUser = await db.query(
                `INSERT INTO users
                (id, email, role, status, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, 'OWNER', 'PENDING', NOW(), NOW())
                RETURNING id`,
                [ownerEmail]
            );

            ownerId = newUser.rows[0].id;
        }

        // 🚀 STEP 2: Issue certificate
        const result = await certificateService.issueCertificate(
            {
                ownerName,
                ownerEmail,
                courseName,
                issuerId: req.user.id,
                ownerId
            },
            signer,          // now initialized
            req.issuerWallet
        );

        res.status(201).json({
            success: true,
            certificateId: result.certificateId,
            hash: result.hash,
            txHash: result.txHash,
            message: 'Certificate issued successfully'
        });

    } catch (error) {
        console.error('Issue certificate error:', error);

        let statusCode = 400;
        let errorMessage = error.message;

        if (error.message.includes('Duplicate')) statusCode = 409;
        if (error.message.includes('revoked')) statusCode = 403;
        if (error.message.includes('blockchain')) {
            statusCode = 502;
            errorMessage = 'Blockchain transaction failed';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
}

async function getMyCertificates(req, res) {
    try {
        if (req.user.role !== 'OWNER') {
            return res.status(403).json({
                success: false,
                error: 'Only owners can access certificates'
            });
        }

        const certificates = await certificateService.getCertificatesByOwner(req.user.id);

        res.json({
            success: true,
            count: certificates.length,
            certificates
        });
    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch certificates'
        });
    }
}

async function downloadCertificate(req, res) {
    try {
        const { id } = req.params;

        const certificate = await certificateService.getCertificateById(
            id,
            req.user.id,
            req.user.role
        );

        if (!certificate) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found'
            });
        }

        // 🛡️ Integrity Check (Phase 6 Hardening)
        try {
            await certificateService.verifyCertificateIntegrity(id);
        } catch (integrityError) {
            console.error('Integrity Check Failed:', integrityError.message);
            return res.status(403).json({
                success: false,
                error: integrityError.message,
                code: 'INTEGRITY_FAILURE'
            });
        }

        const filePath = await certificateService.getCertificateFilePath(id);
        const fileBuffer = await fs.readFile(filePath);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="certificate-${certificate.certificate_number}.pdf"`
        );

        res.send(fileBuffer);
    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download certificate'
        });
    }
}

module.exports = {
    issueCertificate,
    getMyCertificates,
    downloadCertificate
};

const fs = require('fs').promises;
const certificateService = require('./service');
const { ethers } = require('ethers');

async function issueCertificate(req, res) {
    try {
        const {
            ownerName,
            ownerEmail,
            courseName,
            ownerId,
            issuerPrivateKey
        } = req.body;

        if (!ownerName || !courseName || !ownerId || !issuerPrivateKey) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: ownerName, courseName, ownerId, issuerPrivateKey'
            });
        }

        if (!req.issuerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Issuer wallet signature required'
            });
        }

        const { provider } = require('../../config/blockchain');
        const issuerSigner = new ethers.Wallet(issuerPrivateKey, provider);

        if (issuerSigner.address.toLowerCase() !== req.issuerWallet.address.toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'Private key does not match signed wallet address'
            });
        }

        const result = await certificateService.issueCertificate({
            ownerName,
            ownerEmail,
            courseName,
            issuerId: req.user.id,
            ownerId
        }, issuerSigner, req.issuerWallet);

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

        if (error.message.includes('not mapped')) {
            statusCode = 403;
        } else if (error.message.includes('revoked')) {
            statusCode = 403;
        } else if (error.message.includes('Duplicate')) {
            statusCode = 409;
        } else if (error.message.includes('blockchain') || error.message.includes('chain')) {
            statusCode = 502;
            errorMessage = 'Blockchain transaction failed';
        } else if (error.message.includes('PDF') || error.message.includes('QR')) {
            statusCode = 500;
            errorMessage = 'File generation failed';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
}

async function getMyCertificates(req, res) {
    try {
        const { limit = 50, offset = 0 } = req.query;

        if (req.user.role !== 'OWNER') {
            return res.status(403).json({
                success: false,
                error: 'Only owners can access this endpoint'
            });
        }

        const certificates = await certificateService.getCertificatesByOwner(
            req.user.id,
            parseInt(limit),
            parseInt(offset)
        );

        res.json({
            success: true,
            count: certificates.length,
            certificates: certificates.map(c => ({
                id: c.id,
                hash: c.certificate_hash,
                certificateNumber: c.certificate_number,
                recipientName: c.recipient_name,
                courseName: c.course_name,
                issueDate: c.issue_date,
                issuer: {
                    name: `${c.issuer_first_name} ${c.issuer_last_name}`,
                    email: c.issuer_email
                },
                isRevoked: c.is_revoked,
                createdAt: c.created_at
            }))
        });
    } catch (error) {
        console.error('Get my certificates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get certificates'
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

        const filePath = await certificateService.getCertificateFilePath(id);

        if (!filePath) {
            return res.status(404).json({
                success: false,
                error: 'Certificate file not found'
            });
        }

        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Certificate file does not exist'
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificate_number}.pdf"`);

        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
    } catch (error) {
        console.error('Download certificate error:', error);

        if (error.message === 'Access denied') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

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

const fs = require('fs').promises;
const certificateService = require('./service');
const { generatePDF } = require('./pdf');
const { generateQR } = require('./qr');

async function prepareCertificate(req, res) {
    try {
        const {
            ownerName, ownerEmail, courseName,
            department, issueMonth, issueYear,
            graduationMonth, graduationYear
        } = req.body;

        if (!ownerName || !courseName || !department || !issueMonth || !issueYear || !graduationMonth || !graduationYear) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: ownerName, courseName, department, issueMonth, issueYear, graduationMonth, graduationYear'
            });
        }

        if (!req.issuerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Issuer wallet signature required'
            });
        }

        const result = await certificateService.prepareCertificate({
            ownerName,
            ownerEmail,
            courseName,
            department,
            issueMonth,
            issueYear,
            graduationMonth,
            graduationYear,
            issuerId: req.user.id,
        }, req.issuerWallet);

        res.json({
            success: true,
            hash: result.hash,
        });
    } catch (error) {
        console.error('Prepare certificate error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function issueCertificate(req, res) {
    try {
        const {
            ownerName, ownerEmail, courseName,
            department, issueMonth, issueYear,
            graduationMonth, graduationYear,
            hash, txHash
        } = req.body;

        if (!ownerName || !courseName || !hash || !txHash || !department || !issueMonth || !issueYear || !graduationMonth || !graduationYear) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: ownerName, courseName, department, issueMonth, issueYear, graduationMonth, graduationYear, hash, txHash'
            });
        }

        if (!req.issuerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Issuer wallet signature required'
            });
        }

        const result = await certificateService.issueCertificate({
            ownerName,
            ownerEmail,
            courseName,
            department,
            issueMonth,
            issueYear,
            graduationMonth,
            graduationYear,
            hash,
            issuerId: req.user.id,
        }, txHash, req.issuerWallet);

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

        if (error.message.includes('not mapped')) statusCode = 403;
        else if (error.message.includes('revoked')) statusCode = 403;
        else if (error.message.includes('Duplicate')) statusCode = 409;
        else if (error.message.includes('blockchain') || error.message.includes('chain')) {
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
                additionalInfo: c.additional_info,
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

        // Try to read the file from disk first
        const filePath = await certificateService.getCertificateFilePath(id);
        let fileBuffer = null;

        if (filePath) {
            try {
                await fs.access(filePath);
                fileBuffer = await fs.readFile(filePath);
            } catch {
                // File doesn't exist on disk — will regenerate below
                console.log(`PDF file not found on disk (${filePath}), regenerating...`);
            }
        }

        // If file not on disk, regenerate PDF on the fly
        if (!fileBuffer) {
            const issuerName = certificate.issuer_first_name && certificate.issuer_last_name
                ? `${certificate.issuer_first_name} ${certificate.issuer_last_name}`
                : 'Issuer';

            // Extract new fields from additional_info JSONB
            const info = certificate.additional_info || {};

            // Regenerate canonical JSON for embedding as metadata
            const { generateCertificateHash } = require('./hash');
            const { canonicalJSON } = generateCertificateHash({
                ownerName: certificate.recipient_name,
                courseName: certificate.course_name,
                department: info.department || '',
                issueMonth: info.issueMonth || '',
                issueYear: info.issueYear || '',
                graduationMonth: info.graduationMonth || '',
                graduationYear: info.graduationYear || '',
                issuerWallet: certificate.issuer_wallet_address || '',
            });

            const qrBuffer = await generateQR(certificate.certificate_hash);
            fileBuffer = await generatePDF({
                ownerName: certificate.recipient_name,
                courseName: certificate.course_name,
                department: info.department || '',
                issueMonth: info.issueMonth || '',
                issueYear: info.issueYear || '',
                graduationMonth: info.graduationMonth || '',
                graduationYear: info.graduationYear || '',
                issuerName,
            }, qrBuffer, canonicalJSON);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificate_number}.pdf"`);
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

async function getIssuedCertificates(req, res) {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const certificates = await certificateService.getCertificatesByIssuer(
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
                recipientEmail: c.recipient_email,
                courseName: c.course_name,
                issueDate: c.issue_date,
                txHash: c.blockchain_tx_hash,
                additionalInfo: c.additional_info,
                createdAt: c.created_at
            }))
        });
    } catch (error) {
        console.error('Get issued certificates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get issued certificates'
        });
    }
}

module.exports = {
    prepareCertificate,
    issueCertificate,
    getMyCertificates,
    getIssuedCertificates,
    downloadCertificate
};

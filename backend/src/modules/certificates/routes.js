const express = require('express');
const router = express.Router();
const certificateController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const requireRole = require('../../middleware/roleMiddleware');
const requireIssuerSignature = require('../../middleware/requireIssuerSignature');

router.post('/prepare', authMiddleware, requireRole('ISSUER'), requireIssuerSignature, certificateController.prepareCertificate);
router.post('/issue', authMiddleware, requireRole('ISSUER'), requireIssuerSignature, certificateController.issueCertificate);
router.get('/issued', authMiddleware, requireRole('ISSUER'), certificateController.getIssuedCertificates);
router.get('/my', authMiddleware, requireRole('OWNER'), certificateController.getMyCertificates);
router.get('/:id/download', authMiddleware, requireRole('OWNER', 'ADMIN'), certificateController.downloadCertificate);

module.exports = router;

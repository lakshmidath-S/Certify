const express = require('express');
const router = express.Router();

const certificateController = require('./controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const requireIssuerSignature = require('../../middlewares/requireIssuerSignature');

// ISSUE CERTIFICATE (ISSUER only)
router.post(
    '/issue',
    authMiddleware,
    requireIssuerSignature,
    certificateController.issueCertificate // ✅ FUNCTION
);

// OWNER: get my certificates
router.get(
    '/my',
    authMiddleware,
    certificateController.getMyCertificates
);

// DOWNLOAD CERTIFICATE
router.get(
    '/:id/download',
    authMiddleware,
    certificateController.downloadCertificate
);

module.exports = router;

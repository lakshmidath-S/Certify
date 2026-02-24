const express = require('express');
const router = express.Router();

const issuerController = require('./controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const requireRole = require('../../middlewares/roleMiddleware');

router.get(
    '/wallet-verification-nonce',
    authMiddleware,
    issuerController.requestWalletVerificationNonce
);

router.post(
    '/verify-wallet-signature',
    authMiddleware,
    issuerController.verifyWalletSignature
);

router.post(
    '/issue-certificate',
    authMiddleware,
    requireRole('ISSUER'), // Note: verification logic might update this requirement
    issuerController.issueCertificate
);

module.exports = router;

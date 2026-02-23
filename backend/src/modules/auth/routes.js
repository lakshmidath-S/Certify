const express = require('express');
const router = express.Router();
const authController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-admin-wallet', authController.verifyAdminWallet);
router.post('/verify-issuer-wallet', authMiddleware, authController.verifyIssuerWallet);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;

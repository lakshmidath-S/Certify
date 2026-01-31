const express = require('express');
const router = express.Router();
const walletController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const requireRole = require('../../middleware/roleMiddleware');

router.post('/map', authMiddleware, requireRole('ADMIN'), walletController.mapWallet);
router.post('/revoke', authMiddleware, requireRole('ADMIN'), walletController.revokeWallet);
router.get('/my-wallets', authMiddleware, walletController.getUserWallets);
router.get('/:address', authMiddleware, walletController.getWallet);

module.exports = router;

const express = require('express');
const authRoutes = require('../modules/auth/routes');
const studentAuthRoutes = require('../modules/studentAuth/routes');
const adminRoutes = require('../modules/admin/routes');
const walletAuthRoutes = require('../modules/walletAuth/routes');
const walletRoutes = require('../modules/wallets/routes');
const certificateRoutes = require('../modules/certificates/routes');
const verificationRoutes = require('../modules/verification/routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/student-auth', studentAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/wallet-auth', walletAuthRoutes);
router.use('/wallets', walletRoutes);
router.use('/certificates', certificateRoutes);
router.use('/verify', verificationRoutes);

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'CERTIFY API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

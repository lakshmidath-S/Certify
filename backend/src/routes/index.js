const express = require('express');
const authRoutes = require('../modules/auth/routes');
const studentAuthRoutes = require('../modules/studentAuth/routes');
const adminRoutes = require('../modules/admin/routes');
const walletAuthRoutes = require('../modules/walletAuth/routes');
const walletRoutes = require('../modules/wallets/routes');
const certificateRoutes = require('../modules/certificates/routes');
const verificationRoutes = require('../modules/verification/routes');
const health = require('../health');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/student-auth', studentAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/wallet-auth', walletAuthRoutes);
router.use('/wallets', walletRoutes);
router.use('/certificates', certificateRoutes);
router.use('/verify', verificationRoutes);

router.get('/health', (req, res) => {
    const { databaseConnected, databaseError, databaseCheckedAt } = health.snapshot();

    // Always 200: this is a liveness probe. Reporting the database as unhealthy
    // here would make the host restart a process that is serving fine and would
    // only reconnect to the same unreachable database.
    res.json({
        success: true,
        message: 'CERTIFY API is running',
        database: databaseConnected ? 'connected' : 'disconnected',
        ...(databaseError && { databaseError }),
        ...(databaseCheckedAt && { databaseCheckedAt }),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

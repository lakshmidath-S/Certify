const express = require('express');

const authRoutes = require('../modules/auth/routes');
const studentAuthRoutes = require('../modules/studentAuth/routes');
const adminRoutes = require('../modules/admin/routes');
const walletAuthRoutes = require('../modules/walletAuth/routes');
const walletRoutes = require('../modules/wallets/routes');
const certificateRoutes = require('../modules/certificates/routes');
const verificationRoutes = require('../modules/verification/routes');
const healthRoutes = require('../modules/health/routes');
const issuerRoutes = require('../modules/issuer/routes');

const router = express.Router();

/* =======================
   AUTH ROUTES
======================= */
router.use('/auth', authRoutes);
router.use('/auth/student', studentAuthRoutes);

/* =======================
   WALLET AUTH (FIXED ✅)
   Matches frontend: /wallet-auth/*
======================= */
router.use('/wallet-auth', walletAuthRoutes);

/* =======================
   ROLE-BASED ROUTES
======================= */
router.use('/issuer', issuerRoutes);
router.use('/admin', adminRoutes);

/* =======================
   GENERAL ROUTES
======================= */
router.use('/certificates', certificateRoutes);
router.use('/verification', verificationRoutes);
router.use('/wallets', walletRoutes);
router.use('/health', healthRoutes);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('./controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const requireRole = require('../../middlewares/roleMiddleware');

router.post('/create-issuer', authMiddleware, requireRole('ADMIN'), adminController.createIssuer);
router.post('/suspend-issuer', authMiddleware, requireRole('ADMIN'), adminController.suspendIssuer);
router.post('/reactivate-issuer', authMiddleware, requireRole('ADMIN'), adminController.reactivateIssuer);
router.post('/report-compromise', authMiddleware, requireRole('ADMIN'), adminController.reportCompromise);
router.get('/list-issuers', authMiddleware, requireRole('ADMIN'), adminController.listIssuers);
router.get('/issuers', authMiddleware, requireRole('ADMIN'), adminController.listIssuers);

module.exports = router;

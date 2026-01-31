const express = require('express');
const router = express.Router();
const adminController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');
const requireRole = require('../../middleware/roleMiddleware');

router.post('/create-issuer', authMiddleware, requireRole('ADMIN'), adminController.createIssuer);
router.get('/issuers', authMiddleware, requireRole('ADMIN'), adminController.listIssuers);

module.exports = router;

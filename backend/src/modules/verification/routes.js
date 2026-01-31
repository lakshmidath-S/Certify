const express = require('express');
const router = express.Router();
const verificationController = require('./controller');

router.post('/hash', verificationController.verifyHash);
router.post('/bulk', verificationController.verifyBulk);

module.exports = router;

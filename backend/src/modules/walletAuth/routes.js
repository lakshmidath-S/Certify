const express = require('express');
const router = express.Router();
const walletAuthController = require('./controller');

router.post('/challenge', walletAuthController.requestChallenge);
router.post('/verify', walletAuthController.verifySignature);

module.exports = router;

const express = require('express');
const router = express.Router();
const studentAuthController = require('./controller');

router.post('/request-otp', studentAuthController.requestOTP);
router.post('/verify-otp', studentAuthController.verifyOTP);
router.post('/complete-registration', studentAuthController.completeRegistration);

module.exports = router;

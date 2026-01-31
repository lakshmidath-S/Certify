const express = require('express');
const router = express.Router();
const authController = require('./controller');
const authMiddleware = require('../../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;

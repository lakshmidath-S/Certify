const express = require('express');
const router = express.Router();
const healthController = require('./controller');

router.get('/', healthController.checkHealth);

module.exports = router;

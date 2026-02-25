const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificationController = require('./controller');

// Multer memory storage for PDF uploads (max 10MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are accepted'), false);
        }
    }
});

router.post('/hash', verificationController.verifyHash);
router.post('/bulk', verificationController.verifyBulk);
router.post('/upload', upload.single('certificate'), verificationController.verifyUpload);

module.exports = router;

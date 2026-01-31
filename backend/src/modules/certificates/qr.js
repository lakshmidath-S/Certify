const QRCode = require('qrcode');

async function generateQR(hash) {
    try {
        const qrBuffer = await QRCode.toBuffer(hash, {
            errorCorrectionLevel: 'H',
            type: 'png',
            width: 300,
            margin: 2
        });

        return qrBuffer;
    } catch (error) {
        console.error('QR generation error:', error);
        throw new Error('Failed to generate QR code');
    }
}

module.exports = {
    generateQR
};

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function generateCertificateHash(metadata) {
    const {
        ownerName,
        ownerEmail,
        courseName,
        issuerId,
        issuerWallet,
        issuedAt
    } = metadata;

    const nonce = uuidv4();

    const dataString = [
        ownerName,
        ownerEmail || '',
        courseName,
        issuerId,
        issuerWallet,
        issuedAt,
        nonce
    ].join('|');

    const hash = crypto
        .createHash('sha256')
        .update(dataString)
        .digest('hex');

    return {
        hash,
        nonce
    };
}

module.exports = {
    generateCertificateHash
};

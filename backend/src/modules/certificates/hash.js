const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a deterministic certificate hash from standardized fields.
 * Given the same inputs + nonce, the hash is reproducible for verification.
 *
 * Hash input fields (pipe-separated):
 *   ownerName | courseName | department | issueMonth/issueYear | graduationMonth/graduationYear | issuerId | issuerWallet | nonce
 */
function generateCertificateHash(metadata) {
    const {
        ownerName,
        courseName,
        department,
        issueMonth,
        issueYear,
        graduationMonth,
        graduationYear,
        issuerId,
        issuerWallet,
    } = metadata;

    const nonce = uuidv4();

    const dataString = [
        ownerName,
        courseName,
        department,
        `${issueMonth}/${issueYear}`,
        `${graduationMonth}/${graduationYear}`,
        issuerId,
        issuerWallet,
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

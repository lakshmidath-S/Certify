const crypto = require('crypto');

/**
 * Canonicalize a JSON object for deterministic hashing.
 * - Sorts keys alphabetically (recursively)
 * - Removes extra spaces
 * - Produces identical output for identical data regardless of key insertion order
 */
function canonicalizeJSON(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => canonicalizeJSON(item));
    }

    const sortedKeys = Object.keys(obj).sort();
    const sorted = {};
    for (const key of sortedKeys) {
        sorted[key] = canonicalizeJSON(obj[key]);
    }
    return sorted;
}

/**
 * Generate SHA-256 hash of a string.
 */
function generateSHA256(str) {
    return crypto
        .createHash('sha256')
        .update(str, 'utf8')
        .digest('hex');
}

/**
 * Build the canonical certificate data object from metadata.
 * Only includes the fields that define the certificate identity.
 */
function buildCertificateData(metadata) {
    const {
        ownerName,
        courseName,
        department,
        issueMonth,
        issueYear,
        graduationMonth,
        graduationYear,
        issuerWallet,
    } = metadata;

    return {
        ownerName: String(ownerName || ''),
        courseName: String(courseName || ''),
        department: String(department || ''),
        issueMonth: String(issueMonth || ''),
        issueYear: String(issueYear || ''),
        graduationMonth: String(graduationMonth || ''),
        graduationYear: String(graduationYear || ''),
        issuerWallet: String(issuerWallet || ''),
    };
}

/**
 * Generate a deterministic certificate hash from structured metadata.
 *
 * Steps:
 *   1. Build structured certificate data object
 *   2. Canonicalize (sort keys alphabetically)
 *   3. Deterministic JSON.stringify
 *   4. SHA-256 hash
 *
 * Returns: { hash, canonicalJSON, certificateData }
 */
function generateCertificateHash(metadata) {
    const certData = buildCertificateData(metadata);
    const canonical = canonicalizeJSON(certData);
    const canonicalJSON = JSON.stringify(canonical);
    const hash = generateSHA256(canonicalJSON);

    return {
        hash,
        canonicalJSON,
        certificateData: certData
    };
}

module.exports = {
    canonicalizeJSON,
    generateSHA256,
    buildCertificateData,
    generateCertificateHash
};

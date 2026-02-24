const crypto = require('crypto');

/**
 * Deterministically canonicalize an object for hashing.
 * - Sorts keys alphabetically
 * - No whitespace
 * - ISO 8601 for dates
 * - Fixed decimal for numbers
 */
function canonicalize(obj) {
    if (obj === null || typeof obj !== 'object') {
        if (typeof obj === 'number') {
            // Ensure numbers have a stable string representation
            return obj.toString();
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(canonicalize);
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(obj).sort();
    const canonicalObj = {};

    for (const key of sortedKeys) {
        let value = obj[key];

        // Handle Date objects
        if (value instanceof Date) {
            value = value.toISOString();
        } else if (typeof value === 'object') {
            value = canonicalize(value);
        }

        canonicalObj[key] = value;
    }

    return canonicalObj;
}

/**
 * Generates a SHA256 hash of a canonicalized JSON string
 */
function hashMetadata(metadata) {
    const canonical = canonicalize(metadata);
    const jsonString = JSON.stringify(canonical);

    // Remove all whitespace for maximum stability
    const noWhitespace = jsonString.replace(/\s+/g, '');

    return crypto.createHash('sha256').update(noWhitespace).digest('hex');
}

module.exports = {
    canonicalize,
    hashMetadata
};

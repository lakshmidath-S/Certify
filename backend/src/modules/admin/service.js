const db = require('../../db/pool');
const bcrypt = require('bcrypt');

// Admin creates issuer (organization)
async function createIssuer(adminUserId, issuerData) {
    const {
        institutionName,
        officialEmail,
        contactPerson,
        contactPhone,
        website,
        walletAddress,
        adminPrivateKey
    } = issuerData;

    // Validate admin
    const adminResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [adminUserId]
    );

    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
    }

    // Check if email already exists
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [officialEmail.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create issuer user
    const userResult = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, 'ISSUER', true)
     RETURNING id, email, role`,
        [
            officialEmail.toLowerCase(),
            hashedPassword,
            institutionName,
            contactPerson || ''
        ]
    );

    const user = userResult.rows[0];

    // Store institution metadata (you may want a separate institutions table)
    // For now, we'll use audit logs to track this
    await db.query(
        `INSERT INTO audit_logs ("userId", action, "resourceType", result, metadata)
     VALUES ($1, 'ISSUER_CREATED', 'USER', 'SUCCESS', $2)`,
        [
            user.id,
            JSON.stringify({
                institutionName,
                contactPerson,
                contactPhone,
                website,
                walletAddress,
                createdBy: adminUserId
            })
        ]
    );

    return {
        user,
        tempPassword, // Send this securely to institution
        institutionName,
        message: 'Issuer created successfully. Wallet must be mapped separately.'
    };
}

// List all issuers (admin only)
async function listIssuers(adminUserId) {
    const adminResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [adminUserId]
    );

    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
    }

    const issuers = await db.query(
        `SELECT u.id, u.email, u."firstName" as institution_name, u."createdAt",
            w."walletAddress"
     FROM users u
     LEFT JOIN wallets w ON u.id = w."userId"
     WHERE u.role = 'ISSUER'
     ORDER BY u."createdAt" DESC`
    );

    return issuers.rows;
}

module.exports = {
    createIssuer,
    listIssuers
};

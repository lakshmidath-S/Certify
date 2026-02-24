const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db/pool');
const config = require('../../config/env');

/**
 * LOGIN
 * Works for ADMIN, ISSUER, OWNER, VERIFIER
 */
async function login(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[DEBUG] Attempting login for: "${normalizedEmail}"`);

    const result = await db.query(
        `
        SELECT
            id,
            email,
            password_hash,
            role,
            status,
            first_name,
            last_name
        FROM users
        WHERE email = $1
        `,
        [normalizedEmail]
    );

    if (result.rows.length === 0) {
        console.log(`[DEBUG] User not found: "${normalizedEmail}"`);
        throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE' && user.status !== 'PENDING_WALLET') {
        throw new Error(`Account is not active (Status: ${user.status})`);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            firstName: user.first_name,
            lastName: user.last_name
        }
    };
}

module.exports = { login };

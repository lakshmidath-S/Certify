const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/pool');
const config = require('../../config/env');

async function register(userData) {
    const { email, password, role, firstName, lastName } = userData;

    // ENFORCE: Only OWNER role allowed via public registration
    // ADMIN, ISSUER, VERIFIER cannot register through this endpoint
    if (role && role !== 'OWNER') {
        throw new Error('Invalid registration. Students only. Institutions contact admin.');
    }

    const userId = uuidv4();
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name)
     VALUES ($1, $2, 'OWNER', $4, $5)
     RETURNING id, email, role, first_name, last_name, created_at`,
        [email, passwordHash, firstName, lastName]
    );

    return result.rows[0];
}

async function login(email, password) {
    const result = await db.query(
        `SELECT id, email, password_hash, role, status, first_name, last_name
     FROM users
     WHERE email = $1`,
        [email]
    );

    if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    if (user.status && user.status !== 'active') {
        throw new Error('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
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
            firstName: user.first_name,
            lastName: user.last_name
        }
    };
}

async function getUserById(userId) {
    const result = await db.query(
        `SELECT id, email, role, first_name, last_name, status, created_at
     FROM users
     WHERE id = $1`,
        [userId]
    );

    return result.rows[0];
}

module.exports = {
    register,
    login,
    getUserById
};

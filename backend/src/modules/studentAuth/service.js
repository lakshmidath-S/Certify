const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/pool');
const config = require('../../config/env');

/**
 * STEP 1: Request OTP
 * Rules:
 * - Email MUST exist in certificates
 * - User MUST NOT already exist
 */
async function requestOTP(email) {
    // 1. Certificate must exist
    const certCheck = await db.query(
        'SELECT 1 FROM certificates WHERE owner_email = $1',
        [email]
    );

    if (certCheck.rows.length === 0) {
        throw new Error('No certificate issued for this email');
    }

    // 2. User must not exist
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('User already registered. Please login.');
    }

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query(
        `
        INSERT INTO student_otps (email, otp, verified, created_at)
        VALUES ($1, $2, false, NOW())
        ON CONFLICT (email)
        DO UPDATE SET otp = $2, verified = false, created_at = NOW()
        `,
        [email, otp]
    );

    return {
        message: 'OTP sent to registered email',
        otp // ⚠️ DEV ONLY
    };
}

/**
 * STEP 2: Verify OTP
 */
async function verifyOTP(email, otp) {
    const result = await db.query(
        `
        SELECT otp, created_at
        FROM student_otps
        WHERE email = $1
        `,
        [email]
    );

    if (result.rows.length === 0) {
        throw new Error('OTP not requested');
    }

    const record = result.rows[0];

    // Optional: expiry check (10 mins)
    const age = Date.now() - new Date(record.created_at).getTime();
    if (age > 10 * 60 * 1000) {
        throw new Error('OTP expired');
    }

    if (record.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    await db.query(
        `UPDATE student_otps SET verified = true WHERE email = $1`,
        [email]
    );

    return { message: 'OTP verified' };
}

/**
 * STEP 3: Complete Registration
 */
async function completeRegistration(email, password, firstName, lastName) {
    await db.query('BEGIN');

    try {
        // 1. OTP must be verified
        const otpCheck = await db.query(
            `
            SELECT verified FROM student_otps
            WHERE email = $1
            `,
            [email]
        );

        if (
            otpCheck.rows.length === 0 ||
            otpCheck.rows[0].verified !== true
        ) {
            throw new Error('OTP verification required');
        }

        // 2. Create user
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        await db.query(
            `
            INSERT INTO users
            (id, email, password_hash, role, first_name, last_name, status)
            VALUES ($1, $2, $3, 'OWNER', $4, $5, 'ACTIVE')
            `,
            [userId, email, passwordHash, firstName, lastName]
        );

        // 3. Link certificates
        await db.query(
            `
            UPDATE certificates
            SET owner_id = $1
            WHERE owner_email = $2
            `,
            [userId, email]
        );

        // 4. Cleanup OTP
        await db.query(
            `DELETE FROM student_otps WHERE email = $1`,
            [email]
        );

        await db.query('COMMIT');

        const token = jwt.sign(
            { userId, email, role: 'OWNER' },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        return {
            accessToken: token,
            user: {
                id: userId,
                email,
                role: 'OWNER'
            }
        };
    } catch (err) {
        await db.query('ROLLBACK');
        throw err;
    }
}

module.exports = {
    requestOTP,
    verifyOTP,
    completeRegistration
};

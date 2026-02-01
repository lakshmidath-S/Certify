const db = require('../../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request OTP for student email
async function requestOTP(email) {
    if (!email || !email.includes('@')) {
        throw new Error('Valid email required');
    }

    // Check if user already exists
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('Email already registered. Please login.');
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP (upsert)
    await db.query(
        `INSERT INTO student_otp (email, otp, expires_at, verified)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (email)
     DO UPDATE SET otp = $2, expires_at = $3, verified = false`,
        [email.toLowerCase(), otp, expiresAt]
    );

    // TODO: Send OTP via email service
    // For now, return OTP in response (DEVELOPMENT ONLY)
    console.log(`OTP for ${email}: ${otp}`);

    return {
        message: 'OTP sent to email',
        email: email.toLowerCase(),
        // REMOVE IN PRODUCTION:
        otp: otp
    };
}

// Verify OTP
async function verifyOTP(email, otp) {
    const result = await db.query(
        `SELECT * FROM student_otp 
     WHERE email = $1 AND otp = $2 AND expires_at > NOW() AND verified = false`,
        [email.toLowerCase(), otp]
    );

    if (result.rows.length === 0) {
        throw new Error('Invalid or expired OTP');
    }

    // Mark as verified
    await db.query(
        'UPDATE student_otp SET verified = true WHERE email = $1',
        [email.toLowerCase()]
    );

    return {
        message: 'OTP verified successfully',
        email: email.toLowerCase()
    };
}

// Complete registration after OTP verification
async function completeRegistration(email, password, firstName, lastName) {
    // Check if OTP was verified
    const otpResult = await db.query(
        'SELECT * FROM student_otp WHERE email = $1 AND verified = true',
        [email.toLowerCase()]
    );

    if (otpResult.rows.length === 0) {
        throw new Error('Email not verified. Please verify OTP first.');
    }

    // Check if user already exists
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with OWNER role
    const userResult = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, 'OWNER', true)
     RETURNING id, email, first_name, last_name, role`,
        [email.toLowerCase(), hashedPassword, firstName, lastName]
    );

    const user = userResult.rows[0];

    // Delete OTP record
    await db.query('DELETE FROM student_otp WHERE email = $1', [email.toLowerCase()]);

    // Generate JWT token
    const accessToken = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    // Log registration
    await db.query(
        `INSERT INTO audit_logs (\"userId\", action, \"resourceType\", result)
     VALUES ($1, 'STUDENT_REGISTERED', 'USER', 'SUCCESS')`,
        [user.id]
    );

    return {
        accessToken,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
        }
    };
}

module.exports = {
    requestOTP,
    verifyOTP,
    completeRegistration
};

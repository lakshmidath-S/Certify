require('dotenv').config();
const { pool } = require('../src/db/pool');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const USERS = [
    {
        email: 'admin@certify.com',
        password: 'admin123',
        role: 'ADMIN',
        firstName: 'System',
        lastName: 'Admin'
    },
    {
        email: 'issuer@certify.com',
        password: 'issuer123',
        role: 'ISSUER',
        firstName: 'University',
        lastName: 'Issuer'
    },
    {
        email: 'student@certify.com',
        password: 'student123',
        role: 'OWNER',
        firstName: 'Alice',
        lastName: 'Student'
    },
    {
        email: 'verifier@certify.com',
        password: 'verifier123',
        role: 'VERIFIER',
        firstName: 'Global',
        lastName: 'Verifier'
    }
];

async function seedUsers() {
    try {
        console.log('🌱 Seeding users...');

        for (const user of USERS) {
            const existing = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
            const passwordHash = await bcrypt.hash(user.password, 10);

            if (existing.rows.length > 0) {
                console.log(`Updating existing user: ${user.email} (${user.role})`);
                await pool.query(
                    `UPDATE users 
                     SET password_hash = $1, role = $2, first_name = $3, last_name = $4, status = 'active'
                     WHERE email = $5`,
                    [passwordHash, user.role, user.firstName, user.lastName, user.email]
                );
            } else {
                console.log(`Creating new user: ${user.email} (${user.role})`);
                await pool.query(
                    `INSERT INTO users (id, email, password_hash, role, first_name, last_name, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())`,
                    [uuidv4(), user.email, passwordHash, user.role, user.firstName, user.lastName]
                );
            }
        }

        console.log('✅ Seeding complete.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

seedUsers();

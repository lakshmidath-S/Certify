require('dotenv').config();
const { pool } = require('../src/db/pool');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function seedAdmin() {
    try {
        const email = 'admin@certify.com';
        const password = 'admin123';
        const role = 'ADMIN';

        console.log(`Checking for existing admin user: ${email}`);

        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        const passwordHash = await bcrypt.hash(password, 10);

        if (existing.rows.length > 0) {
            console.log('Admin user exists. Updating password...');
            await pool.query(
                'UPDATE users SET password_hash = $1, role = $2, status = $3 WHERE email = $4',
                [passwordHash, role, 'active', email]
            );
            console.log('Admin user updated.');
        } else {
            console.log('Creating new admin user...');
            await pool.query(
                `INSERT INTO users (id, email, password_hash, role, first_name, last_name, status)
                 VALUES ($1, $2, $3, $4, 'System', 'Admin', 'active')`,
                [uuidv4(), email, passwordHash, role]
            );
            console.log('Admin user created.');
        }

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

seedAdmin();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixConstraint() {
    console.log('--- DB CONSTRAINT UPDATE START ---');
    try {
        // 1. Drop existing constraint
        console.log('Dropping old constraint users_status_check...');
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');

        // 2. Add new constraint including PENDING_WALLET
        console.log('Adding new constraint with PENDING_WALLET...');
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_status_check 
            CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_WALLET', 'VERIFIED', 'DELETED'))
        `);

        console.log('✅ Constraint updated successfully');
        console.log('--- DB CONSTRAINT UPDATE SUCCESS ---');
    } catch (err) {
        console.error('--- DB CONSTRAINT UPDATE FAILURE ---');
        console.error(err);
    } finally {
        await pool.end();
    }
}

fixConstraint();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
});

async function forceFix() {
    console.log('--- DB CONSTRAINT FORCE UPDATE START ---');
    const client = await pool.connect();
    try {
        // 1. Terminate other connections to release locks
        console.log('Terminating other database connections...');
        await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = current_database() AND pid <> pg_backend_pid();
        `);
        console.log('✅ Other connections terminated.');

        // 2. Drop existing constraint
        console.log('Dropping old constraint users_status_check...');
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');

        // 3. Add new constraint including PENDING_WALLET
        console.log('Adding new constraint with PENDING_WALLET...');
        await client.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_status_check 
            CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_WALLET', 'VERIFIED', 'DELETED'))
        `);

        console.log('✅ Constraint updated successfully');
        console.log('--- DB CONSTRAINT FORCE UPDATE SUCCESS ---');
        process.exit(0);
    } catch (err) {
        console.error('--- DB CONSTRAINT FORCE UPDATE FAILURE ---');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

forceFix();

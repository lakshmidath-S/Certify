const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    console.log('--- DB SCHEMA UPDATE START ---');
    try {
        // 1. Check current column lengths
        const res = await pool.query(`
            SELECT column_name, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'status'
        `);

        if (res.rows.length > 0) {
            console.log(`Current status column length: ${res.rows[0].character_maximum_length}`);

            if (res.rows[0].character_maximum_length < 50) {
                console.log('Updating status column to VARCHAR(50)...');
                await pool.query('ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(50)');
                console.log('✅ status column updated');
            }
        }

        // 2. Ensure role is also sufficient if needed (though ISSUER is short)
        await pool.query('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20)');

        console.log('--- DB SCHEMA UPDATE SUCCESS ---');
    } catch (err) {
        console.error('--- DB SCHEMA UPDATE FAILURE ---');
        console.error(err);
    } finally {
        await pool.end();
    }
}

migrate();

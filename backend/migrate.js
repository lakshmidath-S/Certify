
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            const sqlPath = path.join(__dirname, 'schema.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');
            console.log('Running schema migration...');
            await client.query(sql);
            console.log('Migration completed successfully.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();

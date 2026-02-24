const { pool } = require('../src/db/pool');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting Database Reset...');

        await client.query('BEGIN');

        // 1. Drop all tables (Cascade to handle dependencies)
        const tables = [
            'revocations',
            'audit_logs',
            'certificate_files',
            'certificates',
            'wallets',
            'users'
        ];

        for (const table of tables) {
            console.log(`🗑️  Dropping table: ${table}...`);
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // 2. Read and execute schema.sql
        console.log('📜 Reading schema.sql...');
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('🏗️  Recreating schema...');
        await client.query(schema);

        await client.query('COMMIT');
        console.log('✅ Database Reset Successful!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database Reset Failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

resetDatabase();

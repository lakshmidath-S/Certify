const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
    try {
        const result = await pool.query(`
            SELECT column_name, column_default, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'wallets' 
            ORDER BY ordinal_position
        `);

        console.log('\nWallets table schema:');
        console.log('═══════════════════════════════════════════════════════════════');
        result.rows.forEach(c => {
            console.log(`Column: ${c.column_name}`);
            console.log(`  Type: ${c.data_type}`);
            console.log(`  Default: ${c.column_default || 'none'}`);
            console.log(`  Nullable: ${c.is_nullable}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();

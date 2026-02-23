const db = require('./src/db/pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running student_otp table migration...');

        const sql = fs.readFileSync(
            path.join(__dirname, 'sql', 'student_otp.sql'),
            'utf8'
        );

        await db.query(sql);

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();

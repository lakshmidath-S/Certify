require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetDatabase() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Dropping all tables...');
        await client.query(`
            DROP TABLE IF EXISTS revocations CASCADE;
            DROP TABLE IF EXISTS audit_logs CASCADE;
            DROP TABLE IF EXISTS certificate_files CASCADE;
            DROP TABLE IF EXISTS certificates CASCADE;
            DROP TABLE IF EXISTS wallets CASCADE;
            DROP TABLE IF EXISTS wallet_challenges CASCADE;
            DROP TABLE IF EXISTS student_otp CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);
        console.log('✅ All tables dropped.');

        console.log('📦 Applying schema...');
        const schemaPath = path.join(__dirname, '../schema.sql');
        let schema = fs.readFileSync(schemaPath, 'utf8');

        // Remove the default admin INSERT from schema (we'll handle it below with a real hash)
        schema = schema.replace(
            /-- Insert default admin user[\s\S]*?;\s*$/m,
            ''
        );

        await client.query(schema);
        console.log('✅ Schema applied.');

        // Seed admin users with real bcrypt hashes
        const admins = [
            {
                email: 'admin@certify.com',
                password: 'Admin@123',
                first_name: 'System',
                last_name: 'Administrator',
            },
        ];

        console.log('👤 Seeding admin users...');
        for (const admin of admins) {
            const hash = await bcrypt.hash(admin.password, 10);
            await client.query(
                `INSERT INTO users (email, password_hash, role, first_name, last_name)
                 VALUES ($1, $2, 'ADMIN', $3, $4)`,
                [admin.email, hash, admin.first_name, admin.last_name]
            );
            console.log(`   ✅ Admin created: ${admin.email} / password: ${admin.password}`);
        }

        console.log('\n🎉 Database reset complete!');
    } catch (err) {
        console.error('❌ Reset failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

resetDatabase();

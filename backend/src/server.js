const app = require('./app');
const config = require('./config/env');
const db = require('./db/pool');
const PORT = config.server.port;

async function startServer() {
    try {
        await db.query('SELECT NOW()');
        console.log('✅ Database connected successfully');

        // Automatic schema migration for status constraint
        try {
            console.log('🔄 Checking database constraints...');
            await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');
            await db.query(`
                ALTER TABLE users 
                ADD CONSTRAINT users_status_check 
                CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_WALLET', 'VERIFIED', 'DELETED'))
            `);
            console.log('✅ Database constraints updated successfully');
        } catch (migErr) {
            console.warn('⚠️  Failed to run automatic DB migration (might be locked, or already applied):', migErr.message);
        }

        // 🛠️ FORCE RESET ISSUER STATE
        try {
            console.log('🔄 Forcing test issuer wallet reset...');
            const userRes = await db.query("SELECT id FROM users WHERE email = 'cet@certify.com'");
            if (userRes.rows.length > 0) {
                const userId = userRes.rows[0].id;
                await db.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
                await db.query(`UPDATE users SET status = 'PENDING_WALLET' WHERE id = $1`, [userId]);
                console.log('✅ Successfully reset cet@certify.com to PENDING_WALLET state.');
            }
        } catch (resetErr) {
            console.warn('⚠️  Failed to reset test issuer wallet state:', resetErr.message);
        }

        // 🛠️ FORCE RESET ISSUER STATE
        try {
            console.log('🔄 Forcing test issuer wallet reset...');
            const userRes = await db.query("SELECT id FROM users WHERE email = 'cet@certify.com'");
            if (userRes.rows.length > 0) {
                const userId = userRes.rows[0].id;
                await db.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
                await db.query(`UPDATE users SET status = 'PENDING_WALLET' WHERE id = $1`, [userId]);
                console.log('✅ Successfully reset cet@certify.com to PENDING_WALLET state.');
            }
        } catch (resetErr) {
            console.warn('⚠️  Failed to reset test issuer wallet state:', resetErr.message);
        }

        app.listen(PORT, () => {
            console.log(`\n🚀 CERTIFY Backend Server`);
            console.log(`📍 Running on: http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${config.server.env}`);
            console.log(`⛓️  Blockchain: ${config.blockchain.rpcUrl}`);
            console.log(`📝 WalletRegistry: ${config.blockchain.walletRegistryAddress}`);
            console.log(`📜 CertRegistry: ${config.blockchain.certRegistryAddress}`);
            console.log(`\n✨ Server is ready to accept requests\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown (no pool.end because you didn't export it)
process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nSIGTERM received, shutting down...');
    process.exit(0);
});

startServer();

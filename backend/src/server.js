const app = require('./app');
const config = require('./config/env');
const { pool } = require('./db/pool');

const PORT = config.server.port;

async function startServer() {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');

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

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT received, closing server...');
    await pool.end();
    process.exit(0);
});

startServer();

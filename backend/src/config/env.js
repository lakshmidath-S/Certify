require('dotenv').config();

const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'RPC_URL',
    'CONTRACT_WALLET_REGISTRY',
    'CONTRACT_CERT_REGISTRY'
];

function validateEnv() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(varName => console.error(`  - ${varName}`));
        console.error('\nPlease check your .env file');
        process.exit(1);
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.error('❌ JWT_SECRET must be at least 32 characters long');
        process.exit(1);
    }
}

validateEnv();

module.exports = {
    database: {
        url: process.env.DATABASE_URL
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    },
    blockchain: {
        rpcUrl: process.env.RPC_URL,
        walletRegistryAddress: process.env.CONTRACT_WALLET_REGISTRY,
        certRegistryAddress: process.env.CONTRACT_CERT_REGISTRY
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    }
};

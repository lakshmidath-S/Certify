require('./config/loadEnv');
const app = require('./app');
const config = require('./config/env');
const { pool, ssl } = require('./db/pool');
const health = require('./health');

const PORT = config.server.port;
const HOST = process.env.HOST || '0.0.0.0';

const DB_CONNECT_ATTEMPTS = Number(process.env.DB_CONNECT_ATTEMPTS) || 5;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verify the database in the background, with backoff.
 *
 * This used to run before app.listen() and exit(1) on the first failure, which
 * made two deploy problems indistinguishable: a genuinely wrong DATABASE_URL,
 * and a managed Postgres that was merely still waking up. On a host that waits
 * for the process to bind a port, the second case failed the whole deploy with
 * a port-scan timeout rather than a database error. The port now opens first,
 * so the platform sees a live service and the logs say what is actually wrong.
 */
async function verifyDatabase() {
    for (let attempt = 1; attempt <= DB_CONNECT_ATTEMPTS; attempt++) {
        try {
            await pool.query('SELECT NOW()');
            health.setDatabase(true);
            console.log(`✅ Database connected (TLS ${ssl ? 'on' : 'off'})`);
            return true;
        } catch (error) {
            health.setDatabase(false, error.message);
            const last = attempt === DB_CONNECT_ATTEMPTS;
            console.error(
                `❌ Database connection attempt ${attempt}/${DB_CONNECT_ATTEMPTS} failed: ${error.message}`
            );

            if (last) {
                console.error(
                    '   The server is listening but every request that touches the database ' +
                    'will fail. Check DATABASE_URL, and whether the provider requires TLS ' +
                    '(append ?sslmode=require, or set DATABASE_SSL=true).'
                );
                return false;
            }

            await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
        }
    }

    return false;
}

function startServer() {
    const server = app.listen(PORT, HOST, () => {
        console.log(`\n🚀 CERTIFY Backend Server`);
        console.log(`📍 Listening on: ${HOST}:${PORT}`);
        console.log(`🌍 Environment: ${config.server.env}`);
        console.log(`⛓️  Blockchain: ${config.blockchain.rpcUrl}`);
        console.log(`📝 WalletRegistry: ${config.blockchain.walletRegistryAddress}`);
        console.log(`📜 CertRegistry: ${config.blockchain.certRegistryAddress}`);
        console.log(`\n✨ Server is ready to accept requests\n`);
    });

    server.on('error', (error) => {
        console.error('❌ Failed to bind the HTTP server:', error.message);
        process.exit(1);
    });

    // Hosted proxies keep connections alive longer than Node's defaults, which
    // shows up as sporadic 502s on an otherwise healthy service.
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 125000;

    verifyDatabase();

    return server;
}

const server = startServer();

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n${signal} received, closing server...`);

    // Force exit if a request or the pool refuses to drain.
    const force = setTimeout(() => process.exit(0), 10000);
    force.unref();

    server.close(async () => {
        try {
            await pool.end();
        } catch (error) {
            console.error('Error closing the database pool:', error.message);
        }
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

const { Pool } = require('pg');
const config = require('../config/env');

/**
 * Decide TLS from the connection string, not from NODE_ENV.
 *
 * Keying this off `NODE_ENV === 'production'` meant a host that did not set
 * NODE_ENV (or set it to anything else) fell back to `ssl: false`, so a
 * DATABASE_URL without an `sslmode` parameter connected in the clear, every
 * managed Postgres refused it, and the server exited at boot. Managed providers
 * all require TLS and several present certificates that do not chain to a root
 * Node ships with, hence `rejectUnauthorized: false`.
 *
 * Precedence: DATABASE_SSL env -> sslmode/ssl in the URL -> host is not local.
 */
function resolveSsl(connectionString) {
    const override = (process.env.DATABASE_SSL || '').trim().toLowerCase();
    if (override === 'false' || override === 'disable' || override === '0') return false;
    if (override === 'true' || override === 'require' || override === '1') {
        return { rejectUnauthorized: false };
    }

    let url;
    try {
        url = new URL(connectionString);
    } catch {
        // Unparseable (e.g. a key=value libpq string) — assume a remote host.
        return { rejectUnauthorized: false };
    }

    const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase();
    if (sslmode === 'disable') return false;
    if (sslmode) return { rejectUnauthorized: false };

    const ssl = (url.searchParams.get('ssl') || '').toLowerCase();
    if (ssl === 'false' || ssl === '0') return false;
    if (ssl === 'true' || ssl === '1') return { rejectUnauthorized: false };

    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(url.hostname);
    return isLocal ? false : { rejectUnauthorized: false };
}

/**
 * Strip the TLS parameters once they have been read.
 *
 * pg merges a parsed connection string OVER the options object
 * (`Object.assign({}, config, parse(connectionString))`), so a URL carrying
 * `sslmode=` silently wins against the `ssl` option below — including the
 * `rejectUnauthorized: false` that providers with an untrusted chain need, and
 * including an explicit DATABASE_SSL override. Removing the parameters here
 * makes `resolveSsl` the single decision point.
 */
function stripSslParams(connectionString) {
    try {
        const url = new URL(connectionString);
        url.searchParams.delete('sslmode');
        url.searchParams.delete('ssl');
        return url.toString();
    } catch {
        return connectionString;
    }
}

const ssl = resolveSsl(config.database.url);

const pool = new Pool({
    connectionString: stripSslParams(config.database.url),
    ssl,
    // Hosted Postgres closes idle connections; keep the pool from handing out
    // dead sockets, and fail a hung connect instead of hanging the request.
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 15000,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
    max: Number(process.env.DB_POOL_MAX) || 10
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        if (config.server.env === 'development') {
            console.log('Executed query', { text, duration, rows: res.rowCount });
        }

        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query;
    const originalRelease = client.release;

    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);

    client.query = (...args) => {
        return originalQuery.apply(client, args);
    };

    client.release = () => {
        clearTimeout(timeout);
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease.apply(client);
    };

    return client;
}

module.exports = {
    query,
    getClient,
    pool,
    ssl
};

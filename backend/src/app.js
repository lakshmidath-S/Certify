const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

// Render (and every other PaaS) terminates TLS at a proxy. Without this,
// req.protocol is 'http' and req.ip is the proxy's address.
app.set('trust proxy', 1);

/**
 * Allowed browser origins.
 *
 * Set FRONTEND_URL (or CORS_ORIGINS, comma-separated, for preview deployments)
 * to the exact deployed frontend origin — scheme + host, no path, no trailing
 * slash. Leaving both unset keeps the previous behaviour of allowing every
 * origin, so an existing deployment does not break on upgrade; it is logged as
 * a warning because it is not what you want long-term.
 */
function parseAllowedOrigins() {
    const raw = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
        .filter(Boolean)
        .join(',');

    return raw
        .split(',')
        .map(origin => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

if (allowedOrigins.length === 0 && isProduction) {
    console.warn(
        '⚠️  CORS is open to every origin. Set FRONTEND_URL to the deployed ' +
        'frontend origin (e.g. https://certify-frontend.vercel.app) to restrict it.'
    );
}

const corsOptions = {
    origin(origin, callback) {
        // No Origin header: curl, health checks, server-to-server. Always allowed.
        if (!origin || allowedOrigins.length === 0) return callback(null, true);

        const normalized = origin.replace(/\/+$/, '');
        if (allowedOrigins.includes(normalized)) return callback(null, true);

        console.warn(`Blocked CORS request from origin: ${origin}`);
        return callback(null, false);
    },
    // The axios client sends the signing token in a custom header, which makes
    // every issuance request preflighted.
    allowedHeaders: ['Content-Type', 'Authorization', 'Issuer-Signature-Token'],
    // Without this the browser hides the header and the download loses its filename.
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Liveness endpoints outside /api as well, so any host health-check path works.
const liveness = (req, res) => res.json({
    success: true,
    service: 'certify-backend',
    status: 'ok',
    timestamp: new Date().toISOString()
});

app.get('/', liveness);
app.get('/health', liveness);

app.use('/api', routes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer rejects oversized or non-PDF uploads with an error that would
    // otherwise surface as an opaque 500.
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'File is larger than 10MB' });
    }
    if (err.message === 'Only PDF files are accepted') {
        return res.status(415).json({ success: false, error: err.message });
    }

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(!isProduction && { stack: err.stack })
    });
});

module.exports = app;

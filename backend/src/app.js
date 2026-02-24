const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const routes = require('./routes');

// Optional Security Dependencies (Phase 8 Hardening)
let cookieParser;
try {
    cookieParser = require('cookie-parser');
} catch (e) {
    console.warn('⚠️  cookie-parser not found. httpOnly cookies will not be parsed.');
}

let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch (e) {
    console.warn('⚠️  express-rate-limit not found. Rate limiting is disabled.');
}

const app = express();

// 1. 🛡️ Trust Proxy (if behind Heroku/Nginx)
app.set('trust proxy', 1);

// 2. 🍪 Cookie Parsing
if (cookieParser) {
    app.use(cookieParser());
}

// 3. 🚦 Rate Limiting
if (rateLimit) {
    const limiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 20,
        message: { success: false, error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);
}

// 4. 🔒 CORS Hardening
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Adjust to frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Issuer-Signature-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ✅ All API routes
app.use('/api', routes);

// ❌ 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// ❌ Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;

try {
    console.log('--- DIAGNOSTIC START ---');
    console.log('Node version:', process.version);

    console.log('Testing requirements...');
    require('cookie-parser');
    console.log('✅ cookie-parser OK');
    require('express-rate-limit');
    console.log('✅ express-rate-limit OK');
    require('jsonwebtoken');
    console.log('✅ jsonwebtoken OK');
    require('ethers');
    console.log('✅ ethers OK');

    console.log('Testing config load...');
    const config = require('./src/config/env');
    console.log('✅ config load OK');
    console.log('Environment:', config.server.env);

    console.log('Testing app load...');
    const app = require('./src/app');
    console.log('✅ app load OK');

    console.log('--- DIAGNOSTIC SUCCESS ---');
} catch (err) {
    console.error('--- DIAGNOSTIC FAILURE ---');
    console.error(err);
    process.exit(1);
}

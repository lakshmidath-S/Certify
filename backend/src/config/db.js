const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
    connectionString: env.database.url,
});

pool.on('connect', () => {
    console.log('✅ Database connected');
});

module.exports = {
    pool, // ✅ for server.js or advanced usage
    query: (text, params) => pool.query(text, params), // ✅ for controllers
};

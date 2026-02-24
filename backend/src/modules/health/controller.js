const { pool } = require('../../db/pool');
const { provider } = require('../../config/blockchain');

async function checkHealth(req, res) {
    const status = {
        server: 'UP',
        timestamp: new Date().toISOString(),
        database: 'UNKNOWN',
        blockchain: 'UNKNOWN'
    };

    // Check Database
    try {
        await pool.query('SELECT 1');
        status.database = 'CONNECTED';
    } catch (error) {
        status.database = 'DISCONNECTED';
        status.dbError = error.message;
    }

    // Check Blockchain
    try {
        const network = await provider.getNetwork();
        status.blockchain = `CONNECTED (${network.name}, ChainID: ${network.chainId})`;
    } catch (error) {
        status.blockchain = 'DISCONNECTED';
        status.chainError = error.message;
    }

    const isHealthy = status.database === 'CONNECTED' && status.blockchain.startsWith('CONNECTED');
    const httpStatus = isHealthy ? 200 : 503;

    res.status(httpStatus).json({
        success: isHealthy,
        ...status
    });
}

module.exports = {
    checkHealth
};

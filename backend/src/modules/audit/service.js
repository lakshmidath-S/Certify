const db = require('../../db/pool');
const { hashMetadata } = require('../../utils/hashing');
const blockchain = require('../../config/blockchain');

/**
 * Aggregates logs from the last 24 hours and anchors their aggregate hash to the blockchain.
 */
async function anchorDailyLogs() {
    console.log('🔄 Starting daily audit log anchoring...');

    // 1. Fetch logs from last 24 hours
    const logsResult = await db.query(
        `SELECT id, user_id, action, resource_type, resource_id, result, created_at, metadata
         FROM audit_logs
         WHERE created_at > NOW() - INTERVAL '1 day'
         ORDER BY created_at ASC`
    );

    if (logsResult.rows.length === 0) {
        console.log('ℹ️ No logs to anchor for the last 24 hours.');
        return { success: true, message: 'No logs to anchor' };
    }

    // 2. Compute aggregate hash (Simulated Merkle Root for now)
    // We canonicalize each log and then hash the concatenation
    const logStrings = logsResult.rows.map(log => {
        // Use deterministic hashing utility for each log entry
        return hashMetadata(log);
    });

    const aggregateHash = hashMetadata({
        logHashes: logStrings,
        count: logStrings.length,
        timestamp: Date.now()
    });

    console.log(`📡 Anchoring ${logStrings.length} logs with aggregate hash: ${aggregateHash}`);

    // 3. Store on-chain (using CertificateRegistry as a general anchor for now)
    // In a full production system, we might use a dedicated AnchorRegistry or a log-specific contract
    try {
        const txResult = await blockchain.storeCertificateHashOnChain(
            aggregateHash.substring(0, 64),
            blockchain.blockchainSigner
        );

        // 4. Record the anchor in a new table or audit log
        await db.query(
            `INSERT INTO audit_logs (action, resource_type, resource_id, result, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                'AUDIT_LOGS_ANCHORED',
                'SYSTEM',
                'DAILY_CRON',
                'SUCCESS',
                JSON.stringify({
                    aggregateHash,
                    logCount: logStrings.length,
                    txHash: txResult.txHash
                })
            ]
        );

        return {
            success: true,
            txHash: txResult.txHash,
            aggregateHash,
            logCount: logStrings.length
        };
    } catch (error) {
        console.error('❌ Failed to anchor audit logs on-chain:', error.message);
        throw error;
    }
}

module.exports = {
    anchorDailyLogs
};

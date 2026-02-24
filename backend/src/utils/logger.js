const db = require('../db/pool');

/**
 * Log an action to the audit logs with a specific severity.
 */
async function auditLog({
    userId = null,
    action,
    resourceType = 'SYSTEM',
    resourceId = null,
    result = 'SUCCESS',
    severity = 'INFO',
    metadata = {},
    errorMessage = null
}) {
    console.log(`[${severity}] ${action}: ${result}${errorMessage ? ` - ${errorMessage}` : ''}`);

    try {
        await db.query(
            `INSERT INTO audit_logs 
             (user_id, action, resource_type, resource_id, result, severity, metadata, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                userId,
                action,
                resourceType,
                resourceId,
                result,
                severity,
                JSON.stringify(metadata),
                errorMessage
            ]
        );
    } catch (err) {
        console.error('CRITICAL: Failed to write to audit_logs:', err.message);
    }
}

module.exports = {
    auditLog,
    Levels: {
        INFO: 'INFO',
        WARNING: 'WARNING',
        CRITICAL: 'CRITICAL',
        ALERT: 'ALERT'
    }
};

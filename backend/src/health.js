/**
 * Process-wide health state, written by the startup database check and read by
 * the /api/health route. Kept in its own module so the route does not have to
 * hit the database on every probe — a health check that queries Postgres turns
 * a database blip into a restart loop.
 */
const state = {
    databaseConnected: false,
    databaseError: null,
    databaseCheckedAt: null
};

function setDatabase(connected, error = null) {
    state.databaseConnected = connected;
    state.databaseError = connected ? null : error;
    state.databaseCheckedAt = new Date().toISOString();
}

function snapshot() {
    return { ...state };
}

module.exports = { setDatabase, snapshot };

require('dotenv').config();
const db = require('./src/db/pool');

async function checkUsers() {
    try {
        const result = await db.query(
            "SELECT id, email, role, status FROM users WHERE id IN ($1, $2)",
            ['db039430-fcd7-4326-973b-3c6b2b9fbfda', 'ab18e4ea-92fa-4f34-bf90-5c3ef4007ff7']
        );
        console.table(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkUsers();

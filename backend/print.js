const fs = require('fs');
const db = require('./src/db/pool');
async function run() {
    try {
        const users = await db.query("SELECT id, email, role FROM users WHERE id IN ('db039430-fcd7-4326-973b-3c6b2b9fbfda', 'ab18e4ea-92fa-4f34-bf90-5c3ef4007ff7')");
        fs.writeFileSync('users.json', JSON.stringify(users.rows, null, 2));
    } catch (e) {
        fs.writeFileSync('users.json', e.message);
    } finally {
        process.exit(0);
    }
}
run();

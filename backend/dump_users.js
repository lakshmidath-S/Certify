require('dotenv').config();
const fs = require('fs');
const db = require('./src/db/pool');

async function main() {
    try {
        const res1 = await db.query("SELECT * FROM users WHERE id IN ($1, $2)", ['db039430-fcd7-4326-973b-3c6b2b9fbfda', 'ab18e4ea-92fa-4f34-bf90-5c3ef4007ff7']);
        fs.writeFileSync('C:\\Users\\grego\\projects\\Certify\\backend\\out.json', JSON.stringify({ users: res1.rows }, null, 2));
    } catch (e) {
        fs.writeFileSync('C:\\Users\\grego\\projects\\Certify\\backend\\out.json', JSON.stringify({ error: e.stack }, null, 2));
    } finally {
        process.exit();
    }
}
main();

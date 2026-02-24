const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT id, email, role, status FROM users WHERE id IN ($1, $2)", ['db039430-fcd7-4326-973b-3c6b2b9fbfda', 'ab18e4ea-92fa-4f34-bf90-5c3ef4007ff7']);
        fs.writeFileSync('C:\\Users\\grego\\projects\\Certify\\backend\\db_dump.json', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        fs.writeFileSync('C:\\Users\\grego\\projects\\Certify\\backend\\db_dump.json', JSON.stringify({ error: e.message }));
    } finally {
        await client.end();
        process.exit(0);
    }
}
run();

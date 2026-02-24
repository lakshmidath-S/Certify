require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        const res = await client.query(
            "SELECT id, email, role FROM users WHERE id IN ($1, $2)",
            ['db039430-fcd7-4326-973b-3c6b2b9fbfda', 'ab18e4ea-92fa-4f34-bf90-5c3ef4007ff7']
        );
        console.log("=== MISMATCHED USERS ===");
        res.rows.forEach(r => console.log(`ID: ${r.id} | Email: ${r.email} | Role: ${r.role}`));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth/login';

const CREDENTIALS = [
    { email: 'admin@certify.com', password: 'admin123', role: 'ADMIN' },
    { email: 'issuer@certify.com', password: 'issuer123', role: 'ISSUER' },
    { email: 'student@certify.com', password: 'student123', role: 'OWNER' },
    { email: 'verifier@certify.com', password: 'verifier123', role: 'VERIFIER' }
];

async function testLogins() {
    console.log('🚀 Testing Login Flow...');

    for (const cred of CREDENTIALS) {
        try {
            console.log(`\nTesting ${cred.role} (${cred.email})...`);

            const response = await axios.post(BASE_URL, {
                email: cred.email,
                password: cred.password
            });

            if (response.data.success) {
                const user = response.data.user;
                console.log(`✅ Success! Token received.`);
                console.log(`   User ID: ${user.id}`);
                console.log(`   Role: ${user.role}`);

                if (user.role !== cred.role) {
                    console.error(`❌ ROLE MISMATCH! Expected ${cred.role}, got ${user.role}`);
                }
            } else {
                console.error('❌ Failed (No success flag)');
            }

        } catch (error) {
            console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
        }
    }
}

testLogins();

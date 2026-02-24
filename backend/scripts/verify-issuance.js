const { ethers } = require('ethers');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// --- Configuration ---
const API_URL = 'http://localhost:3000';
const PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY; // Must be set in environment
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'; // Must match backend

if (!PRIVATE_KEY) {
    console.error('❌ ISSUER_PRIVATE_KEY environment variable is required.');
    process.exit(1);
}

async function runVerification() {
    console.log('🚀 Starting Issuance Verification...');

    try {
        // 1. Setup Wallet
        const wallet = new ethers.Wallet(PRIVATE_KEY);
        console.log(`👤 Issuer Address: ${wallet.address}`);

        // 2. Mock Authentication (Get a valid JWT for the user)
        // NOTE: In a real flow, you'd login. Here we'll forge a token if we know the secret 
        // OR we need to register a user -> add wallet -> login.
        // For simplicity/testing, we assume we have a user/wallet already set up in DB.

        // STARTUP CHECK: 
        console.log('⚠️  Ensure you have a seeded user with role ISSUER and this wallet mapped in the DB.');

        // --- STEP 1: Wallet Verification Challenge ---
        console.log('\n--- Step 1: Wallet Verification Challenge ---');
        console.log(`POST ${API_URL}/api/auth/wallet/challenge`);
        const challengeRes = await axios.post(`${API_URL}/api/auth/wallet/challenge`, {
            walletAddress: wallet.address
        });

        const { message, nonce } = challengeRes.data;
        console.log(`✅ Challenge received: ${message}`);

        // Sign the message
        const signature = await wallet.signMessage(message);
        console.log(`✍️  Signed message. Signature: ${signature.substring(0, 20)}...`);

        // Verify Signature to get "Signing Token" (and User info)
        console.log('\n--- Step 2: Verify Signature & Get Token ---');
        const verifyRes = await axios.post(`${API_URL}/api/auth/wallet/verify`, {
            walletAddress: wallet.address,
            signature,
            message
        });

        const { signingToken, user } = verifyRes.data;
        console.log(`✅ Authenticated as: ${user.email} (${user.role})`);
        console.log(`🔑 Signing Token: ${signingToken.substring(0, 20)}...`);

        // Generate standard Auth Token for API access
        const authToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log(`🔓 Generated Test Auth Token: ${authToken.substring(0, 20)}...`);

        // --- STEP 3: Issue Certificate ---
        console.log('\n--- Step 3: Issue Certificate ---');
        const issuePayload = {
            ownerName: "John Doe",
            ownerEmail: "john@example.com",
            courseName: "Blockchain 101",
            ownerId: user.id, // Issuing to self for test
            issuerPrivateKey: PRIVATE_KEY // The hardening check we just added checks this!
        };

        const issueRes = await axios.post(`${API_URL}/api/certificates/issue`, issuePayload, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Issuer-Signature-Token': signingToken
            }
        });

        console.log('✅ Certificate Issued!');
        console.log(`📄 ID: ${issueRes.data.certificateId}`);
        console.log(`🔗 Hash: ${issueRes.data.hash}`);
        console.log(`⛓️  TxHash: ${issueRes.data.txHash}`);

    } catch (error) {
        console.error('❌ Verification Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runVerification();

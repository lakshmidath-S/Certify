# Adding Admin Wallets to CERTIFY

## Overview

In CERTIFY, all admins share a **single email account** (`admin@certify.com`) but are identified by their **unique wallet addresses**. This allows multiple administrators to manage the system while maintaining a unified admin identity.

## Architecture

```
Admin Account (admin@certify.com)
├── Admin Wallet 1 (0xABC...)
├── Admin Wallet 2 (0xDEF...)
└── Admin Wallet 3 (0x123...)
```

Each admin:
- Uses the same email: `admin@certify.com`
- Has their own MetaMask wallet
- Signs transactions with their wallet to prove identity
- Has full admin privileges

## Methods to Add Admin Wallets

### Method 1: Interactive Script (Recommended)

Use the automated script that handles both blockchain and database operations:

```bash
cd backend
node add-admin-wallet.js
```

**What it does:**
1. ✅ Verifies admin account exists
2. ✅ Shows existing admin wallets
3. ✅ Validates new wallet address
4. ✅ Maps wallet on WalletRegistry contract
5. ✅ Stores mapping in database
6. ✅ Creates audit log
7. ✅ Verifies on blockchain

**Required inputs:**
- New admin wallet address (from MetaMask)
- Admin private key (for signing blockchain transaction)

### Method 2: Manual Steps

If you prefer manual control:

#### Step 1: Map Wallet on Blockchain

```javascript
// Using Hardhat console or script
const walletRegistry = await ethers.getContractAt(
    "WalletRegistry",
    "0xD1abe7Ab545C0e2651cFA11c032dDcbc6c9FFCc7"
);

const newAdminWallet = "0xYourNewAdminWalletAddress";
const tx = await walletRegistry.mapWallet(newAdminWallet);
await tx.wait();
console.log("Mapped! TX:", tx.hash);
```

#### Step 2: Add to Database

```sql
-- Get admin user ID
SELECT id FROM users WHERE email = 'admin@certify.com' AND role = 'ADMIN';

-- Insert wallet mapping (replace values)
INSERT INTO wallets (wallet_address, user_id, mapped_tx_hash, is_active, blockchain_network)
VALUES (
    '0xYourNewAdminWalletAddress',  -- New admin wallet
    'admin-user-id-from-above',     -- Admin user ID
    '0xTransactionHashFromStep1',   -- TX hash from blockchain
    true,
    'base-sepolia'
);
```

### Method 3: Using Admin API Endpoint

If you have an existing admin session:

```bash
POST http://localhost:3000/api/wallets/map
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "walletAddress": "0xNewAdminWalletAddress",
  "userId": "admin-user-id",
  "adminPrivateKey": "0xYourAdminPrivateKey"
}
```

## Verification

After adding a wallet, verify it's working:

### 1. Check Database

```sql
SELECT 
    w.wallet_address,
    w.is_active,
    w.mapped_at,
    w.mapped_tx_hash,
    u.email,
    u.role
FROM wallets w
JOIN users u ON w.user_id = u.id
WHERE u.email = 'admin@certify.com'
ORDER BY w.mapped_at DESC;
```

### 2. Check Blockchain

```javascript
const walletRegistry = await ethers.getContractAt(
    "WalletRegistry",
    "0xD1abe7Ab545C0e2651cFA11c032dDcbc6c9FFCc7"
);

const isValid = await walletRegistry.isValidIssuer("0xNewAdminWallet");
console.log("Is valid issuer:", isValid); // Should be true
```

### 3. Test Wallet Authentication

```bash
# 1. Request challenge
POST http://localhost:3000/api/wallet-auth/challenge
{
  "walletAddress": "0xNewAdminWallet"
}

# 2. Sign message in MetaMask

# 3. Verify signature
POST http://localhost:3000/api/wallet-auth/verify
{
  "walletAddress": "0xNewAdminWallet",
  "signature": "0x...",
  "message": "Sign this message to authorize..."
}
```

## Current Admin Wallets

To list all current admin wallets:

```sql
SELECT 
    wallet_address,
    is_active,
    mapped_at,
    mapped_tx_hash
FROM wallets
WHERE user_id = (
    SELECT id FROM users 
    WHERE email = 'admin@certify.com' 
    AND role = 'ADMIN'
)
ORDER BY mapped_at DESC;
```

## Revoking Admin Wallets

If you need to revoke an admin wallet:

```bash
POST http://localhost:3000/api/wallets/revoke
Authorization: Bearer <admin-jwt-token>

{
  "walletAddress": "0xWalletToRevoke",
  "reason": "Admin left organization",
  "adminPrivateKey": "0xYourAdminPrivateKey"
}
```

Or use SQL:

```sql
-- This should be done through the API to ensure blockchain sync
-- Manual revocation is NOT recommended
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Keys**: Never commit private keys to version control
2. **Wallet Verification**: Always verify wallet ownership before mapping
3. **Audit Trail**: All wallet mappings are logged in `audit_logs` table
4. **Blockchain Sync**: Database and blockchain must stay in sync
5. **Admin Control**: Only existing admin wallets can map new wallets

## Troubleshooting

### "Wallet is not a valid issuer on blockchain"

**Cause**: Wallet not mapped on WalletRegistry contract

**Solution**: Run `add-admin-wallet.js` script or manually map on blockchain

### "Wallet already mapped"

**Cause**: Wallet address already exists in database

**Solution**: Check existing wallets, use a different address

### "Signer is not the contract admin"

**Cause**: Private key doesn't match contract admin

**Solution**: Use the correct admin private key that deployed the contract

### "Transaction failed"

**Cause**: Insufficient gas, network issues, or contract error

**Solution**: 
- Check wallet has Base Sepolia ETH
- Verify RPC connection
- Check contract address is correct

## Example Workflow

```bash
# 1. Run the script
cd backend
node add-admin-wallet.js

# 2. Enter details when prompted
Enter new admin wallet address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Enter admin private key (for blockchain tx): 0x...

# 3. Script output
✅ Found admin account: admin@certify.com
⏳ Mapping wallet on blockchain...
✅ Transaction confirmed in block 12345678
✅ Admin wallet added successfully!

# 4. Test the new wallet
# - Login with MetaMask using the new wallet
# - Sign the challenge message
# - Access admin dashboard
```

## Summary

- ✅ One admin email: `admin@certify.com`
- ✅ Multiple admin wallets mapped to same account
- ✅ Each admin identified by their wallet signature
- ✅ Full admin privileges for all mapped wallets
- ✅ Blockchain-backed authentication
- ✅ Complete audit trail

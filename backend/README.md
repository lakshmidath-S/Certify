# CERTIFY Backend API

Production-ready Node.js backend for CERTIFY blockchain-backed certificate platform.

## Features

- ✅ JWT Authentication
- ✅ Role-Based Access Control (ADMIN, ISSUER, OWNER, VERIFIER)
- ✅ PostgreSQL Database with Connection Pooling
- ✅ Blockchain Integration (Base Sepolia)
- ✅ Certificate Hash Generation (SHA256)
- ✅ Certificate Verification (DB + Blockchain)
- ✅ Wallet Management
- ✅ Audit Logging

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Blockchain**: Ethers.js (Base Sepolia)
- **Auth**: JWT + bcrypt
- **Utilities**: uuid, crypto

## Installation

```bash
cd backend
npm install
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:
```env
DATABASE_URL=postgresql://user:password@host:5432/certify
JWT_SECRET=your_jwt_secret_min_32_chars
RPC_URL=https://sepolia.base.org
CONTRACT_WALLET_REGISTRY=0xD1abe7Ab545C0e2651cFA11c032dDcbc6c9FFCc7
CONTRACT_CERT_REGISTRY=0x16D55c44e8c7A6a2e9DF4c1A18fA75a0EAaD15cf
PORT=3000
```

## Database Setup

1. Create PostgreSQL database (Neon recommended)

2. Run schema migration:
```bash
psql $DATABASE_URL < schema.sql
```

Or manually execute `schema.sql` in your database client.

## Run Server

### Development
```bash
npm start
```

### With Auto-Reload (Node 18+)
```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "ISSUER",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Get Profile**
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Wallets (Admin Only)

**Map Wallet**
```http
POST /api/wallets/map
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "walletAddress": "0x...",
  "userId": "uuid",
  "adminPrivateKey": "0x..."
}
```

**Revoke Wallet**
```http
POST /api/wallets/revoke
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "walletAddress": "0x...",
  "reason": "Violation of terms",
  "adminPrivateKey": "0x..."
}
```

**Get Wallet**
```http
GET /api/wallets/:address
Authorization: Bearer <token>
```

**Get My Wallets**
```http
GET /api/wallets/my-wallets
Authorization: Bearer <token>
```

### Certificates (Issuer Only)

**Issue Certificate**
```http
POST /api/certificates/issue
Authorization: Bearer <issuer_token>
Content-Type: application/json

{
  "certificateNumber": "CERT-2024-001",
  "recipientName": "Jane Smith",
  "recipientEmail": "jane@example.com",
  "courseName": "Blockchain Development",
  "courseDuration": "6 months",
  "grade": "A+",
  "issueDate": "2024-01-31",
  "expiryDate": "2029-01-31",
  "ownerId": "uuid",
  "issuerWalletId": "uuid",
  "issuerWalletAddress": "0x...",
  "issuerPrivateKey": "0x...",
  "additionalInfo": {}
}
```

**Get Certificate by Hash**
```http
GET /api/certificates/:hash
Authorization: Bearer <token>
```

**Get My Certificates**
```http
GET /api/certificates/my-certificates?limit=50&offset=0
Authorization: Bearer <token>
```

### Verification (Public)

**Verify Single Certificate**
```http
POST /api/verify/hash
Content-Type: application/json

{
  "hash": "abc123..."
}
```

**Verify Bulk Certificates**
```http
POST /api/verify/bulk
Content-Type: application/json

{
  "hashes": ["hash1", "hash2", "hash3"]
}
```

**Health Check**
```http
GET /api/health
```

## Verification Statuses

- `VALID` - Certificate is valid
- `NOT_FOUND` - Certificate doesn't exist
- `NOT_ON_CHAIN` - Certificate not found on blockchain
- `REVOKED` - Certificate has been revoked
- `ISSUER_REVOKED` - Issuer wallet has been revoked
- `INVALID_ON_CHAIN` - Certificate is invalid on blockchain
- `TAMPERED` - Certificate metadata has been tampered with

## Database Schema

### Tables
- `users` - User accounts with roles
- `wallets` - Issuer wallet mappings
- `certificates` - Certificate records
- `certificate_files` - PDF/QR file references
- `audit_logs` - System audit trail
- `revocations` - Revocation records

## Security

- JWT tokens expire in 1 hour
- Passwords hashed with bcrypt (10 rounds)
- Role-based access control on all endpoints
- Blockchain signature verification for wallet operations
- Comprehensive audit logging
- SQL injection prevention via parameterized queries

## Error Handling

All API responses follow this format:

**Success**
```json
{
  "success": true,
  "data": {}
}
```

**Error**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── blockchain.js
│   ├── db/
│   │   └── pool.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── wallets/
│   │   ├── certificates/
│   │   └── verification/
│   ├── routes/
│   │   └── index.js
│   ├── app.js
│   └── server.js
├── schema.sql
├── package.json
└── .env
```

## Troubleshooting

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- Ensure schema is migrated

### Blockchain Connection Error
- Verify `RPC_URL` is correct
- Check contract addresses are deployed
- Ensure network is Base Sepolia

### JWT Error
- Ensure `JWT_SECRET` is at least 32 characters
- Check token is being sent in Authorization header
- Verify token hasn't expired

## License

MIT

# CERTIFY Frontend

React + Vite frontend for CERTIFY blockchain certificate platform.

## Features

- ✅ Role-based dashboards (Admin, Issuer, Owner, Verifier)
- ✅ MetaMask wallet integration
- ✅ Dual authentication for issuers (email + wallet signature)
- ✅ Certificate issuance with blockchain anchoring
- ✅ Certificate download (PDF)
- ✅ Bulk certificate verification
- ✅ Real-time API integration

## Tech Stack

- React 18
- Vite
- React Router v6
- Axios
- Ethers.js v6
- Tailwind CSS

## Prerequisites

- Node.js 18+
- MetaMask browser extension
- Backend running on http://localhost:3000

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Build

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and services
│   ├── context/          # React contexts (Auth)
│   ├── wallet/           # Wallet service (MetaMask)
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   │   ├── login/
│   │   ├── admin/
│   │   ├── issuer/
│   │   ├── owner/
│   │   └── verifier/
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## User Roles

### Admin
- Map issuer wallets
- Revoke issuer wallets

### Issuer
- Connect MetaMask wallet
- Request signature challenge
- Sign message for authorization
- Issue certificates (requires wallet signature)

### Owner
- View owned certificates
- Download certificates (PDF)

### Verifier
- Bulk verify certificates
- View verification results

## Wallet Integration

### MetaMask Setup
1. Install MetaMask extension
2. Connect wallet
3. Switch to Base Sepolia network
4. Sign messages for authorization

### Network Details
- Network: Base Sepolia
- Chain ID: 84532 (0x14a34)
- RPC URL: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

## API Endpoints

All API calls go through `http://localhost:3000/api`:

- POST /auth/login
- POST /wallet-auth/challenge
- POST /wallet-auth/verify
- POST /certificates/issue
- GET /certificates/my
- GET /certificates/:id/download
- POST /verify/bulk
- POST /wallets/map
- POST /wallets/revoke

## Authentication Flow

### Standard Login
1. Enter email/password
2. Receive JWT token
3. Redirect to role-based dashboard

### Issuer Wallet Signature
1. Connect MetaMask
2. Request challenge
3. Sign message with MetaMask
4. Receive 5-minute signing token
5. Issue certificates

## Environment Variables

No environment variables needed. API base URL is configured in `src/api/client.js`.

## Troubleshooting

### MetaMask not detected
- Install MetaMask browser extension
- Refresh page

### Wrong network
- Click "Switch to Base Sepolia" button
- Approve network switch in MetaMask

### API errors
- Ensure backend is running on port 3000
- Check browser console for details

### Token expired
- Re-login for JWT token
- Re-sign for issuer signing token (5 min expiry)

## License

MIT

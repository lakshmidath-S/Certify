# CERTIFY - Blockchain Certificate Platform

A decentralized certificate issuance and verification platform built on Base Sepolia blockchain.

## 🌟 Features

- **Blockchain-Based Verification**: Certificates stored on Base Sepolia blockchain
- **Role-Based Access Control**: Admin, Issuer, Owner (Student), and Public Verifier roles
- **Wallet Signature Authorization**: Issuers must sign with MetaMask to issue certificates
- **Student OTP Onboarding**: Email-based verification for student registration
- **Admin Issuer Management**: Admins create and manage institutional issuers
- **Public Verification**: Anyone can verify certificate authenticity without login
- **PDF Generation**: Certificates generated with QR codes for easy verification

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **WalletRegistry**: Manages issuer wallet mappings and revocations
- **CertificateRegistry**: Stores certificate hashes on-chain

### Backend (Node.js + Express)
- RESTful API with JWT authentication
- PostgreSQL database
- Wallet signature verification
- PDF generation with QR codes

### Frontend (React + Vite)
- Role-based dashboards
- MetaMask integration
- Student onboarding flow
- Public verification interface

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL
- MetaMask wallet
- Base Sepolia testnet ETH

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/certify.git
   cd certify
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Smart Contracts** (Already deployed)
   - WalletRegistry: `[Your deployed address]`
   - CertificateRegistry: `[Your deployed address]`

### Database Setup

```bash
cd backend
node migrate-student-otp.js
node migrate-wallet-challenges.js
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

## 🔐 Security

- Private keys never stored in database
- JWT tokens for authentication
- Wallet signatures for issuer authorization
- On-chain validation for all certificates
- Role-based access control

## 🛠️ Tech Stack

- **Blockchain**: Solidity, Hardhat, Ethers.js, Base Sepolia
- **Backend**: Node.js, Express, PostgreSQL, JWT
- **Frontend**: React, Vite, TailwindCSS, React Router
- **Tools**: MetaMask, PDF-lib, QR-code

## 📝 License

MIT

## 👥 Contributors

[Your Name]

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Contact

[Your Email]

# 🎓 CERTIFY - Trust Protocol for Decentralized Credentials

CERTIFY is a state-of-the-art decentralized platform for issuing and verifying academic and professional certificates. By leveraging the **Base Sepolia** blockchain and industry-standard digital signatures, it ensures that credentials are immutable, tamper-proof, and universally verifiable.

---

## 🌟 Key Features

- **Dual-Layer Verification**: 
    - **On-Chain**: Verification via SHA-256 hashes stored on the Base Sepolia blockchain.
    - **Off-Chain**: Industry-standard P12 digital signatures embedded within PDF files for offline authenticity.
- **Deterministic Hashing**: Uses **Canonical JSON** construction to ensure that the same certificate data always produces the identical hash, regardless of key order.
- **Institutional Governance**: Admin-controlled **Wallet Registry** that maps institutional identities to specific blockchain addresses.
- **Secure Onboarding**: Student self-registration with **Email OTP verification** for secure account creation.
- **Privacy First**: Only the cryptographic hash of a certificate is stored on-chain; sensitive PII remains in the encrypted database or within the PDF metadata.
- **Public Verification Portal**: A dedicated dashboard for employers and third parties to verify certificates via QR code scanning or file upload.

---

## 🏗️ Architecture & Core Methods

### 🔗 Blockchain Layer (Solidity)
- **`WalletRegistry.sol`**: Manages the mapping of institutional issuers to their wallet addresses. Allows admins to revoke issuer access instantly.
- **`CertificateRegistry.sol`**: Stores the certificate hashes and tracks issuance/revocation status on-chain.

### ⚙️ Backend Logic (Node.js + Express)
- **Deterministic Hashing**: Implements a recursive canonicalization method to ensure consistent hashing (`SHA-256`) of certificate metadata.
- **Digital Signing**: Uses `signpdf` and `node-forge` to apply server-side P12 signatures to generated PDFs, providing a second layer of proof.
- **Metadata Embedding**: The canonical JSON representation of the certificate is hidden within the PDF subject metadata for automated verification.

### 🎨 Frontend Experience (React + Vite)
- **Role-Based Dashboards**: Tailored interfaces for Admins, Issuers, Owners (Students), and Public Verifiers.
- **Dark UI Theme**: Premium, modern dark-mode interface built with Tailwind CSS.
- **MetaMask Integration**: Secure wallet-based authorization for institutional actions.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Wallet Interaction**: [Ethers.js v6](https://docs.ethers.org/v6/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Server**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (pg-pool for concurrent scaling)
- **Authentication**: JWT & Wallet Signature Verification
- **PDF Generation**: [PDF-lib](https://pdf-lib.js.org/)
- **Crypto & Signing**: [SignPDF](https://github.com/vbuch/signpdf), [Node-forge](https://github.com/digitalbazaar/forge)

### Blockchain & DevOps
- **Networks**: [Base Sepolia Testnet](https://base.org/)
- **Development**: [Hardhat](https://hardhat.org/)
- **Contracts**: [Solidity 0.8.20](https://soliditylang.org/)

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL
- MetaMask extension
- Base Sepolia ETH (for contract interactions)

### 2. Installation
```bash
git clone https://github.com/your-username/certify.git
cd certify
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure DB_*, JWT_SECRET, and P12_* variables
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```text
Certify/
├── backend/            # Express API server
│   ├── src/
│   │   ├── modules/    # Auth, Certificates, Wallets
│   │   ├── middleware/ # Signature & JWT validation
│   │   └── db/         # PostgreSQL pool logic
├── frontend/           # React dashboard
│   ├── src/
│   │   ├── pages/      # Role-based dashboards
│   │   └── components/ # UI primitive & Shared components
└── contracts/          # Smart contract development
    ├── contracts/      # Solidity sources
    └── scripts/        # Deployment tools
```

---

## ⛓️ Smart Contract Details

| Contract | Network | Address |
| :--- | :--- | :--- |
| **WalletRegistry** | Base Sepolia | `0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6` |
| **CertificateRegistry** | Base Sepolia | `0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9` |

---

## 🔐 Security & Integrity

- **Non-Custodial**: Issuers sign transactions with their own wallets via MetaMask.
- **Server-Side Integrity**: PDFs are signed with a corporate P12 certificate to prevent unauthorized "offline" certificate creation.
- **Audit Logs**: Every critical action (issuance, revocation, login) is logged in the database for institutional auditing.

---

## 📝 License

Released under the **MIT License**.

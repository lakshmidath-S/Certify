# CERTIFY - Blockchain Contracts

Production-ready smart contracts for CERTIFY certificate issuance and verification platform.

## Contracts

### WalletRegistry.sol
Admin-controlled contract for managing issuer wallet authorization.

**Functions:**
- `mapWallet(address issuer)` - Map new issuer wallet (admin only)
- `revokeWallet(address issuer)` - Revoke issuer wallet (admin only)
- `isValidIssuer(address issuer)` - Check if issuer is valid

### CertificateRegistry.sol
Stores and manages certificate hashes with issuer validation.

**Functions:**
- `storeCertificateHash(bytes32 hash)` - Store certificate hash (valid issuer only)
- `revokeCertificate(bytes32 hash)` - Revoke certificate (admin only)
- `isValidCertificate(bytes32 hash)` - Check certificate validity
- `getCertificateInfo(bytes32 hash)` - Get certificate details

## Installation

```bash
cd contracts
npm install
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```
RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

## Compile Contracts

```bash
npx hardhat compile
```

## Run Tests

```bash
npx hardhat test
```

For detailed test output:
```bash
npx hardhat test --verbose
```

For gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

## Deploy Contracts

### Local Network

1. Start local Hardhat node:
```bash
npx hardhat node
```

2. Deploy WalletRegistry (in new terminal):
```bash
npx hardhat run scripts/deploy-wallet-registry.js --network localhost
```

3. Deploy CertificateRegistry (use WalletRegistry address from step 2):
```bash
npx hardhat run scripts/deploy-certificate-registry.js --network localhost 0xWALLET_REGISTRY_ADDRESS
```

### Base Sepolia Testnet

1. Ensure `.env` is configured with Base Sepolia RPC URL and funded deployer private key

2. Deploy WalletRegistry:
```bash
npx hardhat run scripts/deploy-wallet-registry.js --network baseSepolia
```

3. Deploy CertificateRegistry:
```bash
npx hardhat run scripts/deploy-certificate-registry.js --network baseSepolia 0xWALLET_REGISTRY_ADDRESS
```

## Custom Tasks

### Check Current Block Number
```bash
npx hardhat check-block --network baseSepolia
```

### Check Deployer Balance
```bash
npx hardhat check-balance --network baseSepolia
```

## Contract Interaction Examples

### Using Hardhat Console

```bash
npx hardhat console --network baseSepolia
```

```javascript
// Get contract instances
const WalletRegistry = await ethers.getContractFactory("WalletRegistry");
const walletRegistry = WalletRegistry.attach("0xWALLET_REGISTRY_ADDRESS");

const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
const certificateRegistry = CertificateRegistry.attach("0xCERT_REGISTRY_ADDRESS");

// Map an issuer wallet
const [admin] = await ethers.getSigners();
await walletRegistry.mapWallet("0xISSUER_ADDRESS");

// Check if issuer is valid
const isValid = await walletRegistry.isValidIssuer("0xISSUER_ADDRESS");
console.log("Is valid issuer:", isValid);

// Store certificate hash
const hash = ethers.keccak256(ethers.toUtf8Bytes("certificate_data"));
await certificateRegistry.storeCertificateHash(hash);

// Verify certificate
const valid = await certificateRegistry.isValidCertificate(hash);
console.log("Certificate valid:", valid);
```

## Network Configuration

### Base Sepolia
- **Chain ID:** 84532
- **RPC URL:** https://sepolia.base.org
- **Block Explorer:** https://sepolia.basescan.org

## Security Notes

- Never commit `.env` file to version control
- Keep private keys secure
- Admin role has critical permissions - protect admin account
- Test thoroughly on testnet before mainnet deployment
- Consider multi-sig wallet for admin role in production

## Troubleshooting

### "Insufficient funds" error
Ensure deployer wallet has enough ETH for gas fees. Get testnet ETH from Base Sepolia faucet.

### "Invalid address" error
Verify WalletRegistry address is correct when deploying CertificateRegistry.

### "Nonce too high" error
Reset Hardhat network or wait for pending transactions to complete.

### Tests failing
Ensure you're using Node.js v18+ and all dependencies are installed.

## Project Structure

```
contracts/
├── contracts/
│   ├── WalletRegistry.sol
│   ├── CertificateRegistry.sol
│   └── IWalletRegistry.sol
├── scripts/
│   ├── deploy-wallet-registry.js
│   └── deploy-certificate-registry.js
├── test/
│   ├── WalletRegistry.test.js
│   └── CertificateRegistry.test.js
├── hardhat.config.js
├── package.json
├── .env.example
└── README.md
```

## License

MIT

# CERTIFY — Smart Contracts

Hardhat workspace for the two contracts that hold CERTIFY's trust anchor:
an admin-controlled issuer allowlist, and a hash registry that consults it.

- **How the contracts fit the system** → [../ARCHITECTURE.md §9](../ARCHITECTURE.md#9-smart-contracts)

Solidity 0.8.20, optimizer enabled (200 runs), targeting Base Sepolia
(chain ID `84532`).

---

## Contracts

### `WalletRegistry.sol`

The institutional allowlist. Only the admin can change it.

| Function | Access | Notes |
| :--- | :--- | :--- |
| `mapWallet(address issuer)` | `onlyAdmin` | Rejects the zero address and already-mapped wallets; stamps `mappedAt` |
| `revokeWallet(address issuer)` | `onlyAdmin` | Rejects unmapped wallets; stamps `revokedAt` |
| `isValidIssuer(address) → bool` | view | The single read the rest of the system depends on |
| `transferAdmin(address newAdmin)` | `onlyAdmin` | Rejects the zero address and the current admin |

Public state: `admin`, `validIssuer`, `mappedAt`, `revokedAt`.
Events: `WalletMapped`, `WalletRevoked`, `AdminTransferred`.

The constructor makes the deployer the admin.

### `CertificateRegistry.sol`

The hash anchor. Constructed with the `WalletRegistry` address, which it holds
as an `IWalletRegistry` and queries on both writes and reads.

| Function | Access | Notes |
| :--- | :--- | :--- |
| `storeCertificateHash(bytes32 hash)` | `onlyValidIssuer` | Rejects the zero hash and duplicates; records `msg.sender` as issuer |
| `revokeCertificate(bytes32 hash)` | `onlyAdmin` | Rejects unknown and already-revoked hashes |
| `isValidCertificate(bytes32) → bool` | view | True only if it exists, isn't revoked, **and its issuer is still valid** |
| `getCertificateInfo(bytes32)` | view | `(issuer, issuedAt, revoked, revokedAt)` |
| `transferAdmin(address newAdmin)` | `onlyAdmin` | — |

Public state: `admin`, `walletRegistry`, `certificates`.
Events: `CertificateStored`, `CertificateRevoked`, `AdminTransferred`.

**The design point worth understanding:** `isValidCertificate` re-checks the
issuer's standing in `WalletRegistry` on *every* call, rather than trusting the
check performed at storage time. That is what makes a single `revokeWallet`
transaction invalidate every certificate that institution ever issued —
retroactively and without touching a single certificate record.

### `IWalletRegistry.sol`

One-function interface (`isValidIssuer`) so `CertificateRegistry` can call the
registry without importing its implementation.

---

## Setup

```bash
cd contracts
npm install
```

`hardhat.config.js` loads the **repo-root** `.env` (`../.env`), not
`contracts/.env`. It needs:

```bash
RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=<key with Base Sepolia ETH>   # ⚠ never commit
```

The deployer becomes the admin of both contracts and is the same key the backend
uses as `DEPLOYER_PRIVATE_KEY` for `mapWallet` / `revokeWallet`. Keep them in
sync — if they diverge, the backend's admin calls revert with
`caller is not admin`.

---

## Compile and test

```bash
npx hardhat compile
npx hardhat test
REPORT_GAS=true npx hardhat test
```

The suite covers deployment, mapping, revocation, storage, duplicate rejection,
timestamps, admin transfer, access control on every guarded function, and — the
important one — that `isValidCertificate` returns `false` once the issuer wallet
is revoked.

---

## Deploy

### Everything at once (recommended)

```bash
npx hardhat run scripts/deploy-all.js --network baseSepolia
```

Deploys `WalletRegistry`, then `CertificateRegistry` wired to it, and writes
`deployed-addresses.json` with the deployer, network, both addresses, and a
timestamp.

### Individually

```bash
npx hardhat run scripts/deploy-wallet-registry.js --network baseSepolia
npx hardhat run scripts/deploy-certificate-registry.js --network baseSepolia
```

### Locally

```bash
npx hardhat node                                                    # terminal 1
npx hardhat run scripts/deploy-all.js --network localhost           # terminal 2
```

### After deploying

The addresses are referenced in three places. All three must be updated:

1. `backend` env — `CONTRACT_WALLET_REGISTRY`, `CONTRACT_CERT_REGISTRY`
2. `frontend/src/wallet/walletService.js` — `CERT_REGISTRY_ADDRESS` is hardcoded
3. `README.md` and `deployed-addresses.json`

---

## Current deployment

Base Sepolia, per [`deployed-addresses.json`](deployed-addresses.json):

| Contract | Address |
| :--- | :--- |
| WalletRegistry | `0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6` |
| CertificateRegistry | `0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9` |
| Deployer / admin | `0xFA258b9F026aCA36000374c795F6656f370AC33e` |

Network: chain ID `84532` · RPC `https://sepolia.base.org` · explorer
`https://sepolia.basescan.org`.

---

## Custom tasks

```bash
npx hardhat check-block   --network baseSepolia   # current block number
npx hardhat check-balance --network baseSepolia   # deployer address + ETH balance
```

---

## Console recipes

```bash
npx hardhat console --network baseSepolia
```

```javascript
const wr = (await ethers.getContractFactory("WalletRegistry")).attach("0x82ee...");
const cr = (await ethers.getContractFactory("CertificateRegistry")).attach("0xb5B0...");

await wr.mapWallet("0xISSUER");
await wr.isValidIssuer("0xISSUER");

// Certificate hashes are the backend's canonical SHA-256, hex-prefixed —
// not keccak256 of arbitrary text.
await cr.isValidCertificate("0x" + "<64-hex-char hash>");
await cr.getCertificateInfo("0x" + "<64-hex-char hash>");
```

**Revoking a single certificate** has no API route in the backend — the contract
function exists and `revokeCertificateOnChain()` is defined but unreferenced. Do
it from the console as admin:

```javascript
await cr.revokeCertificate("0x" + "<64-hex-char hash>");
```

Verification will then report `REVOKED_ON_CHAIN`.

---

## Security notes

- The admin key controls the entire issuer allowlist. A multi-sig is the right
  answer for anything beyond a testnet.
- `transferAdmin` is the migration path off a compromised admin key — but only
  if you still control the current one. There is no recovery otherwise.
- Never commit `.env` or a private key. See [../SECURITY.md](../SECURITY.md).
- Certificate hashes are public on chain. They reveal nothing on their own, but
  because the hash is deterministic over known fields, someone who can guess all
  eight fields can confirm a specific credential exists. Treat certificate
  existence as public information.

---

## Troubleshooting

| Error | Cause |
| :--- | :--- |
| `insufficient funds` | Deployer needs Base Sepolia ETH from a faucet |
| `caller is not admin` | Signing key isn't the deploying key — check `DEPLOYER_PRIVATE_KEY` |
| `caller is not a valid issuer` | `mapWallet` was never run for that address, or it was revoked |
| `certificate hash already exists` | All eight hashed fields match an existing certificate |
| `wallet already mapped` | Address is already in the allowlist |
| `nonce too high` | Reset the local Hardhat node, or wait for pending transactions |
| `invalid address` | Wrong `WalletRegistry` address passed to the `CertificateRegistry` deploy |

---

## Layout

```text
contracts/
├── contracts/
│   ├── WalletRegistry.sol
│   ├── CertificateRegistry.sol
│   └── IWalletRegistry.sol
├── scripts/
│   ├── deploy-all.js
│   ├── deploy-wallet-registry.js
│   └── deploy-certificate-registry.js
├── test/
│   ├── WalletRegistry.test.js
│   └── CertificateRegistry.test.js
├── deployed-addresses.json
└── hardhat.config.js
```

---

## License

MIT.

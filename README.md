# 🎓 CERTIFY — Trust Protocol for Decentralized Credentials

CERTIFY issues academic credentials as PDFs whose authenticity can be proven
without trusting CERTIFY. Every certificate is anchored to the **Base Sepolia**
blockchain as a deterministic SHA-256 hash and digitally signed with a PKCS#7
certificate, so a verifier with nothing but the PDF file can establish that a
named institution issued exactly this credential — and that the institution is
still authorized to have issued it.

---

## 📚 Documentation

| Document | What's in it |
| :--- | :--- |
| **[SETUP.md](SETUP.md)** | Zero to a verified certificate on your own machine, including the first-run role sequence |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | How it actually works: the canonical hash, the issuance pipeline, verify-then-hydrate, the PDF signature layer, the data model, and the known gaps |
| **[backend/API.md](backend/API.md)** | Every endpoint, with request/response shapes and status codes |
| **[backend/README.md](backend/README.md)** | Backend setup, environment, scripts, troubleshooting |
| **[frontend/README.md](frontend/README.md)** | Frontend setup, routes, role flows |
| **[contracts/README.md](contracts/README.md)** | Compiling, testing, deploying, and interacting with the contracts |
| **[deployment_instructions.md](deployment_instructions.md)** | Render + Vercel deployment |
| **[SECURITY.md](SECURITY.md)** | Which secrets exist, what each one can do, and what to do if one leaks |
| **[CLAUDE.md](CLAUDE.md)** | Working agreements for Claude Code: commands, invariants, gotchas |

---

## 🌟 What makes it verifiable

- **Deterministic hashing.** Eight certificate fields are canonicalized —
  recursively key-sorted, whitespace-free JSON — then SHA-256'd. The same data
  always produces the same hash, on any machine, in any key order.
- **Dual-layer proof.** The hash is anchored on chain; the canonical JSON is
  embedded in the PDF's `/Subject` metadata and the whole document is
  P12-signed. Either layer alone establishes something useful; together they
  cover both "was this issued?" and "was this file modified?".
- **Chain-first verification.** The verifier queries the blockchain *before*
  the database, and the database read is best-effort. A verification succeeds
  even if CERTIFY's database is down or gone.
- **Cascading revocation.** `isValidCertificate` re-checks the issuer's standing
  in `WalletRegistry` on every read, so revoking an institution's wallet
  invalidates every credential it ever issued — in one transaction.
- **Non-custodial issuance.** Issuers sign the anchoring transaction with their
  own MetaMask wallet. The server never holds an issuer's private key.
- **Privacy by omission.** Only a hash goes on chain. Names, emails, and course
  details stay in the database and inside the PDF.

---

## 🏗️ Repository layout

```text
Certify/
├── ARCHITECTURE.md      # deep technical reference
├── backend/             # Express API
│   ├── API.md           # endpoint reference
│   ├── schema.sql       # PostgreSQL schema (8 tables)
│   ├── scripts/         # reset-db, check-schema, test-api
│   └── src/
│       ├── config/      # env validation, ethers provider + contract handles
│       ├── db/          # pg pool + query helpers
│       ├── middleware/  # JWT, role, issuer-signature
│       └── modules/     # auth, studentAuth, admin, walletAuth,
│                        #   wallets, certificates, verification
├── contracts/           # Hardhat workspace
│   ├── contracts/       # WalletRegistry, CertificateRegistry, IWalletRegistry
│   ├── scripts/         # deploy-all + per-contract deploys
│   └── test/            # 40+ contract tests
└── frontend/            # React 18 + Vite SPA
    └── src/
        ├── api/         # axios client + typed API wrappers
        ├── context/     # AuthContext
        ├── wallet/      # MetaMask + on-chain write
        ├── components/  # layout, route guards, UI bits
        └── pages/       # landing, login, student, admin, issuer, owner, verifier
```

---

## 🛠️ Tech stack

**Frontend** — React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios,
Ethers v6, Lucide icons.

**Backend** — Node.js 18+, Express 4, PostgreSQL (`pg` pool), JWT + bcrypt,
Ethers v6, `pdf-lib`, `@signpdf/*`, `node-forge`, `qrcode`, `multer`.

**Chain** — Solidity 0.8.20, Hardhat, Base Sepolia (chain ID `84532`).

---

## 🚀 Quick start

The condensed version. [SETUP.md](SETUP.md) has the full walkthrough, including
the order the roles have to be created in and a troubleshooting table.

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon works well)
- MetaMask, switched to Base Sepolia
- A little Base Sepolia ETH for the issuer wallet

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Certify
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
cd contracts && npm install && cd ..
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Fill in `DATABASE_URL`, a `JWT_SECRET` of at least 32 characters, `RPC_URL`,
both contract addresses, `DEPLOYER_PRIVATE_KEY`, `ADMIN_WALLET_ADDRESS`, and the
P12 signing pair. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

For local PDF signing, generate a self-signed certificate — this writes the
`.p12` and patches `P12_BASE64` and `P12_PASSWORD` straight into your `.env`:

```bash
cd backend
node generate-cert.js --write-env
node test-signing.js              # confirm: sign → verify → tamper → reject
```

Configuration resolves `backend/.env` first, then a repo-root `.env`, then
host-injected variables — so it doesn't matter which directory you run from.

### 3. Create the database

```bash
psql "$DATABASE_URL" -f backend/schema.sql
```

Or, to drop everything and reseed with working admin credentials:

```bash
node backend/scripts/reset-db.js
```

Use `reset-db.js` rather than the `INSERT` at the bottom of `schema.sql` — that
one contains a placeholder password hash that cannot be logged into. The script
seeds a single admin, **`admin@certify.com` / `Admin@123`**; change it before
exposing the service to anything.

### 4. Run

```bash
cd backend  && npm run dev     # http://localhost:<PORT>
cd frontend && npm run dev     # http://localhost:5173
```

Locally, `frontend/.env` can leave `VITE_API_URL` unset — the Vite dev proxy
forwards `/api` to `BACKEND_URL` (default `http://localhost:3000`; set it if the
backend's `PORT` differs). For a deployed frontend, `VITE_API_URL` must be the
backend **origin only**; the production build fails without it rather than
shipping a bundle that calls localhost.

---

## 👤 Getting to a first certificate

The roles depend on each other in a fixed order, so the first run has to follow
this sequence:

1. **Admin logs in** at `/admin/login` — connect the wallet matching
   `ADMIN_WALLET_ADDRESS`, then enter the seeded email and password.
2. **Admin creates an issuer** on the dashboard. Save the temporary password
   that comes back; it is shown once.
3. **Admin maps the issuer's wallet.** This sends a real `mapWallet`
   transaction. Nothing works for the issuer until this succeeds.
4. **Student registers** at `/student-onboard` — email → OTP → password. In
   development the OTP comes back in the API response and in the server log.
5. **Issuer logs in**, connects MetaMask on Base Sepolia, verifies the wallet,
   and signs the challenge message to get a 5-minute signing token.
6. **Issuer issues a certificate.** The student's email must already be
   registered from step 4. MetaMask prompts once to anchor the hash on chain.
7. **Anyone verifies** at `/verify` by dropping the PDF in — no account needed.

---

## ⛓️ Deployed contracts

Base Sepolia (chain ID `84532`) — canonical source:
[`contracts/deployed-addresses.json`](contracts/deployed-addresses.json)

| Contract | Address |
| :--- | :--- |
| **WalletRegistry** | [`0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6`](https://sepolia.basescan.org/address/0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6) |
| **CertificateRegistry** | [`0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9`](https://sepolia.basescan.org/address/0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9) |

---

## ✅ Testing

```bash
cd contracts && npx hardhat test        # 40+ contract tests
cd backend   && node test-signing.js    # PDF sign → verify → tamper → reject
```

There is no automated test suite for the backend HTTP layer.
`backend/scripts/test-api.ps1` exists but is stale — it registers an `ISSUER`
through `/auth/register`, which no longer accepts that role.

---

## ⚠️ Before production

This is a working testnet system, not a hardened production one. The blocking
items — a real email provider for OTPs (the code currently returns the OTP in
the response), CORS restricted to known origins, rate limiting, durable PDF
storage, and a fix for `POST /api/auth/register` — are listed with their impact
in [ARCHITECTURE.md §11](ARCHITECTURE.md#11-known-gaps).

---

## 📝 License

MIT.

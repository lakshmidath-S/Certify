# CERTIFY — Local Setup

Zero to a verified certificate on your own machine. Budget about 20 minutes,
most of it waiting on `npm install` and a MetaMask faucet.

For what any of it means, see [ARCHITECTURE.md](ARCHITECTURE.md). For
production, see [deployment_instructions.md](deployment_instructions.md).

---

## 1. Prerequisites

| Requirement | Notes |
| :--- | :--- |
| **Node.js 18+** | `node --version`. The backend uses `node --watch`, which needs 18+ |
| **PostgreSQL** | A hosted database is easiest — [Neon](https://neon.tech) has a free tier. A local instance works too |
| **MetaMask** | Browser extension. Issuance and admin login both require it |
| **Base Sepolia ETH** | Only for the issuer and deployer wallets. Free from a [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia) |
| **`psql`** *(optional)* | Only if you want to apply the schema manually instead of using the reset script |

You do **not** need to deploy contracts — working ones are already live on Base
Sepolia and their addresses ship in `.env.example`.

---

## 2. Install

```bash
git clone <your-repo-url>
cd Certify

cd backend   && npm install && cd ..
cd frontend  && npm install && cd ..
cd contracts && npm install && cd ..     # only if you'll touch the contracts
```

---

## 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

The backend resolves `backend/.env` first and falls back to a repo-root `.env`,
so either location works and it no longer matters which directory you run
commands from.

Fill in `backend/.env`:

```bash
# ── Database ──
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# ── Server ──
PORT=3000
NODE_ENV=development

# ── JWT ──
JWT_SECRET=<paste the generated secret — 32+ characters>
JWT_EXPIRES_IN=1h

# ── Blockchain (these defaults work as-is) ──
RPC_URL=https://sepolia.base.org
CONTRACT_WALLET_REGISTRY=0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6
CONTRACT_CERT_REGISTRY=0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9
DEPLOYER_PRIVATE_KEY=<a funded Base Sepolia key you control>
ADMIN_WALLET_ADDRESS=<the MetaMask address you'll use as admin>

# ── PDF signing (filled in by the next step) ──
P12_BASE64=
P12_PASSWORD=
```

Generate the JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### About `DEPLOYER_PRIVATE_KEY`

This is the **contract admin key** — it authorizes and revokes issuers, and it
pays gas for both. Two things matter:

- It must be the wallet that deployed the contracts you point at. If you use the
  shipped addresses, you don't hold that key, so `mapWallet` will revert with
  `caller is not admin`. **To run the full flow yourself, deploy your own
  contracts** — see §7.
- Use a throwaway wallet holding only testnet ETH. Never a wallet with real
  funds.

`ADMIN_WALLET_ADDRESS` is separate: it's just the address the admin login screen
accepts as a first factor. It can be any address you control in MetaMask.

---

## 4. Generate the PDF signing certificate

Certificate signing reads a Base64-encoded `.p12` from the environment — there
is no filesystem fallback. One command does everything:

```bash
cd backend
node generate-cert.js --write-env
```

That writes `certs/certificate.p12` (git-ignored) and patches `P12_BASE64` and
`P12_PASSWORD` into your `.env` in place. If `P12_PASSWORD` was already set it
reuses it, so re-running won't invalidate an existing setup.

Omit `--write-env` to print the values instead of patching.

Verify it works:

```bash
node test-signing.js
```

Expect `=== All tests passed! ===` — it signs a PDF, verifies it, tampers with
it, and confirms the tampered copy is rejected.

> The generated certificate is self-signed. CERTIFY's own verifier validates it
> fine, but Adobe Acrobat will not show it as trusted. Use a CA-issued `.p12`
> in production.

---

## 5. Create the database

```bash
cd backend
node scripts/reset-db.js
```

This drops every table, applies `schema.sql`, and seeds an admin with a real
bcrypt hash:

```
admin@certify.com / Admin@123
```

Change that password before the service is reachable by anyone else.

You can apply `schema.sql` manually instead — but the `INSERT` at the bottom of
it seeds a **placeholder** password hash that no password matches, so you'd have
no way in. Use the script.

Sanity check the connection:

```bash
node scripts/check-schema.js     # prints the live `wallets` columns
```

---

## 6. Configure and run the frontend

```bash
# frontend/.env  — optional for local development
VITE_API_URL=
BACKEND_URL=http://localhost:3000
```

Locally you can leave `VITE_API_URL` empty: the client then calls `/api` on its
own origin and the Vite dev proxy forwards that to `BACKEND_URL` (default
`http://localhost:3000` — set it if the backend's `PORT` differs).

To point the dev server straight at a deployed backend instead, set
`VITE_API_URL` to its **origin only**; a trailing slash or an accidental `/api`
suffix is normalised away. It is inlined at build time, so changing it means
restarting the dev server — and `npm run build` refuses to produce a production
bundle when it is unset or points at localhost.

Run both, in two terminals:

```bash
cd backend  && npm run dev      # http://localhost:3000
cd frontend && npm run dev      # http://localhost:5173
```

The backend pings the database before it starts listening, so if it prints
`✅ Database connected successfully` your `DATABASE_URL` is good. Confirm the
API directly:

```bash
curl http://localhost:3000/api/health
```

---

## 7. Optional — deploy your own contracts

Needed only if you want to run wallet mapping yourself, since that requires
being the contracts' admin.

```bash
cd contracts
npx hardhat test                                            # sanity check
npx hardhat run scripts/deploy-all.js --network baseSepolia
```

The deployer becomes admin of both contracts. Addresses are written to
`deployed-addresses.json`. Then update **all three** places that reference them:

1. `backend/.env` → `CONTRACT_WALLET_REGISTRY`, `CONTRACT_CERT_REGISTRY`
2. `frontend/src/wallet/walletService.js` → `CERT_REGISTRY_ADDRESS` (hardcoded)
3. `backend/.env` → `DEPLOYER_PRIVATE_KEY` must be the deploying key

Miss step 2 and issuance anchors to one registry while verification reads
another — every certificate comes back `NOT_ON_CHAIN`.

Hardhat reads the repo-root `.env` for `RPC_URL` and `DEPLOYER_PRIVATE_KEY`.

---

## 8. First run — the role sequence

The roles depend on each other, so the first pass has to go in this order.

### 1. Admin logs in — `/admin/login`

Connect the MetaMask account matching `ADMIN_WALLET_ADDRESS`, then sign in with
`admin@certify.com` / `Admin@123`.

### 2. Admin creates an issuer

On the dashboard, fill in the institution details. A **temporary password** is
returned — copy it, it's shown once.

### 3. Admin maps the issuer's wallet

Enter the issuer's MetaMask address and map it. This sends a real transaction
from `DEPLOYER_PRIVATE_KEY` and takes a few seconds to confirm.

Nothing works for the issuer until this succeeds. If it reverts with `caller is
not admin`, see §7.

### 4. Student registers — `/student-onboard`

Email → OTP → password. **In development the OTP comes back in the API response
and is printed to the backend console** — no email is sent.

### 5. Issuer logs in — `/login`

Use the official email and the temporary password from step 2. Then, on the
dashboard:

1. Connect MetaMask and switch to Base Sepolia (the page offers a button).
2. Verify the wallet — confirms step 3 landed.
3. Authorize — sign the challenge message. This yields a **5-minute** signing
   token; if you take longer, just sign again.

### 6. Issuer issues a certificate

Fill the form using the **student's registered email** from step 4 — issuance
fails if the student doesn't exist. MetaMask prompts once to anchor the hash on
chain; approve it and wait for confirmation.

### 7. Student downloads — `/owner/dashboard`

Log in as the student and download the PDF.

### 8. Anyone verifies — `/verify`

Drop the PDF in. No login required. A `VALID` result means the whole pipeline —
canonical hashing, on-chain anchoring, PDF signing, and verification — is
working.

---

## 9. Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `Missing required environment variables` | The log names them. Check `backend/.env` exists and is filled in |
| `JWT_SECRET must be at least 32 characters long` | Regenerate with the command in §3 |
| Server starts but `/api/health` says `"database": "disconnected"` | The startup DB check exhausted its retries — wrong `DATABASE_URL`, IP not allowlisted, or the provider needs TLS. TLS is derived from the URL; force it with `DATABASE_SSL=true` |
| `P12_BASE64 environment variable is not set` | Run `node generate-cert.js --write-env` (§4) |
| `Cannot find module 'node-forge'` | `npm install` wasn't run in `backend/` |
| Frontend calls the wrong backend in dev | `BACKEND_URL` (the dev proxy target) and the backend's `PORT` disagree; restart the Vite dev server after changing `.env` |
| A deployed frontend works for you but for nobody else | It was built with a localhost `VITE_API_URL`. Rebuild with the public backend origin — the build now rejects the localhost value |
| `caller is not admin` when mapping a wallet | `DEPLOYER_PRIVATE_KEY` isn't the contracts' deployer. Deploy your own (§7) |
| `Wallet not mapped. Contact admin.` | Step 3 hasn't been completed for that address |
| `Wallet is not a valid issuer on blockchain` | The map transaction never confirmed, or the wallet was revoked |
| `Signing token expired. Please sign again.` | The token lives 5 minutes — re-authorize |
| `No registered student found with email: …` | Complete step 4 first |
| `Duplicate certificate hash` | All eight hashed fields match an existing certificate. Vary one |
| MetaMask never prompts during issuance | Wrong network — switch to Base Sepolia (chain ID 84532) |
| Issuance reverts at the MetaMask step | The issuer wallet has no Base Sepolia ETH for gas |
| Verification returns `CHAIN_ERROR` | The RPC endpoint is unreachable — inconclusive, not a verdict on the certificate |
| Verification returns `NOT_ON_CHAIN` for a fresh certificate | Frontend and backend point at different `CertificateRegistry` addresses (§7, step 2) |

---

## 10. Reset

```bash
cd backend
node scripts/reset-db.js         # wipes and reseeds the database
rm -rf storage/certificates      # clears locally stored PDFs
```

On-chain data cannot be reset. Hashes already anchored stay anchored, so after
wiping the database those certificates still verify — just without the
human-readable details, which is the design working as intended.

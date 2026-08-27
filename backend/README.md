# CERTIFY Backend

Express API for the CERTIFY credential platform. Owns the canonical hash, PDF
generation and signing, blockchain reads, admin-side chain writes, and the
verification pipeline.

- **Endpoint reference** → [API.md](API.md)
- **How the pieces fit together** → [../ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Stack

Node.js 18+ · Express 4 · PostgreSQL via `pg` pool · JWT + bcrypt · Ethers v6 ·
`pdf-lib` · `@signpdf/signpdf` + `@signpdf/signer-p12` + `@signpdf/placeholder-pdf-lib` ·
`node-forge` · `qrcode` · `multer`.

No build step — plain CommonJS, run directly.

---

## Layout

```text
backend/
├── API.md                 # endpoint reference
├── schema.sql             # 8 tables + indexes + RLS policies + seed
├── generate-cert.js       # self-signed .p12 + Base64 for P12_BASE64
├── test-signing.js        # sign → verify → tamper → must reject
├── scripts/
│   ├── reset-db.js        # drop, re-apply schema, seed real admin hashes
│   ├── check-schema.js    # print the live `wallets` table shape
│   └── test-api.ps1       # manual smoke pass
└── src/
    ├── server.js          # boot: DB ping, listen, SIGTERM/SIGINT drain
    ├── app.js             # cors, json (10 MB), request log, /api, error handler
    ├── config/
    │   ├── loadEnv.js     # deterministic .env resolution (backend/ then root)
    │   ├── env.js         # fail-fast validation; exports typed config
    │   └── blockchain.js  # provider, admin signer, contract handles, chain calls
    ├── db/pool.js         # pool, timed query(), getClient() for transactions
    ├── middleware/
    │   ├── authMiddleware.js         # Bearer JWT → req.user
    │   ├── roleMiddleware.js         # requireRole('ADMIN', ...)
    │   └── requireIssuerSignature.js # 5-min signing token → req.issuerWallet
    ├── routes/index.js    # mounts every module under /api
    └── modules/
        ├── auth/          # login, profile, wallet gate checks
        ├── studentAuth/   # OTP request → verify → complete registration
        ├── admin/         # create issuer, list issuers
        ├── walletAuth/    # challenge → signature → signing token
        ├── wallets/       # map / revoke (on-chain + DB, transactional)
        ├── certificates/  # prepare, issue, list, download
        │   ├── hash.js       # canonical JSON + SHA-256  ← the core
        │   ├── pdf.js        # pdf-lib render, /Subject metadata, sig placeholder
        │   ├── signPdf.js    # P12 signing from P12_BASE64
        │   └── qr.js         # QR PNG of the hash
        └── verification/
            ├── service.js         # verify-then-hydrate
            └── verifySignature.js # PKCS#7 verification via node-forge
```

Every module follows the same three-file shape: `routes.js` (paths + middleware)
→ `controller.js` (validation + HTTP shaping) → `service.js` (business logic,
database, chain). Keep new modules to that shape.

---

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

### Environment

`src/config/env.js` exits at boot if any of `DATABASE_URL`, `JWT_SECRET`,
`RPC_URL`, `CONTRACT_WALLET_REGISTRY`, or `CONTRACT_CERT_REGISTRY` is missing,
or if `JWT_SECRET` is under 32 characters.

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
PORT=3000
NODE_ENV=development
FRONTEND_URL=            # exact browser origin allowed by CORS; unset = all

JWT_SECRET=<at least 32 characters>
JWT_EXPIRES_IN=1h

RPC_URL=https://sepolia.base.org
CONTRACT_WALLET_REGISTRY=0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6
CONTRACT_CERT_REGISTRY=0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9
DEPLOYER_PRIVATE_KEY=<admin wallet key — signs WalletRegistry writes only>
ADMIN_WALLET_ADDRESS=0x<address the admin login screen accepts>

P12_BASE64=<base64 of the .p12 file>
P12_PASSWORD=<its passphrase>
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**`.env` location.** Everything loads through `src/config/loadEnv.js`, which
takes `backend/.env` if it exists and otherwise the repo-root `.env`, then falls
back to host-injected variables. The server, all scripts, and `test-signing.js`
share that resolution, so it no longer matters which directory you run from.
`contracts/hardhat.config.js` reads the repo-root `.env` directly.

**The P12 variable is `P12_BASE64`, not `P12_FILE_PATH`.** Signing moved from the
filesystem to an environment variable so the service can run on ephemeral hosts.
There is no filesystem fallback; `P12_FILE_PATH` is ignored.

### Generate a signing certificate (development)

```bash
node generate-cert.js --write-env    # generate + patch P12_BASE64 into .env
node generate-cert.js                # generate + print the values instead
```

The passphrase comes from `P12_PASSWORD` when it is already set, so re-running
will not invalidate an existing configuration. `certs/` is git-ignored.

Confirm it works with `node test-signing.js`. Use a real CA-issued certificate in
production — a self-signed one will not show as trusted in Adobe Acrobat, though
CERTIFY's own verifier still validates it.

### Database

```bash
psql "$DATABASE_URL" -f schema.sql
```

Prefer the reset script for a fresh environment — it applies the schema and
seeds admin accounts with real bcrypt hashes:

```bash
node scripts/reset-db.js
```

The `INSERT` at the end of `schema.sql` seeds `admin@certify.com` with a
**placeholder** hash that no password matches. It exists to keep the schema
self-contained, not to give you a usable login.

### Migrations

There is no migration runner. `migrations/` holds dated SQL files to apply by
hand, newest last, against databases created before the change they describe.
Databases created fresh from `schema.sql` already include them.

```bash
psql "$DATABASE_URL" -f migrations/2026-08-26-email-case-insensitive.sql
```

Read each file before running it — some begin with a check query whose result
decides whether the rest is safe to apply.

---

## Run

```bash
npm run dev     # node --watch src/server.js
npm start       # node src/server.js
```

On boot the server pings the database and refuses to listen if that fails, then
prints the environment, RPC URL, and both contract addresses.

> **Port:** single source of truth is `config.server.port`
> (`process.env.PORT || 3000`), matching the frontend default and the Vite dev
> proxy.

---

## Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Watch-mode server |
| `npm start` | Production server |
| `node scripts/reset-db.js` | **Destructive.** Drops all tables, re-applies the schema, seeds admins |
| `node scripts/check-schema.js` | Prints the live `wallets` table columns |
| `node generate-cert.js [--write-env]` | Writes a self-signed `certs/certificate.p12`; `--write-env` patches `P12_BASE64` into `.env` |
| `node test-signing.js` | Signs a PDF, verifies it, tampers with it, and asserts rejection |
| `scripts/test-api.ps1` | ⚠ **Stale.** Registers an `ISSUER` through `/auth/register`, which only accepts `OWNER`. Health check and login sections still work |

`reset-db.js` seeds one admin: **`admin@certify.com` / `Admin@123`**. It is a
development default printed to the console on every run — change it before any
deployment that is reachable from the internet.

---

## Conventions

**Responses.** `{ success: true, ... }` or `{ success: false, error }`. The
error handler in `app.js` adds `stack` only when `NODE_ENV` is not
`production`.

TLS for Postgres is decided in `db/pool.js` from `DATABASE_URL` — on for any
remote host, off for `localhost`, `sslmode=disable` respected, `DATABASE_SSL`
overriding all of it. It is not tied to `NODE_ENV`. The startup check no longer
blocks `app.listen`: the port binds first and the database is retried five times
with backoff, with the outcome reported by `GET /api/health` as
`database: "connected" | "disconnected"`.

**Transactions.** Anything touching the chain *and* the database uses
`db.getClient()` with explicit `BEGIN` / `COMMIT` / `ROLLBACK` and a `finally`
release — see `wallets/service.js` and `certificates/service.js`. Chain calls go
*inside* the transaction so a revert rolls back the row.

**Audit logging.** Every state-changing action writes to `audit_logs`, including
failures. In `issueCertificate` the failure log is deliberately written after
`ROLLBACK` so it survives.

**Chain errors.** `blockchain.js` unwraps `error.reason` / `error.data.message` /
`error.shortMessage` so the real revert reason — `"WalletRegistry: wallet
already mapped"` — reaches the client instead of a generic message.

**Nonces.** `mapWallet` and `revokeWallet` pass an explicit `nonce` from
`adminSigner.getNonce()` to avoid stale-nonce collisions across back-to-back
admin transactions.

---

## Troubleshooting

| Symptom | Cause |
| :--- | :--- |
| `Missing required environment variables` at boot | No `backend/.env` or repo-root `.env`, or a variable genuinely unset — the log names them |
| `JWT_SECRET must be at least 32 characters long` | Exactly that; regenerate |
| `P12_BASE64 environment variable is not set` | Run `node generate-cert.js --write-env` |
| `Failed to start server` right after launch | The startup `SELECT NOW()` failed — bad `DATABASE_URL`, IP not allowlisted, or SSL mismatch |
| `Wallet is not a valid issuer on blockchain` | The wallet exists in the database but `mapWallet` never landed on chain, or it was revoked |
| `Signing token expired. Please sign again.` | The 5-minute signing token lapsed — re-sign the challenge |
| `No registered student found with email: …` | The student must complete `/student-auth/*` before a certificate can be issued to them |
| `Duplicate certificate hash` / `certificate hash already exists` | All eight hashed fields match an existing certificate — the hash is a content identity, so vary a field |
| Verification returns `CHAIN_ERROR` | The RPC endpoint is unreachable. Inconclusive, not a verdict on the certificate |
| Downloaded PDF fails a signature check | It was regenerated after the stored file was lost; regenerated PDFs aren't re-signed |

---

## Known gaps

OTPs are returned in the API response instead of emailed, CORS is fully open,
there is no rate limiting, and certificate-level revocation has no route. The
full list with impact is in
[ARCHITECTURE.md §11](../ARCHITECTURE.md#11-known-gaps).

---

## License

MIT.

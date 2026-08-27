# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

CERTIFY issues academic credentials as PDFs that can be verified without
trusting the CERTIFY server. Each certificate's canonical SHA-256 hash is
anchored on Base Sepolia by the issuing institution's own MetaMask wallet, and
the PDF is digitally signed with a P12 certificate.

Three workspaces, each with its own `package.json`: `backend/` (Express API),
`frontend/` (React + Vite SPA), `contracts/` (Hardhat + Solidity).

Read [ARCHITECTURE.md](ARCHITECTURE.md) before touching hashing, signing, or
verification — those three are coupled and load-bearing.

## Commands

```bash
# backend (from backend/)
npm run dev                  # watch-mode server
npm start                    # production server
node test-signing.js         # PDF sign → verify → tamper → reject
node scripts/reset-db.js     # DESTRUCTIVE: drop, re-apply schema, seed admin
node scripts/check-schema.js # print live `wallets` columns
node generate-cert.js --write-env   # new self-signed P12, patched into .env

# frontend (from frontend/)
npm run dev                  # http://localhost:5173
npm run build

# contracts (from contracts/)
npx hardhat test
npx hardhat run scripts/deploy-all.js --network baseSepolia
```

There is no backend test suite and no linter configured. `test-signing.js` and
the Hardhat tests are the only automated checks — run both after changes that
touch signing or the contracts.

## Invariants — do not break these casually

**The hashed field set is frozen.** `backend/src/modules/certificates/hash.js`
hashes exactly eight fields: `ownerName`, `courseName`, `department`,
`issueMonth`, `issueYear`, `graduationMonth`, `graduationYear`, `issuerWallet`.
Adding, removing, renaming, or changing the string coercion of any of them
changes every hash and orphans every certificate already anchored on chain.
There is no migration path — old certificates would verify as `NOT_ON_CHAIN`.

**Verification is chain-first, DB-best-effort.** In
`modules/verification/service.js` the blockchain is queried before the database,
and the DB read is wrapped in `.catch()` so an outage degrades detail rather
than failing the verification. Never reorder these or let a DB error propagate.

**`prepare` and `issue` are deliberately two calls.** The chain write happens
between them, in the browser, so the issuer's private key never reaches the
server. Do not "simplify" this into one server-side endpoint.

**`pdfDoc.save({ useObjectStreams: false })` is required.** Object streams
relocate the signature placeholder and break `ByteRange`, so signing silently
produces unverifiable PDFs.

**The canonical JSON goes in the PDF's `/Subject`.** That is what makes a PDF
verifiable offline and lets a lost PDF be regenerated and still match its
on-chain hash.

**Two different wallets sign on chain.** The server's `DEPLOYER_PRIVATE_KEY`
only ever calls `WalletRegistry.mapWallet` / `revokeWallet`. The issuer's
MetaMask only ever calls `CertificateRegistry.storeCertificateHash`. Never make
the server sign a certificate anchor.

## Conventions

**Module shape.** Every backend module is `routes.js` (paths + middleware) →
`controller.js` (validation + HTTP shaping) → `service.js` (business logic, DB,
chain). Keep new modules to this shape; don't put queries in controllers.

**Responses.** `{ success: true, ... }` or `{ success: false, error }`.

**Transactions.** Anything touching both the chain and the database uses
`db.getClient()` with explicit `BEGIN` / `COMMIT` / `ROLLBACK` and a `finally`
release. The chain call goes *inside* the transaction so a revert rolls the row
back. See `wallets/service.js`.

**Audit logs.** Every state-changing action writes to `audit_logs`, failures
included.

**SQL.** Always parameterized. Placeholders must be contiguous `$1..$n` and
match the array length — a mismatch throws at runtime, not at load.

**Env access.** Load via `require('./config/loadEnv')` (or
`../src/config/loadEnv` from scripts), never bare `dotenv.config()`. It resolves
`backend/.env` first, then the repo-root `.env`, so behaviour doesn't depend on
the working directory.

## Gotchas

- **`P12_BASE64`, not `P12_FILE_PATH`.** Signing reads the certificate from a
  Base64 env var; there is no filesystem fallback. Regenerate with
  `node generate-cert.js --write-env`.
- **The contract address defaults in the frontend.**
  `frontend/src/wallet/walletService.js` falls back to a hardcoded
  `CERT_REGISTRY_ADDRESS`; `VITE_CERT_REGISTRY_ADDRESS` overrides it. If
  contracts are redeployed it must be changed alongside the backend env, or
  issuance anchors to one registry while verification reads another.
- **`VITE_API_URL` is the origin only** — a trailing slash or an accidental
  `/api` is normalised away by `frontend/src/config/api.js`, which is the one
  place any caller resolves the base URL. It is inlined at build time, so
  changes need a rebuild, and `vite build` fails outright when it is unset or
  points at localhost. There is deliberately no localhost fallback: that
  fallback made a deploy work only from a machine running the backend locally.
- **Database TLS comes from `DATABASE_URL`, not `NODE_ENV`.** `db/pool.js`
  resolves it and strips the `sslmode`/`ssl` query parameters, because pg merges
  a parsed connection string *over* the options object and would otherwise
  silently override that decision.
- **The server binds the port before it touches the database.** The DB is
  verified in the background with backoff and reported by `/api/health`; do not
  move that check back in front of `app.listen`.
- **Certificate PDF writes are best-effort.** `certificates/storage.js` owns the
  path (`CERT_STORAGE_DIR`) and never throws — the hash is anchored on chain
  before the write, so a filesystem failure must not roll the transaction back.
- **Issuance requires a registered student.** `POST /certificates/issue`
  resolves `ownerEmail` against `users` and fails if the student hasn't signed
  up yet.
- **The hash is a content identity.** Identical values across all eight fields
  produce an identical hash, and both the contract and the service reject the
  duplicate. This is by design, not a bug.
- **Regenerated PDFs are not re-signed.** When the stored file is missing,
  `downloadCertificate` rebuilds the PDF; it verifies by canonical JSON but
  fails a PKCS#7 check.
- **`backend/storage/` and `backend/certs/` are git-ignored** and ephemeral on
  hosted environments.

## Security

Never commit `.env`, `*.p12`, or `*.pem`. `DEPLOYER_PRIVATE_KEY` is the contract
admin key — whoever holds it controls the entire issuer allowlist and cannot be
locked out except via `transferAdmin`. See [SECURITY.md](SECURITY.md).

When editing docs or writing examples, use placeholder values; do not copy real
values out of `.env` into any file or into terminal output.

## Known gaps

Tracked with impact in [ARCHITECTURE.md §11](ARCHITECTURE.md#11-known-gaps).
The open blockers for production: OTPs are returned in the API response instead
of emailed, CORS is open unless `FRONTEND_URL` is set, there is no rate
limiting, PDF storage is local disk, and certificate-level revocation has no API
route.

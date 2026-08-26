# 🔒 CERTIFY — Security Guide

What secrets this project holds, what each one can do in the wrong hands, and
what to do when one leaks. Architecture-level security properties live in
[ARCHITECTURE.md](ARCHITECTURE.md); this document is about operational secrets.

---

## 1. The secrets, and what each one costs you

Ranked by blast radius.

| Secret | Where it lives | What an attacker can do with it | Rotation |
| :--- | :--- | :--- | :--- |
| **`DEPLOYER_PRIVATE_KEY`** | Backend env, Hardhat env | This is the **contract admin key**. Map arbitrary wallets as authorized issuers, revoke any institution, revoke any certificate, transfer the admin role away permanently, and drain the wallet's ETH. | Cannot be rotated. `transferAdmin` to a new key, then treat the old one as burned. |
| **`P12_BASE64`** + **`P12_PASSWORD`** | Backend env | Forge PDFs that pass CERTIFY's digital-signature check. Cannot fake an on-chain anchor, so a forged PDF still verifies as `NOT_ON_CHAIN` — but it defeats the offline-authenticity layer. | Generate a new `.p12`, re-encode, redeploy. Previously issued PDFs then fail signature checks. |
| **`JWT_SECRET`** | Backend env | Forge access tokens for any user and role — including `ADMIN` — and forge 5-minute issuer signing tokens. Full API-level compromise. | Replace and redeploy. Every session is invalidated, which is the point. |
| **`DATABASE_URL`** | Backend env | Read every user record, email, and bcrypt hash; alter certificate records. Cannot forge a credential — verification reads the chain first. | Rotate the database password; update everywhere. |
| **`ADMIN_WALLET_ADDRESS`** | Backend env | Not secret (it's a public address), but if changed it controls who may reach the admin login screen. Treat as integrity-sensitive, not confidential. | Update the value. |

Not secret, safe in git: `RPC_URL`, `CONTRACT_WALLET_REGISTRY`,
`CONTRACT_CERT_REGISTRY`, `VITE_API_URL`, contract addresses, certificate
hashes.

**The pattern worth internalising:** losing `JWT_SECRET`, `P12_BASE64`, or
`DATABASE_URL` is bad but recoverable. Losing `DEPLOYER_PRIVATE_KEY` means
someone else can authorize issuers on your registry, and the only remedy is
migrating admin control — or redeploying the contracts and re-anchoring
everything.

---

## 2. Where `.env` files live

Every backend entry point resolves configuration through
`backend/src/config/loadEnv.js`, which takes the first file that exists:

1. `backend/.env`
2. repo-root `.env`

and otherwise falls back to host-injected variables. `contracts/hardhat.config.js`
loads the repo-root `.env` directly, which is the right file for Hardhat.

Both locations are git-ignored. In production a `.env` file should exist in
**neither** — hosts inject environment variables directly, and no `.env` should
ever be deployed.

`.gitignore` already excludes `.env`, `.env.local`, `.env.*.local`, `*.p12`,
`*.pem`, `backend/certs/`, and `backend/storage/`. Verify before your first
commit:

```bash
git check-ignore -v .env backend/certs/certificate.p12
git status --short
```

---

## 3. Setting up a new environment

```bash
cp backend/.env.example backend/.env

# 32-byte JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Development signing certificate — writes the .p12 and patches
# P12_BASE64 + P12_PASSWORD into the resolved .env, without printing the secret
cd backend
node generate-cert.js --write-env
node test-signing.js
```

Drop `--write-env` to print the values instead of patching. The variable is
`P12_BASE64` — `P12_FILE_PATH` is no longer read, and there is no filesystem
fallback.

Use a **dedicated deployer wallet** holding only testnet ETH. Never point
`DEPLOYER_PRIVATE_KEY` at a wallet with real funds or an identity you care
about.

---

## 4. If a secret leaks

Act in this order.

### `DEPLOYER_PRIVATE_KEY`

1. From the compromised key, immediately `transferAdmin` on **both** contracts to
   a fresh wallet — do this before anything else; it is a race.
2. Move any ETH out of the old wallet.
3. Update `DEPLOYER_PRIVATE_KEY` everywhere the backend runs.
4. Audit `WalletRegistry` events for `WalletMapped` entries you did not
   authorize, and revoke them.
5. Audit `CertificateStored` events from any wallet mapped during the exposure
   window.

If the attacker transferred admin first, you cannot recover: redeploy both
contracts, re-map legitimate issuers, and re-anchor the certificates you still
have canonical data for.

### `JWT_SECRET`

Replace it and redeploy. All sessions drop, which is the desired outcome.
Review `audit_logs` for `WALLET_SIGNATURE_VERIFIED` and `CERTIFICATE_ISSUED`
entries during the exposure window — those are the actions a forged token could
have taken.

### `P12_BASE64` / `P12_PASSWORD`

Generate a new certificate and redeploy. PDFs signed with the old certificate
will no longer validate; their on-chain anchors are unaffected, so they still
verify through the canonical-JSON path. Communicate the change if third parties
rely on the embedded signature.

### `DATABASE_URL`

Rotate the password, update the backend, and force a password reset for all
users — bcrypt hashes at cost 10 are attackable offline for weak passwords.
Certificates themselves cannot be forged this way; the chain is authoritative.

### If it reached a public repository

Assume permanent compromise and rotate regardless of what history rewriting you
do. Then clean history with `git-filter-repo` or BFG. GitHub caches
force-pushed objects, and forks retain them.

---

## 5. What the code already does well

- Passwords are bcrypt-hashed at cost 10; hashes never leave the service layer.
- All SQL is parameterized — no string interpolation anywhere in the query paths.
- JWTs are short-lived (1 hour), and issuer signing tokens last only 5 minutes.
- Wallet challenge nonces are single-use: the row is deleted on successful
  verification, so a captured signature cannot be replayed.
- `requireIssuerSignature` re-checks, on every request, that the token's user
  matches the authenticated user and that the wallet is still un-revoked —
  it does not trust the token's claims alone.
- Chain writes and database writes share a transaction, so a reverted
  transaction leaves no orphan row.
- Every state change is written to `audit_logs`, failures included.
- Issuer keys never touch the server — anchoring is signed in MetaMask.
- Verification reads the chain first and tolerates a database outage.

---

## 6. What is not production-ready

These are current, verified gaps — details and impact in
[ARCHITECTURE.md §11](ARCHITECTURE.md#11-known-gaps).

| Gap | Why it matters |
| :--- | :--- |
| **OTPs are returned in the API response** and no email is sent | Anyone can register any email address. Blocking. |
| **`app.use(cors())` allows every origin** | Any site can call the API with a user's credentials. Restrict to known origins. |
| **No rate limiting** | Login, OTP requests, and bulk verification are open to brute force and abuse. |
| **PDF storage is on local disk** | Ephemeral hosts lose the files. Regeneration covers it, but regenerated PDFs are not re-signed. |
| **RLS policies are inert** | They depend on a session GUC the app never sets; authorization is application-level only. |
| **No request-level audit metadata** | `audit_logs` has `ip_address` / `user_agent` columns that are never populated. |

Before a real deployment, at minimum: wire a mail provider and drop the `otp`
field from the response, lock CORS to your frontend origin, add rate limiting to
`/auth/*`, `/student-auth/*`, and `/verify/*`, and move certificate storage to
object storage.

The full gap list, including items already fixed, is in
[ARCHITECTURE.md §11](ARCHITECTURE.md#11-known-gaps).

---

## 7. Production checklist

- [ ] No `.env` file deployed — host-injected environment variables only
- [ ] `JWT_SECRET` is ≥ 32 random bytes and unique to this environment
- [ ] `DEPLOYER_PRIVATE_KEY` is a dedicated wallet, ideally multi-sig-controlled
- [ ] A real CA-issued `.p12`, not the self-signed development certificate
- [ ] The seeded admin password changed — `reset-db.js` creates
      `admin@certify.com` / `Admin@123`, which is public knowledge in this repo
- [ ] `NODE_ENV=production` (enables database SSL and suppresses stack traces)
- [ ] CORS restricted to the deployed frontend origin
- [ ] Rate limiting on all public endpoints
- [ ] Database SSL enforced and IP access restricted
- [ ] Separate credentials per environment — never share dev and prod
- [ ] OTP delivery through a real email provider
- [ ] `audit_logs` monitored for `FAILURE` results and unexpected
      `WALLET_MAPPED` events

---

## 8. Reporting a vulnerability

Do not open a public issue. Contact the maintainer directly with reproduction
steps and let them confirm a fix before disclosure.

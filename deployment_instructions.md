# 🚀 CERTIFY Deployment Guide

Deploying the full stack: Express backend on **Render**, React frontend on
**Vercel**, contracts already live on **Base Sepolia**.

Render is used for the backend rather than a serverless platform because PDF
generation, P12 signing, and blockchain round trips exceed typical serverless
execution limits — and because the module-level P12 cache and pg connection pool
both want a persistent process.

Related: [SECURITY.md](SECURITY.md) for secret handling ·
[ARCHITECTURE.md §10](ARCHITECTURE.md#10-configuration) for what each variable does.

---

## Before you start

- [ ] Contracts deployed and their addresses recorded
      (`contracts/deployed-addresses.json`)
- [ ] A PostgreSQL database provisioned (Neon, Supabase, Render Postgres) with
      the schema applied
- [ ] A `.p12` signing certificate, Base64-encoded
- [ ] A `JWT_SECRET` of at least 32 characters
- [ ] The deployer wallet funded with Base Sepolia ETH — it pays gas for every
      wallet map and revoke

Prepare the database once, from your machine:

```bash
psql "$DATABASE_URL" -f backend/schema.sql
# or, for a clean slate with usable admin logins:
node backend/scripts/reset-db.js
```

Get the Base64 for `P12_BASE64`. If you already hold a CA-issued `.p12`:

```bash
# cross-platform, via Node
node -e "console.log(require('fs').readFileSync('path/to/certificate.p12').toString('base64'))"

# macOS / Linux
base64 -w 0 path/to/certificate.p12

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path/to/certificate.p12"))
```

To generate a self-signed one instead (development, or a first deploy you intend
to replace):

```bash
cd backend && node generate-cert.js
```

It prints the `P12_BASE64` and `P12_PASSWORD` values to paste into your host's
environment settings. Paste the Base64 as one unbroken line.

---

## 1. Backend → Render

1. Push your latest code to GitHub.
2. In [Render](https://render.com): **New +** → **Web Service**, connect the
   `Certify` repository.
3. Configure:
   - **Name**: `certify-backend`
   - **Root Directory**: `backend` ⚠️ **required** — do not leave blank
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Add the environment variables below.
5. **Create Web Service**, then copy the URL —
   e.g. `https://certify-backend.onrender.com`.

### Environment variables

| Variable | Value | Secret |
| :--- | :--- | :--- |
| `DATABASE_URL` | Full connection string with `?sslmode=require` | ✅ |
| `NODE_ENV` | `production` | |
| `PORT` | Leave unset — Render injects it | |
| `FRONTEND_URL` | Exact Vercel origin, e.g. `https://certify-frontend.vercel.app` | |
| `JWT_SECRET` | ≥ 32 characters | ✅ |
| `JWT_EXPIRES_IN` | `1h` | |
| `RPC_URL` | `https://sepolia.base.org` | |
| `CONTRACT_WALLET_REGISTRY` | `0x82ee75E1D5E03Dd6C035600103D8aC29b4a018a6` | |
| `CONTRACT_CERT_REGISTRY` | `0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9` | |
| `DEPLOYER_PRIVATE_KEY` | Contract admin key | ✅ |
| `ADMIN_WALLET_ADDRESS` | Address allowed to reach the admin login | |
| `P12_BASE64` | Base64 of the `.p12` | ✅ |
| `P12_PASSWORD` | Its passphrase | ✅ |
| `CERT_STORAGE_DIR` | Optional — path of a mounted persistent disk | |
| `DATABASE_SSL` | Optional — `true`/`false` to force the TLS decision | |

Four things worth knowing here:

- **Database TLS no longer depends on `NODE_ENV`.** `db/pool.js` derives it from
  `DATABASE_URL`: on for any remote host, off for `localhost`, `sslmode=disable`
  respected, `DATABASE_SSL` overriding all of it. Set `NODE_ENV=production`
  anyway — it still keeps stack traces out of error responses.
- **Don't set `PORT` yourself.** Render injects it; `server.js` reads
  `process.env.PORT`. Hardcoding it breaks health checks.
- **The variable is `P12_BASE64`, not `P12_FILE_PATH`.** Signing reads the
  Base64 environment variable; there is no filesystem fallback. Paste the blob
  with no line breaks.
- **`FRONTEND_URL` is the CORS allowlist.** Leaving it unset allows every origin
  and logs a warning. Set it to the exact deployed frontend origin — scheme +
  host, no path, no trailing slash. `CORS_ORIGINS` takes a comma-separated list
  when you also need preview deployments.

Boot fails fast and loudly if `DATABASE_URL`, `JWT_SECRET`, `RPC_URL`, or
either contract address is missing, or if `JWT_SECRET` is under 32 characters —
check the logs for the exact list.

A database that is merely unreachable does **not** stop the server. The port
binds first, then the database is retried five times with backoff, so Render
sees a live service and the logs name the real problem instead of failing the
deploy with a port-scan timeout. `GET /api/health` reports which state you are
in:

```json
{ "success": true, "database": "connected", "...": "..." }
```

`GET /` and `GET /health` return the same liveness payload, so any health-check
path works.

### Ephemeral disk

Render's filesystem does not survive restarts, so PDFs written to
`backend/storage/certificates/` disappear on every deploy. Downloads still work:
the controller regenerates the PDF from the database using the same canonical
JSON, so the on-chain hash still matches.

The tradeoff is that **regenerated PDFs are not re-signed** — they verify by
canonical JSON but fail a PKCS#7 signature check. If offline signature validity
matters after a redeploy, attach a Render persistent disk and point
`CERT_STORAGE_DIR` at its mount path (e.g. `/var/data/certificates`), or move
storage to S3/R2.

Writing the PDF is best-effort by design: the certificate hash is on chain
before the file is written, so a read-only or full disk logs a warning and the
certificate is still issued — it simply downloads through the regeneration
path. Aborting there would have rolled back a row whose hash is already
anchored, and re-issuing it would then fail forever as a duplicate.

### Cold starts

On Render's free tier the service sleeps after inactivity, and the first request
takes 30–60 seconds. Because `server.js` pings the database before listening, a
cold start also has to re-establish the pool. Use a paid instance if issuers will
hit it interactively.

---

## 2. Frontend → Vercel

1. In [Vercel](https://vercel.com): **Add New** → **Project**, import the same
   repository.
2. Configure:
   - **Project Name**: `certify-frontend`
   - **Framework Preset**: `Vite` (auto-detected)
   - **Root Directory**: `frontend` ⚠️ **required**
3. Environment variable:

   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://certify-backend.onrender.com` |
   | `VITE_CERT_REGISTRY_ADDRESS` | Optional — only if you redeployed the contracts |

   Origin only. A trailing slash or an accidental `/api` suffix is now normalised
   away instead of producing requests to `/api/api/…`.

   **This variable is required for a production build.** `vite build` fails if it
   is unset, or if it points at `localhost`. That misbuild used to succeed and
   ship a bundle calling `http://localhost:3000` — which worked only on a machine
   running the backend locally and failed for every other visitor of the same
   URL. If the backend is proxied onto the frontend's own origin instead, set
   this to `/`.

4. **Deploy**.

> `frontend/vercel.json` rewrites all paths to `index.html`, so client-side
> routes like `/verify` and `/issuer/dashboard` resolve on a hard refresh
> instead of 404ing.

**`VITE_API_URL` is inlined at build time**, not read at runtime. Changing it
requires a redeploy — not just a restart.

---

## 3. Wire the two together

Two things still point at old values after a first deploy:

1. **CORS.** With `FRONTEND_URL` unset, `backend/src/app.js` allows every
   origin — so a first deploy works immediately, and is not what you want
   long-term. Set `FRONTEND_URL` on Render to the exact Vercel origin (no
   trailing slash) and redeploy. Blocked origins are logged by name. No code
   change is needed.

2. **The contract address.** `frontend/src/wallet/walletService.js` defaults to
   the currently deployed `CertificateRegistry`. If you redeployed the
   contracts, set `VITE_CERT_REGISTRY_ADDRESS` on Vercel to the new address as
   well as `CONTRACT_CERT_REGISTRY` on Render — otherwise issuance anchors to
   one registry while verification reads another, and every certificate comes
   back `NOT_ON_CHAIN`.

---

## 4. Post-deployment checks

```bash
curl https://certify-backend.onrender.com/api/health
# {"success":true,"message":"CERTIFY API is running","timestamp":"..."}
```

Then, in the browser:

1. Load the Vercel URL — the landing page renders.
2. Open DevTools → Network and confirm requests go to your Render origin, not
   `localhost:3000`.
3. Log in as admin at `/admin/login`. This exercises the database *and*
   `ADMIN_WALLET_ADDRESS`.
4. Map an issuer wallet from the admin dashboard. This is the real end-to-end
   test — it needs `DEPLOYER_PRIVATE_KEY`, `RPC_URL`, gas in the deployer
   wallet, and a working transaction round trip.
5. Register a student at `/student-onboard`.
6. Issue a certificate as the issuer. This exercises the signing token, the
   canonical hash, MetaMask anchoring, PDF generation, and P12 signing in one
   pass.
7. Verify the downloaded PDF at `/verify`.

If step 6 succeeds and step 7 returns `VALID`, every subsystem is working.

---

## 5. Troubleshooting

| Symptom | Cause |
| :--- | :--- |
| Render logs `Missing required environment variables` | Exactly what it says — the log names them |
| Render logs `JWT_SECRET must be at least 32 characters long` | Regenerate a longer secret |
| The site works for you but for nobody else, on the same URL | Almost always a bundle built with a `localhost` `VITE_API_URL` (now blocked at build time), or an `http://` `VITE_API_URL` on an `https://` page. The browser console names both |
| `/api/health` reports `"database": "disconnected"` | The startup check exhausted its retries — bad `DATABASE_URL`, or the provider needs TLS (`?sslmode=require`, or `DATABASE_SSL=true`). The logs carry the driver's error |
| `vite build` fails with `VITE_API_URL is not set` | Working as intended — set it on Vercel to the Render origin. Building without it used to ship a bundle that called `localhost` |
| CORS errors in the console | `FRONTEND_URL` doesn't match the exact deployed origin. Render's logs print `Blocked CORS request from origin: …` with the origin it saw |
| Hard refresh on `/verify` 404s | `vercel.json` missing or the root directory isn't `frontend` |
| `P12_BASE64 environment variable is not set` | Variable missing, or still named `P12_FILE_PATH` |
| Certificate issuance fails at the MetaMask step | Issuer wallet not mapped on chain, or out of Base Sepolia ETH |
| Wallet mapping reverts with `caller is not admin` | `DEPLOYER_PRIVATE_KEY` is not the wallet that deployed the contracts |
| Everything verifies as `NOT_ON_CHAIN` | Frontend and backend point at different `CertificateRegistry` addresses |
| First request after idle takes ~60s | Render free-tier cold start |

---

## 6. Rolling out changes

- **Backend**: push to the deploy branch; Render rebuilds automatically. The
  database has no migration runner — apply schema changes manually before
  deploying code that depends on them.
- **Frontend**: push; Vercel rebuilds. Any `VITE_*` change needs a fresh build.
- **Contracts**: redeploying creates *new, empty* registries. Previously
  anchored certificates will not exist there. Only redeploy if you intend to
  re-anchor everything and re-map every issuer.

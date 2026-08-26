# CERTIFY API Reference

Base URL: `<host>/api` — e.g. `http://localhost:3000/api` locally, or
`https://<your-service>.onrender.com/api` in production.

All responses are JSON and follow one of two shapes:

```jsonc
// success
{ "success": true,  "...": "endpoint-specific fields" }

// error
{ "success": false, "error": "Human-readable message" }
```

The only exception is `GET /certificates/:id/download`, which returns
`application/pdf` bytes.

## Authentication headers

| Header | Value | Required by |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <accessToken>` | everything marked **JWT** |
| `Issuer-Signature-Token` | `<signingToken>` | `POST /certificates/prepare`, `POST /certificates/issue` |

The access token expires after `JWT_EXPIRES_IN` (default `1h`). The signing
token expires after **5 minutes** and proves a live MetaMask signature — see
[ARCHITECTURE.md §5](../ARCHITECTURE.md#5-issuance-pipeline).

---

## Endpoint index

| Method | Path | Auth | Role |
| :--- | :--- | :--- | :--- |
| GET | `/health` | — | — |
| POST | `/auth/register` | — | — (creates `OWNER` only) |
| POST | `/auth/login` | — | — |
| POST | `/auth/verify-admin-wallet` | — | — |
| POST | `/auth/verify-issuer-wallet` | JWT | any |
| GET | `/auth/profile` | JWT | any |
| POST | `/student-auth/request-otp` | — | — |
| POST | `/student-auth/verify-otp` | — | — |
| POST | `/student-auth/complete-registration` | — | — |
| POST | `/admin/create-issuer` | JWT | ADMIN |
| GET | `/admin/issuers` | JWT | ADMIN |
| POST | `/wallet-auth/challenge` | — | — |
| POST | `/wallet-auth/verify` | — | — |
| POST | `/wallets/map` | JWT | ADMIN |
| POST | `/wallets/revoke` | JWT | ADMIN |
| GET | `/wallets/my-wallets` | JWT | any |
| GET | `/wallets/:address` | JWT | any |
| POST | `/certificates/prepare` | JWT + signing | ISSUER |
| POST | `/certificates/issue` | JWT + signing | ISSUER |
| GET | `/certificates/issued` | JWT | ISSUER |
| GET | `/certificates/my` | JWT | OWNER |
| GET | `/certificates/:id/download` | JWT | OWNER, ADMIN |
| POST | `/verify/hash` | — | — |
| POST | `/verify/bulk` | — | — |
| POST | `/verify/upload` | — | — |

---

## Health

### `GET /health`

```json
{ "success": true, "message": "CERTIFY API is running", "timestamp": "2026-08-26T10:00:00.000Z" }
```

---

## Auth — `/api/auth`

### `POST /auth/register`

```json
{ "email": "student@example.com", "password": "secret123", "role": "OWNER",
  "firstName": "Jane", "lastName": "Doe" }
```

Public registration is restricted to `OWNER` by design; any other `role` value
is rejected with *"Invalid registration. Students only. Institutions contact
admin."* Password minimum is 8 characters here (the `/student-auth` flow uses
6). The email is stored lowercased.

Returns `201` with the created user. Note that this endpoint creates an account
without verifying the address — the `/student-auth/*` OTP flow is the intended
signup path for students.

### `POST /auth/login`

```json
{ "email": "student@example.com", "password": "secret123" }
```

```json
{
  "success": true,
  "accessToken": "eyJhbGciOi...",
  "user": { "id": "uuid", "email": "...", "role": "OWNER", "firstName": "Jane", "lastName": "Doe" }
}
```

Email matching is case-insensitive, so `Jane@Example.com` and
`jane@example.com` are the same account.

`401` on bad credentials or when `users.status` is not `ACTIVE` — note that
revoking an issuer's wallet also sets their status to `REVOKED`, which locks
them out of login.

### `POST /auth/verify-admin-wallet`

Checks a connected MetaMask address against the server's `ADMIN_WALLET_ADDRESS`
environment variable. Used by the admin login screen as a first factor before
email/password.

```json
{ "walletAddress": "0x..." }
```

```json
{ "success": true, "allowed": true }
```

`403` when the address does not match.

### `POST /auth/verify-issuer-wallet` — JWT

Confirms the address is mapped to the calling user and not revoked. Case
insensitive on the address.

```json
{ "success": true, "verified": true, "walletId": "uuid" }
```

### `GET /auth/profile` — JWT

Returns `id`, `email`, `role`, `firstName`, `lastName`, `status`, `createdAt`.

---

## Student onboarding — `/api/student-auth`

Three steps, in order. State lives in the `student_otp` table.

### `POST /student-auth/request-otp`

```json
{ "email": "student@example.com" }
```

```json
{ "success": true, "message": "OTP sent to email", "email": "student@example.com", "otp": "483920" }
```

> ⚠ The OTP is returned in the response and logged to the console; no email is
> sent. The code is flagged `// REMOVE IN PRODUCTION`. Wire up a mail provider
> and drop the `otp` field before going live.

OTPs expire after 10 minutes. Re-requesting upserts the row.

### `POST /student-auth/verify-otp`

```json
{ "email": "student@example.com", "otp": "483920" }
```

Marks the row `verified = true`. `400` on a wrong or expired code.

### `POST /student-auth/complete-registration`

Requires a previously verified OTP for that email. Password minimum is 6
characters (note: `/auth/register` uses 8).

```json
{ "email": "...", "password": "...", "firstName": "Jane", "lastName": "Doe" }
```

Creates an `OWNER` with status `ACTIVE`, deletes the OTP row, writes a
`STUDENT_REGISTERED` audit log, and returns an `accessToken` plus the user — the
student is logged in immediately.

---

## Admin — `/api/admin`

### `POST /admin/create-issuer` — JWT, ADMIN

Creates an institution's `ISSUER` account with a generated temporary password.

```json
{
  "institutionName": "Example University",
  "officialEmail": "registrar@example.edu",
  "contactPerson": "Jane Doe",
  "contactPhone": "+1...",
  "website": "https://example.edu",
  "walletAddress": "0x..."
}
```

```json
{
  "success": true,
  "user": { "id": "uuid", "email": "registrar@example.edu", "role": "ISSUER" },
  "tempPassword": "k3j4h5g6f7d8",
  "institutionName": "Example University",
  "message": "Issuer created successfully. Wallet must be mapped separately."
}
```

`institutionName` is stored in `users.first_name` and `contactPerson` in
`users.last_name`. The remaining institution metadata — including any
`walletAddress` passed here — is recorded only in the `ISSUER_CREATED` audit
log. **Creating an issuer does not map their wallet**; call
`POST /wallets/map` next.

Deliver `tempPassword` over a secure channel; it is returned exactly once.

### `GET /admin/issuers` — JWT, ADMIN

Every `ISSUER` left-joined to their wallet: `id`, `email`, `institution_name`,
`created_at`, `status`, `wallet_address`, `revoked_at`.

---

## Wallet signature auth — `/api/wallet-auth`

Public endpoints, but only useful to an already-mapped issuer.

### `POST /wallet-auth/challenge`

```json
{ "walletAddress": "0x..." }
```

```json
{ "success": true, "message": "Sign this message to authorize certificate issuance: <uuid-nonce>", "walletAddress": "0x..." }
```

The nonce is stored for 5 minutes, one row per address.

### `POST /wallet-auth/verify`

```json
{ "walletAddress": "0x...", "signature": "0x...", "message": "Sign this message to authorize certificate issuance: <nonce>" }
```

Server-side checks, in order: address format → stored nonce exists → not
expired → message matches the expected string exactly → `ethers.verifyMessage`
recovers the same address → `WalletRegistry.isValidIssuer` on chain → wallet
maps to a user → that user's role is `ISSUER`.

```json
{ "success": true, "signingToken": "eyJ...", "user": { "id": "...", "email": "...", "role": "ISSUER", "walletAddress": "0x..." }, "expiresIn": "5m" }
```

The nonce row is deleted on success, so a captured signature cannot be replayed.
Status codes: `401` for an expired challenge, `403` for a non-issuer or unmapped
wallet, `400` otherwise.

---

## Wallets — `/api/wallets`

### `POST /wallets/map` — JWT, ADMIN

```json
{ "walletAddress": "0x...", "userId": "uuid-of-issuer" }
```

Sends `WalletRegistry.mapWallet` from the server's `DEPLOYER_PRIVATE_KEY`
signer with an explicit nonce, then inserts the `wallets` row and an audit log
in one transaction. If the chain call reverts, the whole thing rolls back and
the real revert reason is surfaced in `error`.

```json
{ "success": true, "wallet": { "id": "uuid", "walletAddress": "0x...", "userId": "uuid", "txHash": "0x...", "mappedAt": "..." } }
```

`500` if `DEPLOYER_PRIVATE_KEY` is not configured.

### `POST /wallets/revoke` — JWT, ADMIN

```json
{ "walletAddress": "0x...", "reason": "Institution no longer accredited" }
```

Both fields are required. In one transaction: `WalletRegistry.revokeWallet` on
chain, `wallets.revoked_at` set, the owning user's status set to `REVOKED`, a
`revocations` row, and an audit log.

This is the blast radius switch — `CertificateRegistry.isValidCertificate`
re-checks the issuer on every read, so revoking a wallet invalidates every
certificate it ever issued.

### `GET /wallets/my-wallets` — JWT

Wallets belonging to the caller.

### `GET /wallets/:address` — JWT

One wallet joined to its user. Note the lookup is case-sensitive here, unlike
the auth endpoints. `404` if not found.

---

## Certificates — `/api/certificates`

### `POST /certificates/prepare` — JWT + signing token, ISSUER

Computes the deterministic hash the issuer is about to anchor. Writes nothing.

```json
{
  "ownerName": "Jane Doe",
  "ownerEmail": "jane@example.com",
  "courseName": "B.Tech Computer Science",
  "department": "Computer Science",
  "issueMonth": "6",
  "issueYear": "2025",
  "graduationMonth": "5",
  "graduationYear": "2025"
}
```

Required: `ownerName`, `courseName`, `department`, `issueMonth`, `issueYear`,
`graduationMonth`, `graduationYear`. Re-verifies the wallet on chain first.

```json
{ "success": true, "hash": "3f5a...64 hex chars" }
```

The client then calls `CertificateRegistry.storeCertificateHash("0x" + hash)`
from MetaMask.

### `POST /certificates/issue` — JWT + signing token, ISSUER

Same body as `prepare`, plus `hash` and the `txHash` returned by MetaMask.

```json
{ "...prepare fields": "...", "hash": "3f5a...", "txHash": "0x..." }
```

Server work, in one transaction: resolve `ownerEmail` to a registered `OWNER`
(hard requirement — the student must already have an account), reject a
duplicate hash, generate the QR and PDF with the canonical JSON embedded,
P12-sign the PDF, write it to `storage/certificates/<uuid>.pdf`, then insert
`certificates`, `certificate_files`, and an audit log.

```json
{ "success": true, "certificateId": "uuid", "hash": "3f5a...", "txHash": "0x...", "message": "Certificate issued successfully" }
```

Status codes: `403` unmapped or revoked wallet · `409` duplicate hash · `502`
blockchain failure · `500` PDF/QR generation failure · `400` otherwise. Failures
are recorded in `audit_logs` with `result = 'FAILURE'`.

### `GET /certificates/issued` — JWT, ISSUER

Query: `limit` (default 50), `offset` (default 0). Returns the caller's
issuances with recipient details, `hash`, `txHash`, and `additionalInfo`.

### `GET /certificates/my` — JWT, OWNER

Same pagination. Returns the caller's certificates including issuer name/email
and `isRevoked`.

### `GET /certificates/:id/download` — JWT, OWNER or ADMIN

Returns `application/pdf` with a `Content-Disposition` attachment filename.
Owners may only fetch their own; admins may fetch any (`403 Access denied`
otherwise).

If the stored file is missing, the PDF is regenerated on the fly from the
database using the same canonical JSON, so the on-chain hash still matches.
Regenerated PDFs are **not** re-signed — see
[ARCHITECTURE.md §7](../ARCHITECTURE.md#7-pdf-signature-layer).

---

## Verification — `/api/verify`

All three endpoints are public and unauthenticated.

### Verification statuses

| Status | `valid` | Meaning |
| :--- | :--- | :--- |
| `VALID` | `true` | On chain, not revoked, issuer still authorized |
| `NOT_ON_CHAIN` | `false` | No such hash in `CertificateRegistry` |
| `REVOKED` | `false` | Marked revoked in the database |
| `REVOKED_ON_CHAIN` | `false` | Revoked via `CertificateRegistry.revokeCertificate` |
| `ISSUER_INVALID` | `false` | The issuing wallet has been revoked in `WalletRegistry` |
| `CHAIN_ERROR` | `false` | RPC unreachable — inconclusive, not a verdict on the certificate |
| `ERROR` | `false` | Per-item failure inside a bulk request |
| `INVALID` | `false` | Upload contained no recoverable certificate metadata |

### `POST /verify/hash`

```json
{ "hash": "3f5a...64 hex chars" }
```

Rejects anything not matching `/^[a-f0-9]{64}$/i` with `400`.

```json
{
  "success": true,
  "verification": {
    "status": "VALID",
    "exists": true,
    "valid": true,
    "message": "Certificate is valid",
    "certificate": {
      "certificateNumber": "CERT-1740000000000",
      "recipientName": "Jane Doe",
      "courseName": "B.Tech Computer Science",
      "issueDate": "2025-06-01T00:00:00.000Z",
      "issuedAt": 1740000000,
      "txHash": "0x..."
    }
  }
}
```

When the chain confirms the hash but the database has no row, `certificate`
degrades to `{ issuer, issuedAt }` straight from the contract.

### `POST /verify/bulk`

```json
{ "hashes": ["hash1", "hash2"] }
```

1–100 hashes, all validated for format up front (`400` lists `invalidHashes`).
Verified concurrently via `Promise.all`.

```json
{
  "success": true,
  "summary": { "total": 3, "valid": 2, "invalid": 1, "notFound": 0 },
  "results": [ { "hash": "...", "status": "VALID", "valid": true, "...": "..." } ]
}
```

### `POST /verify/upload`

`multipart/form-data`, field name **`certificate`**, PDF only, 10 MB maximum
(enforced by multer with in-memory storage).

Runs the stateless "verify-then-hydrate" flow: extract → re-hash → check the
chain → optionally enrich from the database. The response adds the computed
`hash`, and — when the chain validates a certificate the database doesn't
know — a `certificateData` object carrying the fields recovered from the PDF.

A PDF with no recoverable metadata returns `200` with
`status: "INVALID"` rather than an error, so batch UIs can render it as a row.

```json
{
  "success": true,
  "verification": { "status": "VALID", "valid": true, "exists": true, "hash": "3f5a...", "certificate": { "...": "..." } }
}
```

# CERTIFY Frontend

React 18 + Vite single-page app for the CERTIFY credential platform. Four
role-based dashboards, a public verification page, MetaMask integration, and the
browser half of the non-custodial issuance flow.

- **API contract** → [../backend/API.md](../backend/API.md)
- **System design** → [../ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Stack

React 18 · Vite 5 · React Router 6 · Axios · Ethers v6 · Tailwind CSS 3 ·
Lucide React.

---

## Setup

```bash
cd frontend
npm install
```

### Environment

One variable, and it does matter — the older claim that this app needs no
configuration is out of date.

```bash
# frontend/.env
VITE_API_URL=http://localhost:3000
```

`src/api/client.js` appends `/api` itself, so pass the **origin only**: no
`/api` suffix, no trailing slash. If `VITE_API_URL` is unset the client falls
back to `http://localhost:3000/api`.

Vite inlines this at build time, so a change means a rebuild — on Vercel, a
redeploy.

### Run

```bash
npm run dev       # http://localhost:5173
npm run build     # production bundle → dist/
npm run preview   # serve the build locally
```

`vite.config.js` also proxies `/api` to `http://localhost:3000` in dev, which
covers relative-path requests; the axios client uses `VITE_API_URL` directly.

---

## Layout

```text
frontend/src/
├── api/
│   ├── client.js        # axios instance + auth interceptors
│   └── index.js         # authAPI, walletAuthAPI, walletAPI,
│                        #   certificateAPI, verificationAPI
├── context/AuthContext  # user, token, role, login/logout, isAuthenticated
├── wallet/walletService # MetaMask: connect, sign, network, contract write
├── components/
│   ├── ProtectedRoute   # ProtectedRoute (auth) + RoleRoute (role)
│   ├── DashboardLayout  # shared chrome
│   ├── StatusBadge      # verification status pill
│   └── ShapeBlur        # decorative background
└── pages/
    ├── landing/         # entry point, role selection
    ├── login/           # email + password, redirects by role
    ├── student/         # OTP onboarding (3 steps)
    ├── admin/           # wallet-gated login + dashboard
    ├── issuer/          # wallet auth + issuance
    ├── owner/           # own certificates + download
    └── verifier/        # public PDF verification
```

---

## Routes

| Path | Guard | Page |
| :--- | :--- | :--- |
| `/` | public | Landing |
| `/login` | public | Email/password login, redirects by role |
| `/student-onboard` | public | Student OTP registration |
| `/admin/login` | public | Wallet-gated admin login |
| `/verify` | **public** | Verifier dashboard — no account required |
| `/admin/dashboard` | JWT + `ADMIN` | Issuer creation, wallet map/revoke |
| `/issuer/dashboard` | JWT + `ISSUER` | Wallet auth + certificate issuance |
| `/owner/dashboard` | JWT + `OWNER` | Own certificates + PDF download |
| `*` | — | Redirect to `/` |

`ProtectedRoute` sends unauthenticated users to `/login`; `RoleRoute` sends
wrong-role users there too. Both render a spinner while `AuthContext` rehydrates
from `localStorage`, which prevents the flash-of-redirect on refresh.

---

## Token handling

Two tokens, two storage locations, both attached automatically by the request
interceptor in `src/api/client.js`:

| Token | Storage | Header | Lifetime |
| :--- | :--- | :--- | :--- |
| Access JWT | `localStorage.token` | `Authorization: Bearer …` | 1 hour |
| Issuer signing token | `sessionStorage.signingToken` | `Issuer-Signature-Token` | 5 minutes |

The signing token lives in `sessionStorage` deliberately — it should not outlive
the tab. Closing the tab forces a fresh MetaMask signature.

The response interceptor clears both on any `401` and redirects to `/`, unless
the user is already on `/` or a login page.

---

## Role flows

### Student — `/student-onboard`

Email → OTP → password. Three `POST`s to `/student-auth/*`. Completing
registration returns an access token, so the student lands logged in. In
development the OTP is returned in the API response and displayed by the page.

### Admin — `/admin/login`

Two factors. First, connect MetaMask; the address is checked against the
server's `ADMIN_WALLET_ADDRESS` via `POST /auth/verify-admin-wallet`. Only then
does the email/password form unlock. On the dashboard: create issuer accounts,
and map or revoke issuer wallets — both of those send real transactions from the
**server's** admin signer, so they take a block to confirm.

### Issuer — `/issuer/dashboard`

Four gated steps, each unlocking the next in the UI:

1. **Connect MetaMask** and switch to Base Sepolia (`0x14a34` / 84532). The page
   offers `wallet_switchEthereumChain`, falling back to `wallet_addEthereumChain`
   on error `4902`.
2. **Verify the wallet** — `POST /auth/verify-issuer-wallet` confirms an admin
   has mapped it.
3. **Authorize** — request a challenge, `personal_sign` it, exchange the
   signature for a 5-minute signing token.
4. **Issue** — the three-call sequence below.

```
POST /certificates/prepare          → deterministic hash (nothing written)
MetaMask: storeCertificateHash(hash) → anchors it on chain, returns txHash
POST /certificates/issue            → PDF generated, signed, and recorded
```

The MetaMask step is what makes issuance non-custodial: the anchoring
transaction is signed by the institution's own key, never by the server. The
student's email must already be registered or `issue` fails.

`walletService.storeCertificateHash()` hardcodes the `CertificateRegistry`
address. If you redeploy the contracts, update
`src/wallet/walletService.js` alongside the backend's environment variables.

### Owner — `/owner/dashboard`

Lists the student's certificates and downloads each PDF as a blob. If the server
no longer has the stored file it regenerates one from the database — same hash,
so it still verifies.

### Verifier — `/verify`

Drag and drop one or more PDFs. Each is uploaded to `POST /verify/upload`
individually and results are collected into a summary. No login, no account,
nothing stored. A file that isn't a CERTIFY certificate comes back as a normal
result row rather than an error.

---

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| API calls hit `localhost:3000` in production | `VITE_API_URL` was unset at **build** time — set it and redeploy |
| API calls 404 with a doubled `/api/api/` | `VITE_API_URL` includes `/api`; pass the origin only |
| "MetaMask is not installed" | Extension missing or disabled; reload after installing |
| Wrong network banner | Use the switch button — it adds Base Sepolia if it isn't in the wallet |
| "Wallet not mapped. Contact admin." | An admin must run wallet map for that address first |
| Issuance fails right at the MetaMask prompt | The wallet was revoked on chain, or has no Base Sepolia ETH for gas |
| Signing step silently expires | The token lives 5 minutes; re-authorize |
| Logged out on refresh | `localStorage` cleared, or the 1-hour JWT expired |

---

## License

MIT.

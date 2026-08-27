/**
 * Single source of truth for the backend API base URL.
 *
 * `VITE_API_URL` is inlined at BUILD time, not read at runtime. Every caller
 * resolves it through this module so a deployment can never end up with one
 * page talking to the deployed backend and another talking somewhere else.
 *
 * Resolution:
 *   VITE_API_URL="https://api.example.com"  ->  https://api.example.com/api
 *   VITE_API_URL="https://api.example.com/" ->  https://api.example.com/api
 *   VITE_API_URL="https://api.example.com/api" -> https://api.example.com/api
 *   VITE_API_URL="/" or unset               ->  /api  (same origin as this page)
 *
 * There is deliberately NO localhost fallback. A build that silently pointed at
 * http://localhost:3000 worked only on the machine that happened to be running
 * a backend locally and failed for every other visitor of the same URL.
 * `vite.config.js` fails the production build when `VITE_API_URL` is unset, so
 * the same-origin fallback here only ever applies to `npm run dev`, where the
 * Vite proxy forwards `/api` to the local backend.
 */

const RAW_API_URL = (import.meta.env.VITE_API_URL ?? '').trim();

function normalizeOrigin(raw) {
    if (!raw) return '';
    // Tolerate a trailing slash and a mistakenly appended `/api`, both of which
    // otherwise produce requests to `//api/...` or `/api/api/...`.
    return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
}

/** Backend origin with no trailing slash and no `/api` suffix. Empty = same origin. */
export const API_ORIGIN = normalizeOrigin(RAW_API_URL);

/** Base URL every request is built on, e.g. `https://api.example.com/api`. */
export const API_BASE_URL = `${API_ORIGIN}/api`;

if (typeof window !== 'undefined') {
    if (!RAW_API_URL) {
        console.warn(
            `[CERTIFY] VITE_API_URL was not set at build time. API requests go to ` +
            `${window.location.origin}/api. If the backend is deployed separately, ` +
            `set VITE_API_URL to its origin and rebuild — the value is baked into the bundle.`
        );
    } else if (window.location.protocol === 'https:' && /^http:\/\//i.test(API_ORIGIN)) {
        console.error(
            `[CERTIFY] VITE_API_URL is "${API_ORIGIN}" (http) but this page is served over ` +
            `https. Browsers block that as mixed content and every API call will fail. ` +
            `Use the https origin of the backend and rebuild.`
        );
    }
}

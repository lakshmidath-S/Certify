import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `VITE_API_URL` is inlined at build time. When it was missing the bundle used
 * to silently fall back to http://localhost:3000, which works only on a machine
 * running the backend locally — so a deploy looked fine to whoever built it and
 * was broken for everyone else on the same URL. Production builds now fail here
 * instead of shipping that.
 *
 * Accepted values:
 *   https://certify-backend.onrender.com   backend on another origin
 *   /                                      backend proxied on this origin
 */
function assertApiUrl(apiUrl) {
    if (!apiUrl) {
        throw new Error(
            'VITE_API_URL is not set.\n' +
            "  Set it to the backend origin, e.g. VITE_API_URL=https://certify-backend.onrender.com\n" +
            "  (origin only — no /api suffix, no trailing slash), or to '/' if the backend\n" +
            '  is served from this same origin behind a proxy.'
        )
    }

    if (apiUrl.startsWith('/')) return

    let parsed
    try {
        parsed = new URL(apiUrl)
    } catch {
        throw new Error(
            `VITE_API_URL="${apiUrl}" is not a valid URL. Use a full origin such as ` +
            'https://certify-backend.onrender.com, or "/" for the same origin.'
        )
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`VITE_API_URL="${apiUrl}" must use http:// or https://.`)
    }

    if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(parsed.hostname)) {
        throw new Error(
            `VITE_API_URL="${apiUrl}" points at localhost. A production bundle built with ` +
            'this only works on a machine that happens to run the backend locally. Use the ' +
            'public backend origin.'
        )
    }
}

export default defineConfig(({ command, mode }) => {
    // '' = load every variable, not just the VITE_ prefixed ones, so BACKEND_URL works.
    const env = loadEnv(mode, process.cwd(), '')
    const apiUrl = (env.VITE_API_URL || '').trim()

    if (command === 'build' && mode === 'production') {
        assertApiUrl(apiUrl)
    }

    return {
        plugins: [react()],
        server: {
            port: Number(env.FRONTEND_PORT) || 5173,
            proxy: {
                // Only used by `npm run dev`; production talks to VITE_API_URL directly.
                '/api': {
                    target: env.BACKEND_URL || 'http://localhost:3000',
                    changeOrigin: true
                }
            }
        }
    }
})

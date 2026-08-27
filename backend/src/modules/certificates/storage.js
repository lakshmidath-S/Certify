const fs = require('fs').promises;
const path = require('path');

/**
 * Where issued certificate PDFs live.
 *
 * The path was hardcoded to `backend/storage/certificates` in two separate
 * modules, so pointing a deployment at a mounted disk meant editing code in two
 * places. `CERT_STORAGE_DIR` (absolute, or relative to the backend directory)
 * overrides it; the default is unchanged.
 *
 * On hosts with an ephemeral filesystem these files disappear on every restart.
 * That is survivable: `downloadCertificate` regenerates the PDF from the
 * canonical JSON, so the on-chain hash still matches — the regenerated copy is
 * simply not re-signed. Mount a persistent disk here if offline PKCS#7 validity
 * has to survive a redeploy.
 */
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_DIR = path.join(BACKEND_ROOT, 'storage/certificates');

const configured = (process.env.CERT_STORAGE_DIR || '').trim();

const STORAGE_DIR = configured
    ? (path.isAbsolute(configured) ? configured : path.resolve(BACKEND_ROOT, configured))
    : DEFAULT_DIR;

async function ensureStorageDir() {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
}

/** Absolute path for a stored filename, tolerating legacy absolute values. */
function resolveStoredPath(storedPath) {
    if (!storedPath) return null;
    return path.isAbsolute(storedPath) ? storedPath : path.join(STORAGE_DIR, storedPath);
}

/**
 * Best-effort write. Returns true when the PDF landed on disk.
 *
 * Deliberately never throws: by the time this runs the certificate hash is
 * already anchored on chain and that transaction cannot be undone. Letting a
 * read-only or full filesystem abort the transaction here rolled the database
 * row back while leaving the hash on chain, and re-issuing then failed forever
 * as a duplicate hash. A missing file only costs the PKCS#7 signature on
 * download, which the regeneration path already accepts.
 */
async function writeCertificatePdf(filename, buffer) {
    try {
        await ensureStorageDir();
        await fs.writeFile(resolveStoredPath(filename), buffer);
        return true;
    } catch (error) {
        console.error(
            `⚠️  Could not persist ${filename} to ${STORAGE_DIR}: ${error.message}. ` +
            'The certificate is still valid — downloads will regenerate the PDF from ' +
            'the canonical JSON, unsigned. Set CERT_STORAGE_DIR to a writable path ' +
            '(ideally a mounted persistent disk) to keep signed copies.'
        );
        return false;
    }
}

module.exports = {
    STORAGE_DIR,
    ensureStorageDir,
    resolveStoredPath,
    writeCertificatePdf
};

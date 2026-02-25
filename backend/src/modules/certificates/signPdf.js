/**
 * PDF Digital Signing Utility
 *
 * Signs a PDF buffer using a .p12 certificate file.
 * Uses @signpdf/signpdf with @signpdf/signer-p12.
 *
 * The .p12 file path and password are loaded from environment variables:
 *   P12_FILE_PATH  — path to the .p12 file (relative to project root or absolute)
 *   P12_PASSWORD   — password for the .p12 file
 */
const fs = require('fs');
const path = require('path');
const { SignPdf } = require('@signpdf/signpdf');
const { P12Signer } = require('@signpdf/signer-p12');

// Cache the P12 buffer in memory to avoid repeated disk reads
let cachedP12Buffer = null;

/**
 * Load the P12 certificate buffer from disk (cached after first load).
 */
function loadP12Buffer() {
    if (cachedP12Buffer) return cachedP12Buffer;

    const p12Path = process.env.P12_FILE_PATH;
    if (!p12Path) {
        throw new Error('P12_FILE_PATH environment variable is not set');
    }

    const resolvedPath = path.isAbsolute(p12Path)
        ? p12Path
        : path.resolve(process.cwd(), p12Path);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`P12 certificate file not found at: ${resolvedPath}`);
    }

    cachedP12Buffer = fs.readFileSync(resolvedPath);
    console.log(`Loaded P12 certificate from: ${resolvedPath}`);
    return cachedP12Buffer;
}

/**
 * Sign a PDF buffer using the server's .p12 certificate.
 *
 * IMPORTANT: The PDF must already contain a signature placeholder
 * added by @signpdf/placeholder-pdf-lib during generation.
 *
 * @param {Buffer} pdfBuffer - PDF buffer with signature placeholder
 * @returns {Promise<Buffer>} - Signed PDF buffer
 */
async function signPdfBuffer(pdfBuffer) {
    const p12Buffer = loadP12Buffer();
    const p12Password = process.env.P12_PASSWORD || '';

    const signer = new P12Signer(p12Buffer, { passphrase: p12Password });
    const signPdf = new SignPdf();

    const signedPdf = await signPdf.sign(pdfBuffer, signer);
    return signedPdf;
}

module.exports = { signPdfBuffer };

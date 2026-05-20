/**
 * PDF Digital Signing Utility
 *
 * Signs a PDF buffer using a .p12 certificate file.
 * Uses @signpdf/signpdf with @signpdf/signer-p12.
 *
 * The .p12 certificate and password are loaded from environment variables:
 *   P12_BASE64     — Base64 encoded string of the .p12 certificate
 *   P12_PASSWORD   — password for the .p12 certificate
 */
const { SignPdf } = require('@signpdf/signpdf');
const { P12Signer } = require('@signpdf/signer-p12');

// Cache the P12 buffer in memory to avoid repeated Base64 decoding
let cachedP12Buffer = null;

/**
 * Load the P12 certificate buffer from Base64 environment variable.
 */
function loadP12Buffer() {
    if (cachedP12Buffer) return cachedP12Buffer;

    const p12Base64 = process.env.P12_BASE64;
    if (!p12Base64) {
        throw new Error('P12_BASE64 environment variable is not set');
    }

    try {
        cachedP12Buffer = Buffer.from(p12Base64, 'base64');
        console.log('Loaded P12 certificate from Base64 environment variable');
        return cachedP12Buffer;
    } catch (error) {
        console.error('Failed to decode P12_BASE64 string:', error);
        throw new Error('Invalid Base64 string in P12_BASE64 environment variable');
    }
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

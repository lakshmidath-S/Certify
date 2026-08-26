/**
 * Generate a self-signed .p12 certificate for PDF signing.
 *
 * PDF signing reads the certificate from the P12_BASE64 environment variable,
 * not from disk (see src/modules/certificates/signPdf.js), so this script also
 * emits the Base64 encoding you need to configure.
 *
 * Usage:
 *   node generate-cert.js              write certs/certificate.p12 and print P12_BASE64
 *   node generate-cert.js --write-env  ...and patch P12_BASE64 into the resolved .env
 *                                      in place, without printing the secret
 *
 * The passphrase comes from P12_PASSWORD if it is already set, so re-running
 * this does not invalidate an existing configuration. Otherwise it falls back
 * to a development default and tells you what it used.
 *
 * This produces a SELF-SIGNED certificate: fine for development and for
 * CERTIFY's own verifier, but Adobe Acrobat will not show it as trusted. Use a
 * CA-issued .p12 in production.
 */
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const { envPath } = require('./src/config/loadEnv');

const DEV_FALLBACK_PASSWORD = 'certify_dev_password';

const writeEnv = process.argv.includes('--write-env');
const certsDir = path.join(__dirname, 'certs');
const p12Path = path.join(certsDir, 'certificate.p12');

const password = process.env.P12_PASSWORD || DEV_FALLBACK_PASSWORD;
const usingFallback = !process.env.P12_PASSWORD;

if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed certificate...');

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

const attrs = [
    { name: 'commonName', value: 'Certify' },
    { name: 'organizationName', value: 'Certify' },
    { name: 'countryName', value: 'IN' }
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    password,
    { algorithm: '3des' }
);
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const p12Buffer = Buffer.from(p12Der, 'binary');

fs.writeFileSync(p12Path, p12Buffer);
console.log(`✅ Certificate written to: ${p12Path}`);

const p12Base64 = p12Buffer.toString('base64');

if (writeEnv) {
    if (!envPath) {
        console.error('❌ --write-env: no .env file found to patch.');
        console.error('   Create backend/.env (or a repo-root .env) first.');
        process.exit(1);
    }

    let contents = fs.readFileSync(envPath, 'utf8');
    const eol = contents.includes('\r\n') ? '\r\n' : '\n';

    contents = upsert(contents, 'P12_BASE64', p12Base64, eol);
    contents = upsert(contents, 'P12_PASSWORD', password, eol);

    // The filesystem-based setting is no longer read by signPdf.js. Leaving it
    // in place only invites confusion about which one is live.
    contents = contents.replace(
        /^P12_FILE_PATH=.*$(\r?\n)?/m,
        `# P12_FILE_PATH is no longer used — signing reads P12_BASE64.${eol}`
    );

    fs.writeFileSync(envPath, contents);
    console.log(`✅ P12_BASE64 and P12_PASSWORD written to: ${envPath}`);
} else {
    console.log('\nAdd these to your .env (or your host\'s environment variables):\n');
    console.log(`P12_BASE64=${p12Base64}`);
    console.log(`P12_PASSWORD=${password}`);
    console.log('\nOr re-run with --write-env to patch the .env in place.');
}

if (usingFallback) {
    console.log(`\n⚠️  P12_PASSWORD was not set; used the development default "${DEV_FALLBACK_PASSWORD}".`);
}

/**
 * Replace KEY=... in place if present, otherwise append it.
 */
function upsert(contents, key, value, eol) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');

    if (pattern.test(contents)) {
        return contents.replace(pattern, line);
    }

    const separator = contents.endsWith(eol) || contents.length === 0 ? '' : eol;
    return `${contents}${separator}${line}${eol}`;
}

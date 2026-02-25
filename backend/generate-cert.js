/**
 * One-time script to generate a self-signed P12 certificate for PDF signing.
 * Run with: node generate-cert.js
 */
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const pki = forge.pki;

// Generate a 2048-bit RSA key pair
console.log('Generating 2048-bit RSA key pair...');
const keys = pki.rsa.generateKeyPair(2048);

// Create a self-signed certificate
const cert = pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 2);

const attrs = [
    { name: 'commonName', value: 'Certify Certificate Authority' },
    { name: 'organizationName', value: 'Certify' },
    { name: 'countryName', value: 'IN' },
];

cert.setSubject(attrs);
cert.setIssuer(attrs); // Self-signed

cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, dataEncipherment: true },
    { name: 'extKeyUsage', codeSigning: true, emailProtection: true },
]);

// Sign with SHA-256
cert.sign(keys.privateKey, forge.md.sha256.create());
console.log('Certificate created.');

// Export as PKCS#12 (.p12)
const password = 'certify_dev_password';
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: '3des', // Compatible with most PDF readers
});
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const p12Buffer = Buffer.from(p12Der, 'binary');

const outputDir = path.join(__dirname, 'certs');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'certificate.p12');
fs.writeFileSync(outputPath, p12Buffer);

console.log(`P12 certificate saved to: ${outputPath}`);
console.log(`Password: ${password}`);
console.log('Done!');

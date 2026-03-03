/**
 * One-time script to generate a self-signed .p12 certificate for PDF signing.
 * Run: node generate-cert.js
 */
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');
const p12Path = path.join(certsDir, 'certificate.p12');
const password = 'certify_dev_password';

if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed certificate...');

// Generate a keypair
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

// Pack into .p12
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    password,
    { algorithm: '3des' }
);
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const p12Buffer = Buffer.from(p12Der, 'binary');

fs.writeFileSync(p12Path, p12Buffer);
console.log(`✅ Certificate generated at: ${p12Path}`);
console.log(`   Password: ${password}`);

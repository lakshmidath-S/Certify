/**
 * Test script for PDF digital signing round-trip.
 *
 * Tests:
 *   1. Generate a PDF with signature placeholder
 *   2. Sign it with the P12 certificate
 *   3. Verify the signature → must be valid
 *   4. Tamper with the signed PDF (flip bytes in content area)
 *   5. Verify the tampered PDF → must be invalid
 *
 * Run: node test-signing.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { generatePDF } = require('./src/modules/certificates/pdf');
const { signPdfBuffer } = require('./src/modules/certificates/signPdf');
const { verifyPdfSignature } = require('./src/modules/verification/verifySignature');

async function main() {
    console.log('=== PDF Digital Signing Round-Trip Test ===\n');

    // Step 1: Generate a test PDF
    console.log('1. Generating test PDF...');
    const testData = {
        ownerName: 'Test Student',
        courseName: 'Computer Science',
        department: 'Engineering',
        issueMonth: '6',
        issueYear: '2025',
        graduationMonth: '5',
        graduationYear: '2025',
        issuerName: 'Test Issuer',
    };
    const canonicalJSON = JSON.stringify({
        courseName: 'Computer Science',
        department: 'Engineering',
        graduationMonth: '5',
        graduationYear: '2025',
        issueMonth: '6',
        issueYear: '2025',
        issuerWallet: '0x1234567890abcdef',
        ownerName: 'Test Student',
    });

    const unsignedPdf = await generatePDF(testData, null, canonicalJSON);
    console.log(`   Unsigned PDF size: ${unsignedPdf.length} bytes`);

    // Step 2: Sign the PDF
    console.log('2. Signing PDF with P12 certificate...');
    const signedPdf = await signPdfBuffer(unsignedPdf);
    console.log(`   Signed PDF size: ${signedPdf.length} bytes`);

    // Step 3: Verify the valid signed PDF
    console.log('3. Verifying signed PDF (should be VALID)...');
    const validResult = verifyPdfSignature(signedPdf);
    console.log(`   Result: valid=${validResult.valid}${validResult.reason ? ', reason=' + validResult.reason : ''}`);
    if (!validResult.valid) {
        console.error('   ❌ FAIL: Valid signed PDF was rejected!');
        process.exit(1);
    }
    console.log('   ✅ PASS: Valid signed PDF accepted');

    // Step 4: Tamper with the PDF content (flip bytes in the signed content area)
    console.log('4. Tampering with signed PDF (flipping content bytes)...');
    const tamperedPdf = Buffer.from(signedPdf);
    // Find a safe area to tamper — middle of the content
    const tamperOffset = Math.floor(tamperedPdf.length / 3);
    for (let i = 0; i < 20; i++) {
        tamperedPdf[tamperOffset + i] = tamperedPdf[tamperOffset + i] ^ 0xFF;
    }
    console.log(`   Tampered 20 bytes starting at offset ${tamperOffset}`);

    // Step 5: Verify the tampered PDF
    console.log('5. Verifying tampered PDF (should be INVALID)...');
    const tamperedResult = verifyPdfSignature(tamperedPdf);
    console.log(`   Result: valid=${tamperedResult.valid}${tamperedResult.reason ? ', reason=' + tamperedResult.reason : ''}`);
    if (tamperedResult.valid) {
        console.error('   ❌ FAIL: Tampered PDF was accepted!');
        process.exit(1);
    }
    console.log('   ✅ PASS: Tampered PDF rejected');

    console.log('\n=== All tests passed! ===');
}

main().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});

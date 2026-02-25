/**
 * PDF Digital Signature Verification Utility
 *
 * Verifies the cryptographic digital signature of a signed PDF.
 * Uses node-forge to parse the PKCS#7 signature and validate integrity.
 *
 * Returns { valid: boolean, reason?: string }
 */
const crypto = require('crypto');
const forge = require('node-forge');

// node-forge ASN.1 class constants
const ASN1_CLASS_UNIVERSAL = 0;
const ASN1_CLASS_CONTEXT = 128;

/**
 * Extract the signature data from a signed PDF buffer.
 */
function extractSignature(pdfBuffer) {
    const pdfStr = pdfBuffer.toString('latin1');

    const byteRangeMatch = pdfStr.match(
        /\/ByteRange\s*\[(\s*\d+\s+\d+\s+\d+\s+\d+\s*)\]/
    );
    if (!byteRangeMatch) {
        return null;
    }

    const byteRange = byteRangeMatch[1].trim().split(/\s+/).map(Number);
    const [start1, length1, start2, length2] = byteRange;

    const signedPart1 = pdfBuffer.slice(start1, start1 + length1);
    const signedPart2 = pdfBuffer.slice(start2, start2 + length2);
    const signedData = Buffer.concat([signedPart1, signedPart2]);

    const rawBetween = pdfBuffer
        .slice(start1 + length1, start2)
        .toString('latin1');

    const ltIdx = rawBetween.indexOf('<');
    const gtIdx = rawBetween.lastIndexOf('>');
    if (ltIdx < 0 || gtIdx <= ltIdx) {
        return null;
    }

    let signatureHex = rawBetween.substring(ltIdx + 1, gtIdx);
    signatureHex = signatureHex.replace(/0+$/, '');
    if (signatureHex.length % 2 !== 0) {
        signatureHex += '0';
    }

    const signature = Buffer.from(signatureHex, 'hex');

    return { byteRange, signature, signedData };
}

/**
 * Navigate the PKCS#7 ASN.1 tree to find the SignerInfo node.
 *
 * Structure: ContentInfo -> content [0] -> SignedData SEQUENCE -> ... -> SignerInfos SET -> SignerInfo SEQUENCE
 */
function findSignerInfo(asn1Root) {
    // ContentInfo is a SEQUENCE
    // [0] = contentType OID, [1] = content [0] EXPLICIT
    const contentWrapper = asn1Root.value[1]; // CONTEXT [0]
    const signedDataSeq = contentWrapper.value[0]; // SignedData SEQUENCE

    // SignerInfos is the last SET in SignedData
    const lastChild = signedDataSeq.value[signedDataSeq.value.length - 1];
    if (!Array.isArray(lastChild.value) || lastChild.value.length === 0) {
        return null;
    }

    return lastChild.value[0]; // First SignerInfo SEQUENCE
}

/**
 * Find authenticated attributes node in a SignerInfo.
 * It's a CONTEXT-SPECIFIC [0] constructed node.
 */
function findAuthenticatedAttributes(signerInfo) {
    for (const child of signerInfo.value) {
        // CONTEXT_SPECIFIC class (128) with type 0 = authenticated attributes [0] IMPLICIT
        if (child.tagClass === ASN1_CLASS_CONTEXT && child.type === 0 && child.constructed) {
            return child;
        }
    }
    return null;
}

/**
 * Find the encrypted digest (signature value) in a SignerInfo.
 * It's the last OCTET STRING (type 4) with UNIVERSAL class.
 */
function findSignatureValue(signerInfo) {
    // The signature value is the last OCTET STRING in signterInfo
    for (let i = signerInfo.value.length - 1; i >= 0; i--) {
        const child = signerInfo.value[i];
        if (child.tagClass === ASN1_CLASS_UNIVERSAL && child.type === 4 && !child.constructed) {
            return child.value; // binary string
        }
    }
    return null;
}

/**
 * Extract the messageDigest value from authenticated attributes.
 * OID 1.2.840.113549.1.9.4 = messageDigest
 */
function findMessageDigest(authAttrsNode) {
    for (const attr of authAttrsNode.value) {
        if (!attr.value || attr.value.length < 2) continue;
        try {
            const oid = forge.asn1.derToOid(attr.value[0].value);
            if (oid === '1.2.840.113549.1.9.4') {
                const digestSet = attr.value[1];
                if (digestSet.value && digestSet.value.length > 0) {
                    return Buffer.from(digestSet.value[0].value, 'binary');
                }
            }
        } catch (_e) {
            // Skip unparseable attributes
        }
    }
    return null;
}

/**
 * Verify the digital signature of a PDF buffer.
 *
 * @param {Buffer} pdfBuffer - The complete PDF buffer to verify
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyPdfSignature(pdfBuffer) {
    try {
        // Step 1: Extract signature data from PDF
        const extracted = extractSignature(pdfBuffer);
        if (!extracted) {
            return { valid: false, reason: 'No digital signature found in PDF' };
        }

        const { signature, signedData } = extracted;

        // Step 2: Parse the PKCS#7 ASN.1 structure
        let asn1Root, p7;
        try {
            asn1Root = forge.asn1.fromDer(signature.toString('binary'));
            p7 = forge.pkcs7.messageFromAsn1(asn1Root);
        } catch (err) {
            return {
                valid: false,
                reason: 'Failed to parse digital signature: ' + err.message,
            };
        }

        const certificates = p7.certificates || [];
        if (certificates.length === 0) {
            return { valid: false, reason: 'No certificate found in the signature' };
        }

        // Step 3: Navigate ASN.1 tree to find signerInfo
        // Re-parse the ASN.1 since forge.pkcs7 may have consumed the buffer
        const asn1Fresh = forge.asn1.fromDer(signature.toString('binary'));
        const signerInfo = findSignerInfo(asn1Fresh);
        if (!signerInfo) {
            return { valid: false, reason: 'No signer info found in the signature' };
        }

        // Step 4: Find authenticated attributes
        const authAttrsNode = findAuthenticatedAttributes(signerInfo);

        // Step 5: Compute actual hash of the signed byte ranges
        const actualDigest = crypto
            .createHash('sha256')
            .update(signedData)
            .digest();

        // Step 6: Compare message digest (integrity check)
        if (authAttrsNode) {
            const embeddedDigest = findMessageDigest(authAttrsNode);
            if (embeddedDigest) {
                if (!actualDigest.equals(embeddedDigest)) {
                    return {
                        valid: false,
                        reason: 'PDF content has been modified after signing (digest mismatch)',
                    };
                }
            }

            // Step 7: Verify the RSA signature over authenticated attributes
            try {
                // Per PKCS#7 spec: for verification, the [0] IMPLICIT tag of
                // authenticatedAttributes is replaced with SET (UNIVERSAL 17)
                const setOfAttrs = forge.asn1.create(
                    ASN1_CLASS_UNIVERSAL,
                    17, // SET type
                    true,
                    authAttrsNode.value
                );
                const attrsDer = forge.asn1.toDer(setOfAttrs).getBytes();

                const md = forge.md.sha256.create();
                md.update(attrsDer);

                const sigValue = findSignatureValue(signerInfo);
                if (!sigValue) {
                    return { valid: false, reason: 'No signature value found' };
                }

                const signerCert = certificates[0];
                const verified = signerCert.publicKey.verify(
                    md.digest().getBytes(),
                    sigValue
                );

                if (!verified) {
                    return {
                        valid: false,
                        reason: 'Digital signature verification failed',
                    };
                }
            } catch (verifyErr) {
                return {
                    valid: false,
                    reason: 'Cryptographic verification failed: ' + verifyErr.message,
                };
            }
        }

        // Step 8: Check certificate validity dates
        const signerCert = certificates[0];
        const now = new Date();
        if (
            now < signerCert.validity.notBefore ||
            now > signerCert.validity.notAfter
        ) {
            return {
                valid: false,
                reason: 'Signing certificate has expired or is not yet valid',
            };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            reason: 'Signature verification error: ' + error.message,
        };
    }
}

module.exports = { verifyPdfSignature, extractSignature };


const fs = require('fs');
try {
    const content = fs.readFileSync('wallet_registry_output.txt', 'ucs2'); // PowerShell default encoding
    const match = content.match(/Contract address: (0x[a-fA-F0-9]{40})/);
    if (match) {
        console.log("FOUND_ADDRESS:" + match[1]);
    } else {
        console.log("Address not found via ucs2, trying utf8...");
        const contentUtf8 = fs.readFileSync('wallet_registry_output.txt', 'utf8');
        const matchUtf8 = contentUtf8.match(/Contract address: (0x[a-fA-F0-9]{40})/);
        if (matchUtf8) {
            console.log("FOUND_ADDRESS:" + matchUtf8[1]);
            fs.writeFileSync('wa.txt', matchUtf8[1]);
        } else {
            console.log("Address not found.");
        }
    }
} catch (e) {
    console.error(e);
}
if (fs.existsSync('wallet_registry_output.txt')) {
    // try one more time directly on the utf16le match
    const content = fs.readFileSync('wallet_registry_output.txt', 'ucs2');
    const match = content.match(/Contract address: (0x[a-fA-F0-9]{40})/);
    if (match) {
        fs.writeFileSync('wa.txt', match[1]);
    }
}


const fs = require('fs');
try {
    const filename = 'certificate_registry_output.txt';
    if (fs.existsSync(filename)) {
        const content = fs.readFileSync(filename, 'ucs2');
        const match = content.match(/Contract address: (0x[a-fA-F0-9]{40})/);
        if (match) {
            console.log("FOUND_ADDRESS:" + match[1]);
            fs.writeFileSync('ca.txt', match[1]);
        } else {
            const contentUtf8 = fs.readFileSync(filename, 'utf8');
            const matchUtf8 = contentUtf8.match(/Contract address: (0x[a-fA-F0-9]{40})/);
            if (matchUtf8) {
                console.log("FOUND_ADDRESS:" + matchUtf8[1]);
                fs.writeFileSync('ca.txt', matchUtf8[1]);
            }
        }
    }
} catch (e) {
    console.error(e);
}

const files = [
    './src/config/env',
    './src/config/blockchain',
    './src/app'
];

async function test() {
    for (const file of files) {
        console.log(`Testing require("${file}")...`);
        try {
            require(file);
            console.log(`✅ ${file} loaded`);
        } catch (err) {
            console.error(`❌ ${file} failed:`, err.message);
            process.exit(1);
        }
    }
    console.log('🎉 All requires passed!');
}

test();

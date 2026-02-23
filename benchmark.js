
const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const sessionId = crypto.randomBytes(4).toString('hex').toUpperCase();
const reportFile = `benchmark_report_${sessionId}.txt`;

function log(message) {
    console.log(message);
    fs.appendFileSync(reportFile, message + '\n');
}

log("=== CERTIFY BENCHMARK REPORT ===");
log(`Session ID: ${sessionId}`);
log(`Date: ${new Date().toISOString()}`);
log("");

// 1. System Info
try {
    log("--- System Information ---");
    log(`OS: ${process.platform} ${process.arch}`);
    log(`Node Version: ${process.version}`);
    log("");
} catch (e) { log("Error fetching system info\n"); }

// 2. Git Status
try {
    log("--- Git Status ---");
    const commit = execSync('git rev-parse HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    log(`Branch: ${branch}`);
    log(`Commit: ${commit}`);
    log("");
} catch (e) {
    log("Git info not available (not a git repo?)\n");
}

// 3. Backend Latency Test
log("--- Backend Performance (Health Check) ---");
const start = performance.now();
const req = http.get('http://localhost:3000/api/health', (res) => {
    const end = performance.now();
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        log(`Status Code: ${res.statusCode}`);
        const duration = (end - start).toFixed(2);
        log(`Response Time: ${duration} ms`);
        log(`Response Payload: ${data}`);
        log("\n=== END REPORT ===");
        console.log(`\n✅ Report saved to: ${reportFile}`);
    });
});

req.on('error', (e) => {
    log("Backend Check Failed: Is the server running on port 3000?");
    log(e.message);
});

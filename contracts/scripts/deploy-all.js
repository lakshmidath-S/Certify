const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);

    console.log("Deployer:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy WalletRegistry
    console.log("\n--- Deploying WalletRegistry ---");
    const WalletRegistry = await hre.ethers.getContractFactory("WalletRegistry");
    const walletRegistry = await WalletRegistry.deploy();
    await walletRegistry.waitForDeployment();
    const walletRegistryAddr = await walletRegistry.getAddress();
    console.log("WalletRegistry:", walletRegistryAddr);

    // Deploy CertificateRegistry
    console.log("\n--- Deploying CertificateRegistry ---");
    const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
    const certRegistry = await CertificateRegistry.deploy(walletRegistryAddr);
    await certRegistry.waitForDeployment();
    const certRegistryAddr = await certRegistry.getAddress();
    console.log("CertificateRegistry:", certRegistryAddr);

    // Write addresses to file
    const output = {
        deployer: deployer.address,
        network: hre.network.name,
        walletRegistry: walletRegistryAddr,
        certRegistry: certRegistryAddr,
        timestamp: new Date().toISOString()
    };

    const outPath = path.join(__dirname, "../deployed-addresses.json");
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log("\nAddresses saved to deployed-addresses.json");
    console.log(JSON.stringify(output, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error.message);
        process.exit(1);
    });

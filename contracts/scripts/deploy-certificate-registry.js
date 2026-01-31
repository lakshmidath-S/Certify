const hre = require("hardhat");

async function main() {
    try {
        // Get WalletRegistry address from environment variable or command line
        const walletRegistryAddress = process.env.WALLET_REGISTRY_ADDRESS || process.argv[process.argv.length - 1];

        if (!walletRegistryAddress || walletRegistryAddress.includes('deploy-certificate-registry')) {
            console.error("❌ Error: WalletRegistry address is required");
            console.log("\nUsage Option 1 (Environment Variable):");
            console.log("Set WALLET_REGISTRY_ADDRESS in .env file");
            console.log("\nUsage Option 2 (Command Line):");
            console.log("npx hardhat run scripts/deploy-certificate-registry.js --network <network> -- <WALLET_REGISTRY_ADDRESS>");
            console.log("\nExample:");
            console.log("npx hardhat run scripts/deploy-certificate-registry.js --network baseSepolia -- 0x1234...");
            process.exit(1);
        }

        if (!hre.ethers.isAddress(walletRegistryAddress)) {
            console.error("❌ Error: Invalid WalletRegistry address format");
            console.error("Received:", walletRegistryAddress);
            process.exit(1);
        }

        console.log("Deploying CertificateRegistry...");
        console.log("WalletRegistry address:", walletRegistryAddress);

        const [deployer] = await hre.ethers.getSigners();
        console.log("Deploying with account:", deployer.address);

        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

        const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
        const certificateRegistry = await CertificateRegistry.deploy(walletRegistryAddress);

        await certificateRegistry.waitForDeployment();

        const address = await certificateRegistry.getAddress();

        console.log("\n✅ CertificateRegistry deployed successfully!");
        console.log("Contract address:", address);
        console.log("Network:", hre.network.name);
        console.log("Admin:", deployer.address);
        console.log("WalletRegistry:", walletRegistryAddress);

    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error(error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

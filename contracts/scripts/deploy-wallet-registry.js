const hre = require("hardhat");

async function main() {
    try {
        console.log("Deploying WalletRegistry...");

        const [deployer] = await hre.ethers.getSigners();
        console.log("Deploying with account:", deployer.address);

        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

        const WalletRegistry = await hre.ethers.getContractFactory("WalletRegistry");
        const walletRegistry = await WalletRegistry.deploy();

        await walletRegistry.waitForDeployment();

        const address = await walletRegistry.getAddress();

        console.log("\n✅ WalletRegistry deployed successfully!");
        console.log("Contract address:", address);
        console.log("Network:", hre.network.name);
        console.log("Admin:", deployer.address);

        // Add user's wallet as admin
        const listAdminWallet = "0xFA258b9F026aCA36000374c795F6656f370AC33e";
        if (listAdminWallet) {
            console.log(`\nAdding user wallet ${listAdminWallet} as admin...`);
            const tx = await walletRegistry.addAdmin(listAdminWallet);
            await tx.wait();
            console.log("✅ User wallet added as admin!");
        }

        console.log("\nSave this address for CertificateRegistry deployment!");

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

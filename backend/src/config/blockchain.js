const { ethers } = require('ethers');
const config = require('./env');

const WalletRegistryABI = [
    "function registerIssuer(address issuer) external",
    "function suspendIssuer(address issuer) external",
    "function reactivateIssuer(address issuer) external",
    "function isValidIssuer(address issuer) external view returns (bool)",
    "function admins(address) external view returns (bool)",
    "function addAdmin(address newAdmin) external",
    "function admin() external view returns (address)",
    "function isAdmin(address account) external view returns (bool)"
];

const CertificateRegistryABI = [
    "function storeCertificateHash(bytes32 hash) external",
    "function revokeCertificate(bytes32 hash) external",
    "function isValidCertificate(bytes32 hash) external view returns (bool)",
    "function getCertificateInfo(bytes32 hash) external view returns (address issuer, uint256 issuedAt, bool revoked, uint256 revokedAt)",
    "function admin() external view returns (address)",
    "event CertificateStored(bytes32 indexed hash, address indexed issuer, uint256 timestamp)",
    "event CertificateRevoked(bytes32 indexed hash, uint256 timestamp)"
];

const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

// Perform a startup check to ensure RPC is accessible
(async () => {
    try {
        const network = await provider.getNetwork();
        console.log(`✅ Blockchain connected: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
        console.warn('⚠️  Blockchain RPC connection warning:', error.message);
    }
})();

const isAdminKeyPlaceholder = !config.blockchain.adminPrivateKey || config.blockchain.adminPrivateKey.includes('your_admin_private');
let blockchainSigner;

try {
    if (isAdminKeyPlaceholder) {
        console.warn('⚠️  ADMIN_PRIVATE_KEY is missing or a placeholder. On-chain write operations will fail.');
        // Create an ephemeral wallet or just leave it null
        blockchainSigner = null;
    } else {
        blockchainSigner = new ethers.Wallet(config.blockchain.adminPrivateKey, provider);
    }
} catch (error) {
    console.error('❌ Failed to initialize blockchain signer:', error.message);
    blockchainSigner = null;
}

const walletRegistry = new ethers.Contract(
    config.blockchain.walletRegistryAddress,
    WalletRegistryABI,
    blockchainSigner || provider // Use provider if no signer
);

const certificateRegistry = new ethers.Contract(
    config.blockchain.certRegistryAddress,
    CertificateRegistryABI,
    blockchainSigner || provider // Use provider if no signer
);

async function isIssuerValidOnChain(address) {
    try {
        const isValid = await walletRegistry.isValidIssuer(address);
        return isValid;
    } catch (error) {
        console.error('Error checking issuer validity on-chain:', error);
        throw new Error('Failed to verify issuer on blockchain');
    }
}

async function registerIssuerOnChain(issuerAddress, adminSigner) {
    try {
        const walletRegistryWithSigner = walletRegistry.connect(adminSigner);
        const tx = await walletRegistryWithSigner.registerIssuer(issuerAddress);
        const receipt = await tx.wait();
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
    } catch (error) {
        console.error('Error registering issuer on-chain:', error);
        throw new Error('Failed to register issuer on blockchain');
    }
}

async function suspendIssuerOnChain(issuerAddress, adminSigner) {
    try {
        const walletRegistryWithSigner = walletRegistry.connect(adminSigner);
        const tx = await walletRegistryWithSigner.suspendIssuer(issuerAddress);
        const receipt = await tx.wait();
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        console.error('Error suspending issuer on-chain:', error);
        throw new Error('Failed to suspend issuer on blockchain');
    }
}

async function reactivateIssuerOnChain(issuerAddress, adminSigner) {
    try {
        const walletRegistryWithSigner = walletRegistry.connect(adminSigner);
        const tx = await walletRegistryWithSigner.reactivateIssuer(issuerAddress);
        const receipt = await tx.wait();
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        console.error('Error reactivating issuer on-chain:', error);
        throw new Error('Failed to reactivate issuer on blockchain');
    }
}

async function storeCertificateHashOnChain(hash, issuerSigner) {
    try {
        const certRegistryWithSigner = certificateRegistry.connect(issuerSigner);
        const hashBytes32 = '0x' + hash;
        const tx = await certRegistryWithSigner.storeCertificateHash(hashBytes32);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('Error storing certificate hash on-chain:', error);
        throw new Error('Failed to store certificate on blockchain');
    }
}

async function revokeCertificateOnChain(hash, adminSigner) {
    try {
        const certRegistryWithSigner = certificateRegistry.connect(adminSigner);
        const hashBytes32 = '0x' + hash;
        const tx = await certRegistryWithSigner.revokeCertificate(hashBytes32);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('Error revoking certificate on-chain:', error);
        throw new Error('Failed to revoke certificate on blockchain');
    }
}

async function verifyCertificateOnChain(hash) {
    try {
        const hashBytes32 = '0x' + hash;
        const isValid = await certificateRegistry.isValidCertificate(hashBytes32);
        const [issuer, issuedAt, revoked, revokedAt] = await certificateRegistry.getCertificateInfo(hashBytes32);

        return {
            exists: issuer !== ethers.ZeroAddress,
            isValid,
            issuer,
            issuedAt: Number(issuedAt),
            revoked,
            revokedAt: Number(revokedAt)
        };
    } catch (error) {
        console.error('Error verifying certificate on-chain:', error);
        throw new Error('Failed to verify certificate on blockchain');
    }
}

module.exports = {
    provider,
    blockchainSigner,
    walletRegistry,
    certificateRegistry,
    isIssuerValidOnChain,
    registerIssuerOnChain,
    suspendIssuerOnChain,
    reactivateIssuerOnChain,
    storeCertificateHashOnChain,
    revokeCertificateOnChain,
    verifyCertificateOnChain
};

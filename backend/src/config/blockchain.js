const { ethers } = require('ethers');
const config = require('./env');

const WalletRegistryABI = [
    "function mapWallet(address issuer) external",
    "function revokeWallet(address issuer) external",
    "function isValidIssuer(address issuer) external view returns (bool)",
    "function admin() external view returns (address)",
    "event WalletMapped(address indexed issuer, uint256 timestamp)",
    "event WalletRevoked(address indexed issuer, uint256 timestamp)"
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

const walletRegistry = new ethers.Contract(
    config.blockchain.walletRegistryAddress,
    WalletRegistryABI,
    provider
);

const certificateRegistry = new ethers.Contract(
    config.blockchain.certRegistryAddress,
    CertificateRegistryABI,
    provider
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

async function mapWalletOnChain(issuerAddress, adminSigner) {
    try {
        const walletRegistryWithSigner = walletRegistry.connect(adminSigner);
        const tx = await walletRegistryWithSigner.mapWallet(issuerAddress);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('Error mapping wallet on-chain:', error);
        throw new Error('Failed to map wallet on blockchain');
    }
}

async function revokeWalletOnChain(issuerAddress, adminSigner) {
    try {
        const walletRegistryWithSigner = walletRegistry.connect(adminSigner);
        const tx = await walletRegistryWithSigner.revokeWallet(issuerAddress);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('Error revoking wallet on-chain:', error);
        throw new Error('Failed to revoke wallet on blockchain');
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
    walletRegistry,
    certificateRegistry,
    isIssuerValidOnChain,
    mapWalletOnChain,
    revokeWalletOnChain,
    storeCertificateHashOnChain,
    revokeCertificateOnChain,
    verifyCertificateOnChain
};

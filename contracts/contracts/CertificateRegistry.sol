// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IWalletRegistry.sol";

/**
 * @title CertificateRegistry
 * @notice Stores and manages certificate hashes for CERTIFY platform
 * @dev Integrates with WalletRegistry to validate issuer authorization
 */
contract CertificateRegistry {
    
    // Struct to store certificate information
    struct CertInfo {
        address issuer;
        uint256 issuedAt;
        bool revoked;
        uint256 revokedAt;
    }
    
    // State variables
    address public admin;
    IWalletRegistry public walletRegistry;
    
    // Mapping from certificate hash to certificate info
    mapping(bytes32 => CertInfo) public certificates;
    
    // Events
    event CertificateStored(bytes32 indexed hash, address indexed issuer, uint256 timestamp);
    event CertificateRevoked(bytes32 indexed hash, uint256 timestamp);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "CertificateRegistry: caller is not admin");
        _;
    }
    
    modifier onlyValidIssuer() {
        require(walletRegistry.isValidIssuer(msg.sender), "CertificateRegistry: caller is not a valid issuer");
        _;
    }
    
    /**
     * @notice Constructor sets admin and WalletRegistry address
     * @param _walletRegistryAddress Address of the WalletRegistry contract
     */
    constructor(address _walletRegistryAddress) {
        require(_walletRegistryAddress != address(0), "CertificateRegistry: wallet registry cannot be zero address");
        
        admin = msg.sender;
        walletRegistry = IWalletRegistry(_walletRegistryAddress);
        
        emit AdminTransferred(address(0), msg.sender);
    }
    
    /**
     * @notice Store a certificate hash
     * @param hash SHA256 hash of the certificate
     */
    function storeCertificateHash(bytes32 hash) external onlyValidIssuer {
        require(hash != bytes32(0), "CertificateRegistry: hash cannot be zero");
        require(certificates[hash].issuer == address(0), "CertificateRegistry: certificate hash already exists");
        
        certificates[hash] = CertInfo({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            revokedAt: 0
        });
        
        emit CertificateStored(hash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Revoke a certificate
     * @param hash SHA256 hash of the certificate to revoke
     */
    function revokeCertificate(bytes32 hash) external onlyAdmin {
        require(hash != bytes32(0), "CertificateRegistry: hash cannot be zero");
        require(certificates[hash].issuer != address(0), "CertificateRegistry: certificate does not exist");
        require(!certificates[hash].revoked, "CertificateRegistry: certificate already revoked");
        
        certificates[hash].revoked = true;
        certificates[hash].revokedAt = block.timestamp;
        
        emit CertificateRevoked(hash, block.timestamp);
    }
    
    /**
     * @notice Check if a certificate is valid
     * @param hash SHA256 hash of the certificate
     * @return bool True if certificate exists and is not revoked
     */
    function isValidCertificate(bytes32 hash) external view returns (bool) {
        CertInfo memory cert = certificates[hash];
        
        // Certificate must exist and not be revoked
        if (cert.issuer == address(0)) {
            return false;
        }
        
        if (cert.revoked) {
            return false;
        }
        
        // Check if issuer wallet is still valid
        if (!walletRegistry.isValidIssuer(cert.issuer)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Get certificate details
     * @param hash SHA256 hash of the certificate
     * @return issuer Address of the issuer
     * @return issuedAt Timestamp when certificate was issued
     * @return revoked Whether certificate is revoked
     * @return revokedAt Timestamp when certificate was revoked (0 if not revoked)
     */
    function getCertificateInfo(bytes32 hash) external view returns (
        address issuer,
        uint256 issuedAt,
        bool revoked,
        uint256 revokedAt
    ) {
        CertInfo memory cert = certificates[hash];
        return (cert.issuer, cert.issuedAt, cert.revoked, cert.revokedAt);
    }
    
    /**
     * @notice Transfer admin role to a new address
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "CertificateRegistry: new admin cannot be zero address");
        require(newAdmin != admin, "CertificateRegistry: new admin is same as current admin");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
}

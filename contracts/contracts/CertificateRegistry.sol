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
    struct Certificate {
        bytes32 hash;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        uint256 revokedAt;
        bool exists;
    }
    
    // State variables
    address public admin;
    IWalletRegistry public immutable walletRegistry;
    
    // Mapping from certificate hash to certificate info
    mapping(bytes32 => Certificate) public certificates;
    
    // Events
    event CertificateIssued(bytes32 indexed hash, address indexed issuer, uint256 timestamp);
    event CertificateRevoked(bytes32 indexed hash, uint256 timestamp);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "CertificateRegistry: caller is not admin");
        _;
    }
    
    modifier onlyActiveIssuer() {
        require(walletRegistry.isValidIssuer(msg.sender), "CertificateRegistry: issuer not active or suspended");
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
    function storeCertificateHash(bytes32 hash) external onlyActiveIssuer {
        require(hash != bytes32(0), "CertificateRegistry: hash cannot be zero");
        require(!certificates[hash].exists, "CertificateRegistry: duplicate certificate");
        
        certificates[hash] = Certificate({
            hash: hash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            revokedAt: 0,
            exists: true
        });
        
        emit CertificateIssued(hash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Revoke a certificate
     * @param hash SHA256 hash of the certificate to revoke
     */
    function revokeCertificate(bytes32 hash) external {
        require(certificates[hash].exists, "CertificateRegistry: not found");
        require(certificates[hash].issuer == msg.sender || msg.sender == admin, "CertificateRegistry: not authorized");
        require(!certificates[hash].revoked, "CertificateRegistry: already revoked");
        
        certificates[hash].revoked = true;
        certificates[hash].revokedAt = block.timestamp;
        
        emit CertificateRevoked(hash, block.timestamp);
    }
    
    /**
     * @notice Check if a certificate is valid
     * @param hash SHA256 hash of the certificate
     */
    function isValidCertificate(bytes32 hash) external view returns (bool) {
        Certificate memory cert = certificates[hash];
        
        if (!cert.exists || cert.revoked) {
            return false;
        }
        
        // Issuer must still be active
        if (!walletRegistry.isValidIssuer(cert.issuer)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Get certificate details
     */
    function getCertificateInfo(bytes32 hash) external view returns (
        address issuer,
        uint256 issuedAt,
        bool revoked,
        uint256 revokedAt
    ) {
        Certificate memory cert = certificates[hash];
        return (cert.issuer, cert.issuedAt, cert.revoked, cert.revokedAt);
    }

    /**
     * @notice Transfer admin role
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "CertificateRegistry: zero address");
        address previousAdmin = admin;
        admin = newAdmin;
        emit AdminTransferred(previousAdmin, newAdmin);
    }
}

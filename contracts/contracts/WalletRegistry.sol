// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WalletRegistry
 * @notice Manages issuer wallet authorization for CERTIFY platform
 * @dev Admin-controlled contract for mapping and revoking issuer wallets
 */
contract WalletRegistry {
    
    // State variables
    address public admin;
    
    // Mapping to track valid issuers
    mapping(address => bool) public validIssuer;
    
    // Mapping to track when wallet was mapped
    mapping(address => uint256) public mappedAt;
    
    // Mapping to track when wallet was revoked
    mapping(address => uint256) public revokedAt;
    
    // Events
    event WalletMapped(address indexed issuer, uint256 timestamp);
    event WalletRevoked(address indexed issuer, uint256 timestamp);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "WalletRegistry: caller is not admin");
        _;
    }
    
    /**
     * @notice Constructor sets the deployer as admin
     */
    constructor() {
        admin = msg.sender;
        emit AdminTransferred(address(0), msg.sender);
    }
    
    /**
     * @notice Map a new issuer wallet
     * @param issuer Address of the issuer wallet to map
     */
    function mapWallet(address issuer) external onlyAdmin {
        require(issuer != address(0), "WalletRegistry: issuer cannot be zero address");
        require(!validIssuer[issuer], "WalletRegistry: wallet already mapped");
        
        validIssuer[issuer] = true;
        mappedAt[issuer] = block.timestamp;
        
        emit WalletMapped(issuer, block.timestamp);
    }
    
    /**
     * @notice Revoke an issuer wallet
     * @param issuer Address of the issuer wallet to revoke
     */
    function revokeWallet(address issuer) external onlyAdmin {
        require(issuer != address(0), "WalletRegistry: issuer cannot be zero address");
        require(validIssuer[issuer], "WalletRegistry: wallet not mapped");
        
        validIssuer[issuer] = false;
        revokedAt[issuer] = block.timestamp;
        
        emit WalletRevoked(issuer, block.timestamp);
    }
    
    /**
     * @notice Check if an address is a valid issuer
     * @param issuer Address to check
     * @return bool True if issuer is valid and not revoked
     */
    function isValidIssuer(address issuer) external view returns (bool) {
        return validIssuer[issuer];
    }
    
    /**
     * @notice Transfer admin role to a new address
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "WalletRegistry: new admin cannot be zero address");
        require(newAdmin != admin, "WalletRegistry: new admin is same as current admin");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
}

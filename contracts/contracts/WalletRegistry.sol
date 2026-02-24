// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WalletRegistry
 * @notice Manages issuer wallet authorization for CERTIFY platform
 * @dev Admin-controlled contract for mapping and revoking issuer wallets
 */
contract WalletRegistry {
    
    // State variables
    address public immutable admin;
    mapping(address => bool) public admins;
    
    // Mapping to track authorized issuers (verified via signature)
    mapping(address => bool) public authorizedIssuers;
    
    // Mapping to track suspended issuers
    mapping(address => bool) public suspendedIssuers;
    
    // Legacy tracking (modified for compatibility)
    mapping(address => uint256) public mappedAt;
    mapping(address => uint256) public revokedAt;
    
    // Events
    event IssuerRegistered(address indexed issuer, uint256 timestamp);
    event IssuerSuspended(address indexed issuer, uint256 timestamp);
    event IssuerReactivated(address indexed issuer, uint256 timestamp);
    event WalletRevoked(address indexed issuer, uint256 timestamp);
    event AdminAdded(address indexed newAdmin);
    event AdminRemoved(address indexed admin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(admins[msg.sender], "WalletRegistry: caller is not admin");
        _;
    }

    modifier onlyActiveIssuer(address issuer) {
        require(authorizedIssuers[issuer], "WalletRegistry: issuer not authorized");
        require(!suspendedIssuers[issuer], "WalletRegistry: issuer suspended");
        _;
    }
    
    /**
     * @notice Constructor sets the deployer as admin
     */
    constructor() {
        admin = msg.sender;
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }
    
    /**
     * @notice Register a verified issuer wallet
     * @param issuer Address of the issuer wallet
     */
    function registerIssuer(address issuer) external onlyAdmin {
        require(issuer != address(0), "WalletRegistry: zero address");
        require(!authorizedIssuers[issuer], "WalletRegistry: already registered");
        
        authorizedIssuers[issuer] = true;
        suspendedIssuers[issuer] = false;
        mappedAt[issuer] = block.timestamp;
        
        emit IssuerRegistered(issuer, block.timestamp);
    }
    
    /**
     * @notice Suspend an issuer wallet
     * @param issuer Address of the issuer
     */
    function suspendIssuer(address issuer) external onlyAdmin {
        require(authorizedIssuers[issuer], "WalletRegistry: not registered");
        require(!suspendedIssuers[issuer], "WalletRegistry: already suspended");
        
        suspendedIssuers[issuer] = true;
        emit IssuerSuspended(issuer, block.timestamp);
    }

    /**
     * @notice Reactivate a suspended issuer wallet
     * @param issuer Address of the issuer
     */
    function reactivateIssuer(address issuer) external onlyAdmin {
        require(authorizedIssuers[issuer], "WalletRegistry: not registered");
        require(suspendedIssuers[issuer], "WalletRegistry: not suspended");
        
        suspendedIssuers[issuer] = false;
        emit IssuerReactivated(issuer, block.timestamp);
    }

    /**
     * @notice Check if an issuer is active
     */
    function isValidIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer] && !suspendedIssuers[issuer];
    }
    
    /**
     * @notice Legacy support for verification (checks both mappings)
     */
    function validIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer] && !suspendedIssuers[issuer];
    }

    /**
     * @notice Add a new admin
     */
    function addAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "WalletRegistry: zero address");
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    /**
     * @notice Remove an admin
     * @param adminAddress Address of the admin to remove
     */
    function removeAdmin(address adminAddress) external onlyAdmin {
        require(admins[adminAddress], "WalletRegistry: not an admin");
        require(msg.sender != adminAddress, "WalletRegistry: cannot remove yourself");
        
        admins[adminAddress] = false;
        emit AdminRemoved(adminAddress);
    }

    /**
     * @notice Check if an address is an admin
     * @param account Address to check
     */
    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }
}

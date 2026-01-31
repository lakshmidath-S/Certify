// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IWalletRegistry
 * @notice Interface for WalletRegistry contract
 * @dev Used by CertificateRegistry to validate issuer wallets
 */
interface IWalletRegistry {
    /**
     * @notice Check if an address is a valid issuer
     * @param issuer Address to check
     * @return bool True if issuer is valid and not revoked
     */
    function isValidIssuer(address issuer) external view returns (bool);
}

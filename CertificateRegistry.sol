// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {

    // Structure to store certificate details
    struct Certificate {
        address issuer;
        uint256 issuedAt;
        bool exists;
    }

    // Mapping from certificate hash to Certificate data
    mapping(bytes32 => Certificate) private certificates;

    // Event emitted when a certificate is issued
    event CertificateIssued(
        bytes32 indexed certHash,
        address indexed issuer,
        uint256 timestamp
    );

    /**
     * @notice Issue a new certificate by storing its hash on blockchain
     * @param certHash SHA-256 hash of the certificate
     */
    function issueCertificate(bytes32 certHash) external {
        require(certHash != bytes32(0), "Invalid hash");
        require(!certificates[certHash].exists, "Certificate already issued");

        certificates[certHash] = Certificate({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            exists: true
        });

        emit CertificateIssued(certHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify a certificate hash
     * @param certHash SHA-256 hash of the certificate
     * @return valid Whether the certificate exists
     * @return issuer Address that issued the certificate
     * @return issuedAt Timestamp when certificate was issued
     */
    function verifyCertificate(bytes32 certHash)
        external
        view
        returns (bool valid, address issuer, uint256 issuedAt)
    {
        Certificate memory cert = certificates[certHash];

        if (cert.exists) {
            return (true, cert.issuer, cert.issuedAt);
        } else {
            return (false, address(0), 0);
        }
    }
}

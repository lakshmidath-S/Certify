const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
    let walletRegistry;
    let certificateRegistry;
    let admin;
    let issuer1;
    let issuer2;
    let nonIssuer;

    const CERT_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("certificate1"));
    const CERT_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("certificate2"));

    beforeEach(async function () {
        [admin, issuer1, issuer2, nonIssuer] = await ethers.getSigners();

        const WalletRegistry = await ethers.getContractFactory("WalletRegistry");
        walletRegistry = await WalletRegistry.deploy();
        await walletRegistry.waitForDeployment();

        const walletRegistryAddress = await walletRegistry.getAddress();

        const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
        certificateRegistry = await CertificateRegistry.deploy(walletRegistryAddress);
        await certificateRegistry.waitForDeployment();

        await walletRegistry.connect(admin).mapWallet(issuer1.address);
    });

    describe("Deployment", function () {
        it("Should set the deployer as admin", async function () {
            expect(await certificateRegistry.admin()).to.equal(admin.address);
        });

        it("Should set the WalletRegistry address", async function () {
            const walletRegistryAddress = await walletRegistry.getAddress();
            expect(await certificateRegistry.walletRegistry()).to.equal(walletRegistryAddress);
        });

        it("Should not allow deploying with zero address", async function () {
            const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
            await expect(
                CertificateRegistry.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("CertificateRegistry: wallet registry cannot be zero address");
        });
    });

    describe("Certificate Storage", function () {
        it("Should allow valid issuer to store certificate hash", async function () {
            const tx = await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);
            await expect(tx).to.emit(certificateRegistry, "CertificateStored");

            const certInfo = await certificateRegistry.certificates(CERT_HASH_1);
            expect(certInfo.issuer).to.equal(issuer1.address);
            expect(certInfo.revoked).to.be.false;
        });

        it("Should not allow non-issuer to store certificate hash", async function () {
            await expect(
                certificateRegistry.connect(nonIssuer).storeCertificateHash(CERT_HASH_1)
            ).to.be.revertedWith("CertificateRegistry: caller is not a valid issuer");
        });

        it("Should not allow storing zero hash", async function () {
            await expect(
                certificateRegistry.connect(issuer1).storeCertificateHash(ethers.ZeroHash)
            ).to.be.revertedWith("CertificateRegistry: hash cannot be zero");
        });

        it("Should not allow storing duplicate hash", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);

            await expect(
                certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1)
            ).to.be.revertedWith("CertificateRegistry: certificate hash already exists");
        });

        it("Should record timestamp when certificate is stored", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);

            const certInfo = await certificateRegistry.certificates(CERT_HASH_1);
            expect(certInfo.issuedAt).to.be.gt(0);
        });
    });

    describe("Certificate Revocation", function () {
        beforeEach(async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);
        });

        it("Should allow admin to revoke certificate", async function () {
            const tx = await certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_1);
            await expect(tx).to.emit(certificateRegistry, "CertificateRevoked");

            const certInfo = await certificateRegistry.certificates(CERT_HASH_1);
            expect(certInfo.revoked).to.be.true;
        });

        it("Should not allow non-admin to revoke certificate", async function () {
            await expect(
                certificateRegistry.connect(issuer1).revokeCertificate(CERT_HASH_1)
            ).to.be.revertedWith("CertificateRegistry: caller is not admin");
        });

        it("Should not allow revoking non-existent certificate", async function () {
            await expect(
                certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_2)
            ).to.be.revertedWith("CertificateRegistry: certificate does not exist");
        });

        it("Should not allow revoking already revoked certificate", async function () {
            await certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_1);

            await expect(
                certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_1)
            ).to.be.revertedWith("CertificateRegistry: certificate already revoked");
        });

        it("Should record timestamp when certificate is revoked", async function () {
            await certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_1);

            const certInfo = await certificateRegistry.certificates(CERT_HASH_1);
            expect(certInfo.revokedAt).to.be.gt(0);
        });
    });

    describe("isValidCertificate", function () {
        it("Should return false for non-existent certificate", async function () {
            expect(await certificateRegistry.isValidCertificate(CERT_HASH_1)).to.be.false;
        });

        it("Should return true for valid certificate", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);
            expect(await certificateRegistry.isValidCertificate(CERT_HASH_1)).to.be.true;
        });

        it("Should return false for revoked certificate", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);
            await certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_1);
            expect(await certificateRegistry.isValidCertificate(CERT_HASH_1)).to.be.false;
        });

        it("Should return false when issuer wallet is revoked", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);
            await walletRegistry.connect(admin).revokeWallet(issuer1.address);
            expect(await certificateRegistry.isValidCertificate(CERT_HASH_1)).to.be.false;
        });
    });

    describe("getCertificateInfo", function () {
        it("Should return correct certificate info", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);

            const [issuer, issuedAt, revoked, revokedAt] = await certificateRegistry.getCertificateInfo(CERT_HASH_1);

            expect(issuer).to.equal(issuer1.address);
            expect(issuedAt).to.be.gt(0);
            expect(revoked).to.be.false;
            expect(revokedAt).to.equal(0);
        });

        it("Should return correct info for revoked certificate", async function () {
            await certificateRegistry.connect(issuer1).storeCertificateHash(CERT_HASH_1);
            await certificateRegistry.connect(admin).revokeCertificate(CERT_HASH_1);

            const [issuer, issuedAt, revoked, revokedAt] = await certificateRegistry.getCertificateInfo(CERT_HASH_1);

            expect(issuer).to.equal(issuer1.address);
            expect(issuedAt).to.be.gt(0);
            expect(revoked).to.be.true;
            expect(revokedAt).to.be.gt(0);
        });
    });

    describe("Admin Transfer", function () {
        it("Should allow admin to transfer admin role", async function () {
            const tx = await certificateRegistry.connect(admin).transferAdmin(nonIssuer.address);
            await expect(tx)
                .to.emit(certificateRegistry, "AdminTransferred")
                .withArgs(admin.address, nonIssuer.address);

            expect(await certificateRegistry.admin()).to.equal(nonIssuer.address);
        });

        it("Should not allow non-admin to transfer admin role", async function () {
            await expect(
                certificateRegistry.connect(nonIssuer).transferAdmin(nonIssuer.address)
            ).to.be.revertedWith("CertificateRegistry: caller is not admin");
        });
    });
});

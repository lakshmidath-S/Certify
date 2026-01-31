const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WalletRegistry", function () {
    let walletRegistry;
    let admin;
    let issuer1;
    let issuer2;
    let nonAdmin;

    beforeEach(async function () {
        [admin, issuer1, issuer2, nonAdmin] = await ethers.getSigners();

        const WalletRegistry = await ethers.getContractFactory("WalletRegistry");
        walletRegistry = await WalletRegistry.deploy();
        await walletRegistry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the deployer as admin", async function () {
            expect(await walletRegistry.admin()).to.equal(admin.address);
        });
    });

    describe("Wallet Mapping", function () {
        it("Should allow admin to map a wallet", async function () {
            const tx = await walletRegistry.connect(admin).mapWallet(issuer1.address);
            await expect(tx).to.emit(walletRegistry, "WalletMapped");

            expect(await walletRegistry.validIssuer(issuer1.address)).to.be.true;
            expect(await walletRegistry.isValidIssuer(issuer1.address)).to.be.true;
        });

        it("Should not allow non-admin to map a wallet", async function () {
            await expect(
                walletRegistry.connect(nonAdmin).mapWallet(issuer1.address)
            ).to.be.revertedWith("WalletRegistry: caller is not admin");
        });

        it("Should not allow mapping zero address", async function () {
            await expect(
                walletRegistry.connect(admin).mapWallet(ethers.ZeroAddress)
            ).to.be.revertedWith("WalletRegistry: issuer cannot be zero address");
        });

        it("Should not allow mapping already mapped wallet", async function () {
            await walletRegistry.connect(admin).mapWallet(issuer1.address);

            await expect(
                walletRegistry.connect(admin).mapWallet(issuer1.address)
            ).to.be.revertedWith("WalletRegistry: wallet already mapped");
        });

        it("Should record timestamp when wallet is mapped", async function () {
            await walletRegistry.connect(admin).mapWallet(issuer1.address);

            const mappedAt = await walletRegistry.mappedAt(issuer1.address);
            expect(mappedAt).to.be.gt(0);
        });
    });

    describe("Wallet Revocation", function () {
        beforeEach(async function () {
            await walletRegistry.connect(admin).mapWallet(issuer1.address);
        });

        it("Should allow admin to revoke a wallet", async function () {
            const tx = await walletRegistry.connect(admin).revokeWallet(issuer1.address);
            await expect(tx).to.emit(walletRegistry, "WalletRevoked");

            expect(await walletRegistry.validIssuer(issuer1.address)).to.be.false;
            expect(await walletRegistry.isValidIssuer(issuer1.address)).to.be.false;
        });

        it("Should not allow non-admin to revoke a wallet", async function () {
            await expect(
                walletRegistry.connect(nonAdmin).revokeWallet(issuer1.address)
            ).to.be.revertedWith("WalletRegistry: caller is not admin");
        });

        it("Should not allow revoking unmapped wallet", async function () {
            await expect(
                walletRegistry.connect(admin).revokeWallet(issuer2.address)
            ).to.be.revertedWith("WalletRegistry: wallet not mapped");
        });

        it("Should record timestamp when wallet is revoked", async function () {
            await walletRegistry.connect(admin).revokeWallet(issuer1.address);

            const revokedAt = await walletRegistry.revokedAt(issuer1.address);
            expect(revokedAt).to.be.gt(0);
        });
    });

    describe("isValidIssuer", function () {
        it("Should return false for unmapped wallet", async function () {
            expect(await walletRegistry.isValidIssuer(issuer1.address)).to.be.false;
        });

        it("Should return true for mapped wallet", async function () {
            await walletRegistry.connect(admin).mapWallet(issuer1.address);
            expect(await walletRegistry.isValidIssuer(issuer1.address)).to.be.true;
        });

        it("Should return false for revoked wallet", async function () {
            await walletRegistry.connect(admin).mapWallet(issuer1.address);
            await walletRegistry.connect(admin).revokeWallet(issuer1.address);
            expect(await walletRegistry.isValidIssuer(issuer1.address)).to.be.false;
        });
    });

    describe("Admin Transfer", function () {
        it("Should allow admin to transfer admin role", async function () {
            const tx = await walletRegistry.connect(admin).transferAdmin(nonAdmin.address);
            await expect(tx)
                .to.emit(walletRegistry, "AdminTransferred")
                .withArgs(admin.address, nonAdmin.address);

            expect(await walletRegistry.admin()).to.equal(nonAdmin.address);
        });

        it("Should not allow non-admin to transfer admin role", async function () {
            await expect(
                walletRegistry.connect(nonAdmin).transferAdmin(nonAdmin.address)
            ).to.be.revertedWith("WalletRegistry: caller is not admin");
        });

        it("Should not allow transferring to zero address", async function () {
            await expect(
                walletRegistry.connect(admin).transferAdmin(ethers.ZeroAddress)
            ).to.be.revertedWith("WalletRegistry: new admin cannot be zero address");
        });
    });
});

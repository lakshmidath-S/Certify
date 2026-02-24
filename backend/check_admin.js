const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const walletRegistryAddress = process.env.CONTRACT_WALLET_REGISTRY;

const abi = [
    "function admin() external view returns (address)",
    "function admins(address) external view returns (bool)",
    "function isAdmin(address) external view returns (bool)"
];

const contract = new ethers.Contract(walletRegistryAddress, abi, provider);

async function test() {
    console.log("Checking contract at:", walletRegistryAddress);

    try {
        const admin = await contract.admin();
        console.log("admin() returned:", admin);
    } catch (e) {
        console.log("admin() failed:", e.message);
    }

    try {
        const testAddr = "0x2565Cb3fBb1Ee78771F2b1C7316b5D632179f863"; // The address in the error
        const isAdmin = await contract.isAdmin(testAddr);
        console.log("isAdmin() returned:", isAdmin);
    } catch (e) {
        console.log("isAdmin() failed");
    }

    try {
        const testAddr = "0x2565Cb3fBb1Ee78771F2b1C7316b5D632179f863"; // The address in the error
        const isAdmins = await contract.admins(testAddr);
        console.log("admins() returned:", isAdmins);
    } catch (e) {
        console.log("admins() failed");
    }
}

test();

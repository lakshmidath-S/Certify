import { ethers } from 'ethers';

const BASE_SEPOLIA_CHAIN_ID = '0x14a34';

/**
 * CertificateRegistry the browser anchors hashes to. This MUST be the same
 * address as the backend's CONTRACT_CERT_REGISTRY — issuing against one
 * registry while verification reads another makes every certificate come back
 * NOT_ON_CHAIN. The default is the currently deployed registry; override it
 * with VITE_CERT_REGISTRY_ADDRESS (inlined at build time) after a redeploy so
 * this no longer needs a code edit.
 */
const CERT_REGISTRY_ADDRESS =
    (import.meta.env.VITE_CERT_REGISTRY_ADDRESS ?? '').trim() ||
    '0xb5B043baC7e5F734862Dcc9De25f6cc2bf171Ce9';

const CERT_REGISTRY_ABI = [
    'function storeCertificateHash(bytes32 hash) external',
];

export const walletService = {
    async connectWallet() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });

        return accounts[0];
    },

    async getAddress() {
        if (!window.ethereum) {
            return null;
        }

        const accounts = await window.ethereum.request({
            method: 'eth_accounts',
        });

        return accounts[0] || null;
    },

    async signMessage(message) {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const accounts = await window.ethereum.request({
            method: 'eth_accounts',
        });

        if (accounts.length === 0) {
            throw new Error('No wallet connected');
        }

        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, accounts[0]],
        });

        return signature;
    },

    async checkNetwork() {
        if (!window.ethereum) {
            return false;
        }

        const chainId = await window.ethereum.request({
            method: 'eth_chainId',
        });

        return chainId === BASE_SEPOLIA_CHAIN_ID;
    },

    async switchToBaseSepolia() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
            });
        } catch (error) {
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: BASE_SEPOLIA_CHAIN_ID,
                            chainName: 'Base Sepolia',
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18,
                            },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org'],
                        },
                    ],
                });
            } else {
                throw error;
            }
        }
    },

    onAccountsChanged(callback) {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', callback);
        }
    },

    onChainChanged(callback) {
        if (window.ethereum) {
            window.ethereum.on('chainChanged', callback);
        }
    },

    async storeCertificateHash(hash) {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const contract = new ethers.Contract(CERT_REGISTRY_ADDRESS, CERT_REGISTRY_ABI, signer);

        const hashBytes32 = '0x' + hash;
        const tx = await contract.storeCertificateHash(hashBytes32);
        const receipt = await tx.wait();

        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    },
};

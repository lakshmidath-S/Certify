import { ethers } from 'ethers';

const BASE_SEPOLIA_CHAIN_ID = '0x14a34';

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
};

import apiClient from './client';

export const authAPI = {
    login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (userData) => {
        const response = await apiClient.post('/auth/register', userData);
        return response.data;
    },

    getProfile: async () => {
        const response = await apiClient.get('/auth/profile');
        return response.data;
    },
};

export const walletAuthAPI = {
    requestChallenge: async (walletAddress) => {
        const response = await apiClient.post('/wallet-auth/challenge', { walletAddress });
        return response.data;
    },

    verifySignature: async (walletAddress, signature, message) => {
        const response = await apiClient.post('/wallet-auth/verify', {
            walletAddress,
            signature,
            message,
        });
        return response.data;
    },
};

export const walletAPI = {
    mapWallet: async (walletAddress, userId, adminPrivateKey) => {
        const response = await apiClient.post('/wallets/map', {
            walletAddress,
            userId,
            adminPrivateKey,
        });
        return response.data;
    },

    revokeWallet: async (walletAddress, reason, adminPrivateKey) => {
        const response = await apiClient.post('/wallets/revoke', {
            walletAddress,
            reason,
            adminPrivateKey,
        });
        return response.data;
    },

    getMyWallets: async () => {
        const response = await apiClient.get('/wallets/my-wallets');
        return response.data;
    },

    getWallet: async (address) => {
        const response = await apiClient.get(`/wallets/${address}`);
        return response.data;
    },
};

export const certificateAPI = {
    issueCertificate: async (certificateData) => {
        const response = await apiClient.post('/certificates/issue', certificateData);
        return response.data;
    },

    getMyCertificates: async (limit = 50, offset = 0) => {
        const response = await apiClient.get(`/certificates/my?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    downloadCertificate: async (certificateId) => {
        const response = await apiClient.get(`/certificates/${certificateId}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },
};

export const verificationAPI = {
    verifyHash: async (hash) => {
        const response = await apiClient.post('/verify/hash', { hash });
        return response.data;
    },

    verifyBulk: async (hashes) => {
        const response = await apiClient.post('/verify/bulk', { hashes });
        return response.data;
    },
};

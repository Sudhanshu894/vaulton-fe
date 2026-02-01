import axios from 'axios';

const API_URL = "https://vaulton-backend-f8c2dge3b7fwfch6.centralindia-01.azurewebsites.net";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const checkHealth = async () => {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch (error) {
        console.error("Health check failed:", error);
        throw error;
    }
};

export const registerChallenge = async () => {
    try {
        const response = await api.post('/register-challenge');
        return response.data;
    } catch (error) {
        console.error("Register challenge failed:", error);
        throw error;
    }
};

export const verifyRegister = async (cred, tempUserId) => {
    try {
        const response = await api.post('/register-verify', { cred, tempUserId });
        return response.data;
    } catch (error) {
        console.error("Verify register failed:", error);
        throw error;
    }
};

export const loginChallenge = async () => {
    try {
        const response = await api.post('/login-challenge');
        return response.data;
    } catch (error) {
        console.error("Login challenge failed:", error);
        throw error;
    }
};

export const verifyLogin = async (cred, challengeId) => {
    try {
        const response = await api.post('/login-verify', { cred, challengeId });
        return response.data;
    } catch (error) {
        console.error("Verify login failed:", error);
        throw error;
    }
};

export const getUserInfo = async (userId) => {
    try {
        const response = await api.get(`/user-info?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error("Get user info failed:", error);
        throw error;
    }
};

export const getUSDCBalance = async (childId) => {
    try {
        const response = await api.post('/get-usdc-balance', { childId });
        return response.data;
    } catch (error) {
        console.error("Get balance failed:", error);
        throw error;
    }
};

export const getNonce = async (childId) => {
    try {
        const response = await api.post('/get-nonce', { childId });
        return response.data;
    } catch (error) {
        console.error("Get nonce failed:", error);
        throw error;
    }
};

export const transferUSDC = async (transferData) => {
    try {
        const response = await api.post('/transfer-usdc', transferData);
        return response.data;
    } catch (error) {
        console.error("Transfer USDC failed:", error);
        throw error;
    }
};

// Also needed for account checking/deploying logic in frontend
export const deploySmartAccount = async (factoryId, wasmHash, keyId, passkeyPubkey, userId) => {
    try {
        const response = await api.post('/deploy-child', {
            factoryId,
            wasmHash,
            keyId,
            passkeyPubkey,
            userId
        });
        return response.data;
    } catch (error) {
        console.error("Deploy smart account failed:", error);
        throw error;
    }
};

export const getTransactions = async (address, page = 1, limit = 5) => {
    try {
        const response = await api.get('/transactions', {
            params: { address, page, limit }
        });
        return response.data;
    } catch (error) {
        console.error("Get transactions failed:", error);
        throw error;
    }
};

export const createSupportTicket = async (ticketData) => {
    try {
        const response = await api.post('/tickets', ticketData);
        return response.data;
    } catch (error) {
        console.error("Create support ticket failed:", error);
        throw error;
    }
};

export const getSupportTickets = async (walletAddress, page = 1, limit = 5) => {
    try {
        const response = await api.get(`/tickets/${walletAddress}`, {
            params: { page, limit }
        });
        return response.data;
    } catch (error) {
        console.error("Get support tickets failed:", error);
        throw error;
    }
};

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://821d-103-210-33-209.ngrok-free.app";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
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
        const response = await api.get('/auth/register/challenge');
        return response.data;
    } catch (error) {
        console.error("Register challenge failed:", error);
        throw error;
    }
};

export const verifyRegister = async (credential, tempUserId) => {
    try {
        const response = await api.post('/auth/register/verify', { credential, tempUserId });
        return response.data;
    } catch (error) {
        console.error("Verify register failed:", error);
        throw error;
    }
};

export const loginChallenge = async () => {
    try {
        const response = await api.get('/auth/login/challenge');
        return response.data;
    } catch (error) {
        console.error("Login challenge failed:", error);
        throw error;
    }
};

export const verifyLogin = async (credential, challengeId) => {
    try {
        const response = await api.post('/auth/login/verify', { credential, challengeId });
        return response.data;
    } catch (error) {
        console.error("Verify login failed:", error);
        throw error;
    }
};

export const getUserInfo = async (userId) => {
    try {
        const response = await api.get(`/user/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Get user info failed:", error);
        throw error;
    }
};

export const getUSDCBalance = async (childId) => {
    try {
        const response = await api.get(`/wallet/balance/${childId}`);
        return response.data;
    } catch (error) {
        console.error("Get balance failed:", error);
        throw error;
    }
};

export const deploySmartAccount = async (factoryId, wasmHash, credentialId, passkeyPubkey, userId) => {
    try {
        const response = await api.post('/wallet/deploy', {
            factoryId,
            wasmHash,
            credentialId,
            passkeyPubkey,
            userId
        });
        return response.data;
    } catch (error) {
        console.error("Deploy smart account failed:", error);
        throw error;
    }
};

export const createSupportTicket = async (ticketData) => {
    try {
        const response = await api.post('/support/ticket', ticketData);
        return response.data;
    } catch (error) {
        console.error("Error creating support ticket:", error);
        throw error;
    }
};

export const getSupportTickets = async (address, page = 1) => {
    try {
        const response = await api.get(`/support/tickets/${address}?page=${page}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching support tickets:", error);
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

export const createScheduledTransaction = async (txData) => {
    try {
        const response = await api.post('/scheduled-transactions', txData);
        return response.data;
    } catch (error) {
        console.error("Create scheduled transaction failed:", error);
        throw error;
    }
};

export const getScheduledTransactions = async (params) => {
    try {
        const response = await api.get('/scheduled-transactions', { params });
        return response.data;
    } catch (error) {
        console.error("Get scheduled transactions failed:", error);
        throw error;
    }
};

export const cancelScheduledTransaction = async (txId) => {
    try {
        const response = await api.patch(`/scheduled-transactions/${txId}/cancel`);
        return response.data;
    } catch (error) {
        console.error("Cancel scheduled transaction failed:", error);
        throw error;
    }
};

import axios from 'axios';

const API_URL = "https://f8c3-2409-40d7-a8-6109-906b-5a7d-19ae-5972.ngrok-free.app";

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
        const response = await api.post('/register-challenge');
        return response.data;
    } catch (error) {
        console.error("Register challenge failed:", error);
        throw error;
    }
};

export const verifyRegister = async (cred) => {
    try {
        const response = await api.post('/register-verify', { cred });
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

export const verifyLogin = async (cred) => {
    try {
        const response = await api.post('/login-verify', { cred });
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
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Number(limit) || 5);
        const offset = (safePage - 1) * safeLimit;
        const response = await api.get('/transactions', {
            params: { address, limit: safeLimit, offset }
        });
        const data = response.data || {};
        const total = Number(data.total ?? data.count ?? 0);
        const totalPages = Math.max(1, Math.ceil(total / safeLimit));

        return {
            ...data,
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            pagination: data.pagination || {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages,
            },
        };
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

export const getScheduledTransactionById = async (id) => {
    try {
        const response = await api.get(`/scheduled-transactions`, { params: { id } });
        return response.data;
    } catch (error) {
        console.error("Get scheduled transaction by ID failed:", error);
        throw error;
    }
};

// ZK Privacy Pool Services
export const zkGenerateKeys = async (userId) => {
    try {
        const response = await api.post('/zk/keys/generate', { userId });
        return response.data;
    } catch (error) {
        console.error("ZK Generate keys failed:", error);
        throw error;
    }
};

export const zkDeriveKeys = async (userId) => {
    try {
        const response = await api.post('/zk/keys/derive', { userId });
        return response.data;
    } catch (error) {
        console.error("ZK Derive keys failed:", error);
        throw error;
    }
};

export const zkGetKeys = async (userId) => {
    try {
        const response = await api.get(`/zk/keys?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error("ZK Get keys failed:", error);
        throw error;
    }
};

export const zkDeployChild = async (userId, forceRedeploy = false, saltTag = null) => {
    try {
        const response = await api.post('/zk/deploy-child', {
            userId,
            forceRedeploy,
            saltTag
        });
        return response.data;
    } catch (error) {
        console.error("ZK Deploy child failed:", error);
        throw error;
    }
};

export const zkPrepareRegister = async (data) => {
    try {
        const response = await api.post('/zk/pool/prepare-register', data);
        return response.data;
    } catch (error) {
        console.error("ZK Prepare register failed:", error);
        throw error;
    }
};

export const zkSubmitRegister = async (data) => {
    try {
        const response = await api.post('/zk/pool/submit-register', data);
        return response.data;
    } catch (error) {
        console.error("ZK Submit register failed:", error);
        throw error;
    }
};

export const zkGetPoolBalance = async (userId) => {
    try {
        const response = await api.get(`/zk/pool/balance?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error("ZK Get pool balance failed:", error);
        throw error;
    }
};

export const zkPrepareDeposit = async (data) => {
    try {
        const response = await api.post('/zk/pool/prepare-deposit', data);
        return response.data;
    } catch (error) {
        console.error("ZK Prepare deposit failed:", error);
        throw error;
    }
};

export const zkSubmitDeposit = async (data) => {
    try {
        const response = await api.post('/zk/pool/submit-deposit', data);
        return response.data;
    } catch (error) {
        console.error("ZK Submit deposit failed:", error);
        throw error;
    }
};

export const zkPrepareWithdrawal = async (data) => {
    try {
        const response = await api.post('/zk/pool/prepare-withdrawal', data);
        return response.data;
    } catch (error) {
        console.error("ZK Prepare withdrawal failed:", error);
        throw error;
    }
};

export const zkSubmitWithdrawal = async (data) => {
    try {
        const response = await api.post('/zk/pool/submit-withdrawal', data);
        return response.data;
    } catch (error) {
        console.error("ZK Submit withdrawal failed:", error);
        throw error;
    }
};

export const zkPrepareTransfer = async (data) => {
    try {
        const response = await api.post('/zk/pool/prepare-transfer', data);
        return response.data;
    } catch (error) {
        console.error("ZK Prepare transfer failed:", error);
        throw error;
    }
};

export const zkSubmitTransfer = async (data) => {
    try {
        const response = await api.post('/zk/pool/submit-transfer', data);
        return response.data;
    } catch (error) {
        console.error("ZK Submit transfer failed:", error);
        throw error;
    }
};

export const zkGetRecipientInfo = async (recipientUserId) => {
    try {
        const response = await api.get(`/zk/pool/recipient-info?recipientUserId=${recipientUserId}`);
        return response.data;
    } catch (error) {
        console.error("ZK Recipient info failed:", error);
        throw error;
    }
};

export const zkGetRegisteredUsers = async () => {
    try {
        const response = await api.get('/zk/pool/registered-users');
        return response.data;
    } catch (error) {
        console.error("ZK Registered users failed:", error);
        throw error;
    }
};

export const zkGetUserInfo = async (userId) => {
    try {
        const response = await api.get(`/zk/user-info?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error("ZK User info failed:", error);
        throw error;
    }
};

export const backendBuildScheduledChallenge = async (data) => {
    try {
        const response = await api.post('/build-scheduled-challenge', data);
        return response.data;
    } catch (error) {
        console.error("Build scheduled challenge failed:", error);
        throw error;
    }
};

export const backendScheduleTransfer = async (data) => {
    try {
        const response = await api.post('/schedule-transfer', data);
        return response.data;
    } catch (error) {
        console.error("Schedule transfer failed:", error);
        throw error;
    }
};

export const backendListScheduledTransfers = async (childId, status) => {
    try {
        let q = [];
        if (childId) q.push(`childId=${encodeURIComponent(childId)}`);
        if (status) q.push(`status=${encodeURIComponent(status)}`);
        const query = q.length > 0 ? `?${q.join('&')}` : '';
        const response = await api.get(`/scheduled-transfers${query}`);
        return response.data;
    } catch (error) {
        console.error("List scheduled transfers failed:", error);
        throw error;
    }
};

export const backendExecuteScheduledTransfer = async (txIdHex) => {
    try {
        const response = await api.post('/execute-scheduled-transfer', { txIdHex });
        return response.data;
    } catch (error) {
        console.error("Execute scheduled transfer failed:", error);
        throw error;
    }
};

export const backendCancelScheduledTransfer = async (data) => {
    try {
        const response = await api.post('/cancel-scheduled-transfer', data);
        return response.data;
    } catch (error) {
        console.error("Cancel scheduled transfer failed:", error);
        throw error;
    }
};

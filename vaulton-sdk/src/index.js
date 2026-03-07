import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

const DEFAULT_BACKEND_URL = "https://vaulton-testnet.dahiya.tech";
const DEFAULT_STORAGE_KEY = "vaulton_wallet_sdk_session";
const STROOPS_PER_USDC = 10_000_000n;

const isBrowser = () => typeof window !== "undefined";

const ensurePasskeyEnvironment = () => {
    if (!isBrowser()) {
        throw new Error("Vaulton Wallet SDK passkey methods must run in a browser environment.");
    }
    if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("Passkeys are not supported in this browser.");
    }
};

const normalizeBaseUrl = (value) => {
    const raw = String(value || DEFAULT_BACKEND_URL).trim();
    return raw.replace(/\/+$/, "");
};

const safeParseJson = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (_) {
        return { message: text };
    }
};

const base64UrlToBytes = (value) => {
    const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return new Uint8Array([...atob(padded)].map((char) => char.charCodeAt(0)));
};

const bytesToBase64Url = (bytes) => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const bytesToHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const derToRs = (der) => {
    let offset = 2;
    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature");

    let rLen = der[offset++];
    let r = der.slice(offset, offset + rLen);
    offset += rLen;
    if (r[0] === 0 && r.length > 32) r = r.slice(1);
    while (r.length < 32) r = new Uint8Array([0, ...r]);
    r = r.slice(-32);

    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature");
    let sLen = der[offset++];
    let s = der.slice(offset, offset + sLen);
    if (s[0] === 0 && s.length > 32) s = s.slice(1);
    while (s.length < 32) s = new Uint8Array([0, ...s]);
    s = s.slice(-32);

    const rs = new Uint8Array(64);
    rs.set(r, 0);
    rs.set(s, 32);
    return rs;
};

const toStroops = (amountUsdc) => {
    const raw = String(amountUsdc ?? "").trim();
    if (!raw) throw new Error("amountUsdc is required");

    const normalized = raw.startsWith(".") ? `0${raw}` : raw;
    if (!/^\d*(?:\.\d{0,7})?$/.test(normalized) || normalized === ".") {
        throw new Error("amountUsdc must be a valid USDC decimal (max 7 decimals)");
    }

    const [wholeRaw, fracRaw = ""] = normalized.split(".");
    const whole = BigInt(wholeRaw || "0");
    const fraction = BigInt((fracRaw + "0000000").slice(0, 7) || "0");
    const stroops = whole * STROOPS_PER_USDC + fraction;

    if (stroops <= 0n) {
        throw new Error("amountUsdc must be greater than 0");
    }
    return stroops.toString();
};

const buildTransferChallenge = async (amountInStroops, nonce) => {
    if (!isBrowser() || !window.crypto?.subtle) {
        throw new Error("Web Crypto API is not available in this environment.");
    }

    const amountBigInt = BigInt(String(amountInStroops));
    const nonceBigInt = BigInt(String(nonce));

    const amountBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) {
        amountBytes[i] = Number((amountBigInt >> BigInt(i * 8)) & 0xffn);
    }

    const nonceBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i += 1) {
        nonceBytes[i] = Number((nonceBigInt >> BigInt(i * 8)) & 0xffn);
    }

    const fnName = new TextEncoder().encode("transfer_usdc");
    const payload = new Uint8Array(fnName.length + 16 + 8);
    payload.set(fnName, 0);
    payload.set(amountBytes, fnName.length);
    payload.set(nonceBytes, fnName.length + 16);

    const hash = await window.crypto.subtle.digest("SHA-256", payload);
    return bytesToBase64Url(new Uint8Array(hash));
};

const isWalletAddress = (value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    return /^[GC][A-Z2-7]{20,}$/.test(text);
};

const buildSession = (userInfo, credentialId) => ({
    userId: String(userInfo?.userId || ""),
    smartAccountId: String(userInfo?.smartAccountId || ""),
    passkeyPubkey: String(userInfo?.passkeyPubkey || ""),
    publicKeyHex: String(userInfo?.publicKeyHex || userInfo?.passkeyPubkey || ""),
    name: String(userInfo?.name || ""),
    createdAt: String(userInfo?.createdAt || ""),
    credentialId: String(credentialId || ""),
});

export class VaultonWalletSDK {
    constructor(config = {}) {
        this.baseURL = normalizeBaseUrl(config.baseURL || config.backendUrl);
        this.storageKey = String(config.storageKey || DEFAULT_STORAGE_KEY);
    }

    async _request(path, options = {}) {
        const response = await fetch(`${this.baseURL}${path}`, {
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
                ...(options.headers || {}),
            },
            body: options.body == null ? undefined : JSON.stringify(options.body),
        });

        const payload = await safeParseJson(response);
        if (!response.ok) {
            const reason = payload?.error || payload?.message || `${options.method || "GET"} ${path} failed (${response.status})`;
            throw new Error(reason);
        }
        return payload;
    }

    _writeSession(session) {
        if (!isBrowser()) return;
        window.localStorage.setItem(this.storageKey, JSON.stringify(session));
    }

    _readSession() {
        if (!isBrowser()) return null;
        const raw = window.localStorage.getItem(this.storageKey);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }

    getSession() {
        return this._readSession();
    }

    restoreSession() {
        return this.getSession();
    }

    isLoggedIn() {
        const session = this._readSession();
        return Boolean(session?.userId && session?.smartAccountId);
    }

    logoutAccount() {
        if (!isBrowser()) return;
        window.localStorage.removeItem(this.storageKey);
    }

    async signupAccount() {
        ensurePasskeyEnvironment();

        const challengeData = await this._request("/register-challenge", { method: "POST", body: {} });
        if (!challengeData?.options) {
            throw new Error("No registration options returned from backend.");
        }

        const credential = await startRegistration(challengeData.options);
        const verifyData = await this._request("/register-verify", {
            method: "POST",
            body: { cred: credential },
        });

        if (!(verifyData?.success || verifyData?.verified) || !verifyData?.userId) {
            throw new Error(verifyData?.error || "Account signup failed.");
        }

        const userId = String(verifyData.userId);
        let userInfo = await this.getAccountInfo(userId);

        if (!userInfo?.smartAccountId) {
            await this._request("/deploy-child", {
                method: "POST",
                body: {
                    keyId: credential.id,
                    passkeyPubkey: userInfo?.passkeyPubkey,
                    userId,
                },
            });
            userInfo = await this.getAccountInfo(userId);
        }

        const session = buildSession(userInfo, credential.id);
        this._writeSession(session);
        return session;
    }

    async createAccount() {
        return this.signupAccount();
    }

    async loginAccount() {
        ensurePasskeyEnvironment();

        const challengeData = await this._request("/login-challenge", { method: "POST", body: {} });
        if (!challengeData?.options) {
            throw new Error("No login options returned from backend.");
        }

        const assertion = await startAuthentication(challengeData.options);
        const verifyData = await this._request("/login-verify", {
            method: "POST",
            body: { cred: assertion },
        });

        if (!(verifyData?.success || verifyData?.verified) || !verifyData?.userId) {
            throw new Error(verifyData?.error || "Login failed.");
        }

        const userInfo = await this.getAccountInfo(verifyData.userId);
        const session = buildSession(userInfo, assertion.id);
        this._writeSession(session);
        return session;
    }

    async getAccountInfo(userId) {
        const targetUserId = String(userId || this._readSession()?.userId || "").trim();
        if (!targetUserId) throw new Error("userId is required");
        return this._request(`/user-info?userId=${encodeURIComponent(targetUserId)}`);
    }

    async getUsdcBalance(childId) {
        const targetChildId = String(childId || this._readSession()?.smartAccountId || "").trim();
        if (!targetChildId) throw new Error("childId is required");
        return this._request("/get-usdc-balance", {
            method: "POST",
            body: { childId: targetChildId },
        });
    }

    async transferUsdc({ recipient, amountUsdc }) {
        ensurePasskeyEnvironment();

        const session = this._readSession();
        if (!session?.userId || !session?.smartAccountId) {
            throw new Error("No active session. Call loginAccount() or signupAccount() first.");
        }

        const cleanRecipient = String(recipient || "").trim();
        if (!isWalletAddress(cleanRecipient)) {
            throw new Error("recipient must be a valid Stellar address (G... or C...).");
        }

        const amount = toStroops(amountUsdc);
        const nonceData = await this._request("/get-nonce", {
            method: "POST",
            body: { childId: session.smartAccountId },
        });

        if (nonceData?.nonce == null) {
            throw new Error("Could not fetch account nonce.");
        }

        const challenge = await buildTransferChallenge(amount, nonceData.nonce);
        const loginData = await this._request("/login-challenge", { method: "POST", body: {} });
        if (!loginData?.options) {
            throw new Error("No passkey options returned from backend.");
        }

        const assertion = await startAuthentication({
            ...loginData.options,
            challenge,
        });

        const derSignature = base64UrlToBytes(assertion.response.signature);
        const signatureHex = bytesToHex(derToRs(derSignature));

        const transferData = await this._request("/transfer-usdc", {
            method: "POST",
            body: {
                childId: session.smartAccountId,
                recipient: cleanRecipient,
                amount,
                signatureHex,
                authData: assertion.response.authenticatorData,
                clientDataJSON: assertion.response.clientDataJSON,
                userId: session.userId,
            },
        });

        if (!transferData?.success) {
            throw new Error(transferData?.error || "USDC transfer failed.");
        }

        return transferData;
    }

    async sendUsdc(params) {
        return this.transferUsdc(params);
    }
}

export const createVaultonWalletSDK = (config) => new VaultonWalletSDK(config);

export const VAULTON_SDK_DEFAULTS = {
    backendUrl: DEFAULT_BACKEND_URL,
    storageKey: DEFAULT_STORAGE_KEY,
};

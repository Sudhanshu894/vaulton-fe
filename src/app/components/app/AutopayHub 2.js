"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Address, xdr } from "@stellar/stellar-sdk";
import {
    backendScheduleTransfer,
    backendListScheduledTransfers,
    backendExecuteScheduledTransfer,
    backendCancelScheduledTransfer,
    loginChallenge,
} from "@/services/backendservices";

const STROOPS_PER_USDC = 10000000n;
const ACTIVE_STATUSES = new Set(["pending", "executing"]);
const QUICK_PRESETS = [
    { label: "+2 min", ms: 2 * 60 * 1000 },
    { label: "+1 day", ms: 24 * 60 * 60 * 1000 },
    { label: "+1 week", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "+1 month", ms: 30 * 24 * 60 * 60 * 1000 },
];

const textEncoder = new TextEncoder();

const hexToUint8 = (hex) => {
    if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
};

const uint8ToHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

const uint8ToBase64url = (bytes) => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const concatBytes = (...parts) => {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
};

const encodeBigIntLe = (value, byteLen) => {
    let working = BigInt(value);
    if (working < 0n) {
        throw new Error("Value must be non-negative");
    }

    const out = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i += 1) {
        out[i] = Number(working & 0xffn);
        working >>= 8n;
    }

    if (working !== 0n) {
        throw new Error(`Value does not fit in ${byteLen} bytes`);
    }

    return out;
};

const derToRs = (der) => {
    let offset = 0;
    if (der[offset++] !== 0x30) throw new Error("Invalid DER signature");

    const seqLen = der[offset++];
    if (seqLen & 0x80) {
        const lenBytes = seqLen & 0x7f;
        offset += lenBytes;
    }

    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature (r marker)");
    const rLen = der[offset++];
    let r = der.slice(offset, offset + rLen);
    offset += rLen;

    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature (s marker)");
    const sLen = der[offset++];
    let s = der.slice(offset, offset + sLen);

    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);

    const out = new Uint8Array(64);
    out.set(r, 32 - r.length);
    out.set(s, 64 - s.length);
    return out;
};

const toLocalDateTimeInputValue = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};

const getDefaultScheduledAt = () => toLocalDateTimeInputValue(new Date(Date.now() + 2 * 60 * 1000));

const randomTxIdHex = () => {
    if (!globalThis.crypto?.getRandomValues) {
        throw new Error("Browser crypto is not available");
    }
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return uint8ToHex(bytes);
};

const sha256 = async (bytes) => {
    if (!globalThis.crypto?.subtle) {
        throw new Error("Web Crypto API is not available");
    }
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return new Uint8Array(digest);
};

const buildScheduledTransferChallengeHash = async ({ recipient, amount, txIdHex, deadline }) => {
    if (!/^[0-9a-fA-F]{64}$/.test(txIdHex)) {
        throw new Error("txIdHex must be 64 hex characters");
    }

    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
        throw new Error("Amount must be greater than 0");
    }

    const deadlineBigInt = BigInt(deadline || 0);
    if (deadlineBigInt < 0n) {
        throw new Error("Deadline must be non-negative");
    }

    let recipientScValXdr;
    try {
        recipientScValXdr = new Uint8Array(
            xdr.ScVal.scvAddress(Address.fromString(recipient).toScAddress()).toXDR()
        );
    } catch {
        throw new Error("Invalid recipient Stellar address");
    }

    const payload = concatBytes(
        textEncoder.encode("scheduled_transfer"),
        recipientScValXdr,
        encodeBigIntLe(BigInt.asUintN(128, amountBigInt), 16),
        hexToUint8(txIdHex),
        encodeBigIntLe(BigInt.asUintN(64, deadlineBigInt), 8)
    );

    return sha256(payload);
};

const buildCancelScheduledChallengeHash = async (txIdHex) => {
    if (!/^[0-9a-fA-F]{64}$/.test(txIdHex)) {
        throw new Error("Invalid transaction ID");
    }

    const payload = concatBytes(textEncoder.encode("cancel_scheduled"), hexToUint8(txIdHex));
    return sha256(payload);
};

const parseUsdcToStroops = (input) => {
    const value = String(input ?? "").trim();
    if (!/^\d*(\.\d{0,7})?$/.test(value) || value === "" || value === ".") {
        throw new Error("Enter a valid USDC amount (up to 7 decimals)");
    }

    const [wholeRaw = "0", fractionRaw = ""] = value.split(".");
    const whole = wholeRaw === "" ? "0" : wholeRaw;
    const fractionPadded = fractionRaw.padEnd(7, "0").slice(0, 7);
    const stroops = BigInt(whole) * STROOPS_PER_USDC + BigInt(fractionPadded || "0");

    if (stroops <= 0n) {
        throw new Error("Amount must be greater than 0");
    }

    return stroops.toString();
};

const formatStroopsToUsdc = (amount) => {
    const num = Number(amount);
    if (!Number.isFinite(num)) return "0.00";
    return (num / 10000000).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 7,
    });
};

const formatDateTime = (value) => {
    if (!value && value !== 0) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const shortText = (value, start = 10, end = 6) => {
    if (!value) return "-";
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const getStatusBadgeClasses = (status) => {
    switch (status) {
        case "completed":
            return "bg-emerald-100 text-emerald-700";
        case "executing":
            return "bg-sky-100 text-sky-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        case "failed":
            return "bg-rose-100 text-rose-700";
        case "consumed":
            return "bg-orange-100 text-orange-700";
        case "pending":
        default:
            return "bg-amber-100 text-amber-700";
    }
};

const getStatusAccentClasses = (status) => {
    switch (status) {
        case "completed":
            return "bg-emerald-100 text-emerald-600";
        case "executing":
            return "bg-sky-100 text-sky-600";
        case "cancelled":
            return "bg-red-100 text-red-600";
        case "failed":
            return "bg-rose-100 text-rose-600";
        case "consumed":
            return "bg-orange-100 text-orange-600";
        case "pending":
        default:
            return "bg-purple-100 text-purple-600";
    }
};

const normalizeErrorMessage = (error, fallback) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
};

const getPasskeyRpOptions = async () => {
    const challengeData = await loginChallenge();
    const options = challengeData?.options;
    if (!options?.rpId) {
        throw new Error("Passkey login options are missing rpId");
    }
    return options;
};

const serializeAssertion = (assertion) => {
    const response = assertion?.response;
    if (!response?.signature || !response.authenticatorData || !response.clientDataJSON) {
        throw new Error("Invalid passkey assertion response");
    }

    const derSignature = new Uint8Array(response.signature);
    const rsSignature = derToRs(derSignature);

    return {
        signatureHex: uint8ToHex(rsSignature),
        authData: uint8ToBase64url(new Uint8Array(response.authenticatorData)),
        clientDataJSON: uint8ToBase64url(new Uint8Array(response.clientDataJSON)),
    };
};

export default function AutopayHub({ onBack, user }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rules, setRules] = useState([]);
    const [isListLoading, setIsListLoading] = useState(false);
    const [hasLoadedRules, setHasLoadedRules] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [activeActionKey, setActiveActionKey] = useState("");
    const [statusMsg, setStatusMsg] = useState(null);

    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");

    const statusTimeoutRef = useRef(null);

    const smartAccountId = user?.smartAccountId;
    const userId = user?.userId;

    const activeCount = rules.filter((rule) => ACTIVE_STATUSES.has(rule.status)).length;

    const pushStatus = (message, type = "info", timeoutMs = 4000) => {
        setStatusMsg({ message, type });

        if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
        }

        statusTimeoutRef.current = setTimeout(() => {
            setStatusMsg(null);
            statusTimeoutRef.current = null;
        }, timeoutMs);
    };

    useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);

    const refreshRules = async ({ silent = false } = {}) => {
        if (!smartAccountId) {
            setRules([]);
            setHasLoadedRules(true);
            return;
        }

        if (!silent) {
            setIsListLoading(true);
        }

        try {
            const data = await backendListScheduledTransfers(smartAccountId);
            setRules(Array.isArray(data?.transfers) ? data.transfers : []);
        } catch (error) {
            pushStatus(normalizeErrorMessage(error, "Failed to load scheduled autopay payments"), "error", 5000);
        } finally {
            if (!silent) {
                setIsListLoading(false);
            }
            setHasLoadedRules(true);
        }
    };

    useEffect(() => {
        if (!smartAccountId) {
            setRules([]);
            setHasLoadedRules(true);
            setIsListLoading(false);
            return;
        }

        let isCancelled = false;
        setIsListLoading(true);

        (async () => {
            try {
                const data = await backendListScheduledTransfers(smartAccountId);
                if (!isCancelled) {
                    setRules(Array.isArray(data?.transfers) ? data.transfers : []);
                }
            } catch (error) {
                if (!isCancelled) {
                    pushStatus(normalizeErrorMessage(error, "Failed to load scheduled autopay payments"), "error", 5000);
                }
            } finally {
                if (!isCancelled) {
                    setIsListLoading(false);
                    setHasLoadedRules(true);
                }
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [smartAccountId]);

    const requestAssertion = async (challengeBytes) => {
        const options = await getPasskeyRpOptions();

        const credential = await navigator.credentials.get({
            publicKey: {
                challenge: challengeBytes,
                rpId: options.rpId,
                allowCredentials: [],
                userVerification: options.userVerification || "preferred",
                timeout: options.timeout || 120000,
            },
        });

        if (!credential) {
            throw new Error("Passkey authentication was not completed");
        }

        return credential;
    };

    const resetCreateForm = () => {
        setRecipient("");
        setAmount("");
        setScheduledAt(getDefaultScheduledAt());
    };

    const handleOpenModal = () => {
        if (!smartAccountId) {
            pushStatus("No smart account found. Create or login to a wallet before scheduling autopay.", "error", 5000);
            return;
        }

        if (!scheduledAt) {
            setScheduledAt(getDefaultScheduledAt());
        }

        setIsModalOpen(true);
    };

    const applyQuickPreset = (offsetMs) => {
        setScheduledAt(toLocalDateTimeInputValue(new Date(Date.now() + offsetMs)));
    };

    const handleCreateRule = async () => {
        const trimmedRecipient = recipient.trim();

        if (!smartAccountId) {
            pushStatus("No smart account available for scheduling", "error");
            return;
        }
        if (!userId) {
            pushStatus("User session is missing. Please log in again.", "error", 5000);
            return;
        }
        if (!trimmedRecipient) {
            pushStatus("Recipient is required", "error");
            return;
        }
        if (!scheduledAt) {
            pushStatus("Schedule date and time is required", "error");
            return;
        }

        let stroopAmount;
        let deadline;
        try {
            stroopAmount = parseUsdcToStroops(amount);
            deadline = new Date(scheduledAt).getTime();
            if (!Number.isFinite(deadline) || deadline <= 0) {
                throw new Error("Invalid schedule date/time");
            }
        } catch (error) {
            pushStatus(normalizeErrorMessage(error, "Invalid autopay form values"), "error", 5000);
            return;
        }

        setIsCreating(true);
        try {
            const txIdHex = randomTxIdHex();
            const challengeHash = await buildScheduledTransferChallengeHash({
                recipient: trimmedRecipient,
                amount: stroopAmount,
                txIdHex,
                deadline,
            });

            const assertion = await requestAssertion(challengeHash);
            const passkeyPayload = serializeAssertion(assertion);

            const response = await backendScheduleTransfer({
                childId: smartAccountId,
                recipient: trimmedRecipient,
                amount: stroopAmount,
                txIdHex,
                deadline,
                ...passkeyPayload,
                userId,
            });

            if (!response?.success) {
                throw new Error(response?.error || "Failed to schedule transfer");
            }

            pushStatus("Autopay payment scheduled successfully", "success");
            setIsModalOpen(false);
            resetCreateForm();
            await refreshRules({ silent: true });
        } catch (error) {
            pushStatus(normalizeErrorMessage(error, "Failed to create autopay payment"), "error", 5000);
        } finally {
            setIsCreating(false);
        }
    };

    const handleExecute = async (txIdHex) => {
        const actionKey = `execute:${txIdHex}`;
        setActiveActionKey(actionKey);

        try {
            const res = await backendExecuteScheduledTransfer(txIdHex);

            if (res?.success) {
                pushStatus("Scheduled payment executed successfully", "success");
            } else if (res?.retry) {
                pushStatus(res.error || "Execution deferred. Scheduler will retry automatically.", "info", 5000);
            } else if (res?.status === "consumed") {
                pushStatus(res.error || "Payment was already consumed on-chain", "error", 5000);
            } else {
                pushStatus(res?.error || "Failed to execute scheduled payment", "error", 5000);
            }
        } catch (error) {
            pushStatus(normalizeErrorMessage(error, "Failed to execute scheduled payment"), "error", 5000);
        } finally {
            setActiveActionKey("");
            await refreshRules({ silent: true });
        }
    };

    const handleCancel = async (txIdHex) => {
        if (!smartAccountId) {
            pushStatus("No smart account available for cancellation", "error");
            return;
        }

        const actionKey = `cancel:${txIdHex}`;
        setActiveActionKey(actionKey);

        try {
            const challengeHash = await buildCancelScheduledChallengeHash(txIdHex);
            const assertion = await requestAssertion(challengeHash);
            const passkeyPayload = serializeAssertion(assertion);

            const res = await backendCancelScheduledTransfer({
                childId: smartAccountId,
                txIdHex,
                ...passkeyPayload,
            });

            if (res?.success) {
                pushStatus("Scheduled payment cancelled successfully", "success");
            } else if (res?.status === "consumed") {
                pushStatus(res.error || "Payment was already consumed on-chain", "error", 5000);
            } else {
                pushStatus(res?.error || "Failed to cancel scheduled payment", "error", 5000);
            }
        } catch (error) {
            pushStatus(normalizeErrorMessage(error, "Failed to cancel scheduled payment"), "error", 5000);
        } finally {
            setActiveActionKey("");
            await refreshRules({ silent: true });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24 relative">
            {statusMsg && (
                <div
                    className={`p-4 rounded-xl text-center font-bold text-sm ${
                        statusMsg.type === "error"
                            ? "bg-red-50 text-red-600"
                            : statusMsg.type === "success"
                                ? "bg-green-50 text-green-600"
                                : "bg-sky-50 text-sky-600"
                    }`}
                >
                    {statusMsg.message}
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-[#1A1A2E]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-2xl font-black text-[#1A1A2E]">Autopay</h3>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Mainnet Live
                </div>
            </div>

            <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Scheduled</p>
                        <h4 className="text-4xl font-black text-[#1A1A2E]">{activeCount}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Pending + Executing payments</p>
                    </div>
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["pending", "executing", "completed", "cancelled"].map((status) => {
                        const count = rules.filter((rule) => rule.status === status).length;
                        return (
                            <div key={status} className="p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.18em]">{status}</p>
                                <p className="text-xl font-black text-[#1A1A2E] mt-1">{count}</p>
                            </div>
                        );
                    })}
                </div>

                {!smartAccountId && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-sm font-semibold">
                        No smart account is connected for this user yet. Create or log in to a wallet before scheduling autopay payments.
                    </div>
                )}
            </section>

            <button
                onClick={handleOpenModal}
                disabled={!smartAccountId}
                className="w-full py-5 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-bold hover:border-[#FFB800] hover:text-[#FFB800] hover:bg-[#FFB800]/5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Schedule Autopay Payment
            </button>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2 gap-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Scheduled Payments ({activeCount} active)
                    </p>
                    <button
                        onClick={() => refreshRules()}
                        disabled={!smartAccountId || isListLoading}
                        className="text-[10px] font-black text-[#FFB800] uppercase tracking-widest hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                        {isListLoading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {!smartAccountId ? (
                    <div className="w-full bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-center text-gray-500 font-semibold">
                        Connect a smart account to view and manage scheduled autopay payments.
                    </div>
                ) : isListLoading && !hasLoadedRules ? (
                    <div className="w-full bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center gap-4 text-gray-500">
                        <div className="w-8 h-8 border-4 border-[#FFB800]/20 border-t-[#FFB800] rounded-full animate-spin"></div>
                        <p className="text-sm font-bold">Loading scheduled payments...</p>
                    </div>
                ) : rules.length === 0 ? (
                    <div className="w-full bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-2">
                        <p className="text-lg font-black text-[#1A1A2E]">No scheduled autopay payments yet</p>
                        <p className="text-sm text-gray-500">Create one to schedule a future USDC payment with passkey approval.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rules.map((rule) => {
                            const status = rule.status || "pending";
                            const canAct = status === "pending";
                            const executeActionKey = `execute:${rule.id}`;
                            const cancelActionKey = `cancel:${rule.id}`;
                            const isExecuting = activeActionKey === executeActionKey;
                            const isCancelling = activeActionKey === cancelActionKey;

                            return (
                                <div key={rule.id} className="w-full bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all group text-left">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-start gap-4 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getStatusAccentClasses(status)}`}>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </div>
                                            <div className="min-w-0 pr-2 space-y-2">
                                                <p className="text-sm font-black text-[#1A1A2E] truncate" title={rule.recipient}>{rule.recipient}</p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-[10px] font-bold text-gray-400">TxID: {shortText(rule.id, 10, 8)}</p>
                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${getStatusBadgeClasses(status)}`}>
                                                        {status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-black text-[#1A1A2E]">${formatStroopsToUsdc(rule.amount)}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1">USDC</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-50 mt-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                            <p className="font-bold text-gray-500">
                                                <span className="text-gray-400">Scheduled:</span> {formatDateTime(rule.scheduledTime || rule.deadline)}
                                            </p>
                                            <p className="font-bold text-gray-500">
                                                <span className="text-gray-400">Created:</span> {formatDateTime(rule.createdAt)}
                                            </p>
                                            <p className="font-bold text-gray-500">
                                                <span className="text-gray-400">Executed:</span> {formatDateTime(rule.executedAt)}
                                            </p>
                                            <p className="font-bold text-gray-500 break-all">
                                                <span className="text-gray-400">Tx Hash:</span> {rule.txHash ? shortText(rule.txHash, 12, 10) : "-"}
                                            </p>
                                        </div>

                                        {rule.error && (
                                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-semibold break-words">
                                                {rule.error}
                                            </div>
                                        )}

                                        {canAct && (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <button
                                                    onClick={() => handleExecute(rule.id)}
                                                    disabled={Boolean(activeActionKey) || isCreating}
                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
                                                >
                                                    {isExecuting ? "Executing..." : "Execute"}
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(rule.id)}
                                                    disabled={Boolean(activeActionKey) || isCreating}
                                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
                                                >
                                                    {isCancelling ? "Cancelling..." : "Cancel"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A2E]/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                            style={{ maxHeight: "90vh" }}
                        >
                            <div className="p-6 overflow-y-auto no-scrollbar pb-10 flex-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-[#1A1A2E]">Schedule Autopay Payment</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-[#1A1A2E]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-[#4B5563]">Recipient</label>
                                        <input
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            placeholder="G... or C... Stellar address"
                                            className="w-full p-4 bg-[#F8F9FB] rounded-2xl outline-none text-sm text-[#1A1A2E]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-[#4B5563]">Amount (USDC)</label>
                                        <input
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            type="number"
                                            min="0"
                                            step="0.0000001"
                                            className="w-full p-4 bg-[#F8F9FB] rounded-2xl outline-none text-sm text-[#1A1A2E]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[12px] font-black text-[#4B5563]">Schedule Date & Time</label>
                                        <input
                                            value={scheduledAt}
                                            onChange={(e) => setScheduledAt(e.target.value)}
                                            type="datetime-local"
                                            className="w-full p-4 bg-[#F8F9FB] rounded-2xl outline-none text-sm text-[#1A1A2E]"
                                        />
                                    </div>

                                    <div className="space-y-2 pb-2">
                                        <label className="text-[12px] font-black text-[#4B5563]">Quick Presets</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {QUICK_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => applyQuickPreset(preset.ms)}
                                                    className="py-3 border border-gray-100 rounded-2xl text-[11px] font-black text-gray-500 hover:border-[#FFB800] hover:text-[#FFB800] transition-all"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-[#FFF8E7] p-4 rounded-xl flex items-start gap-3 mt-2">
                                        <svg className="w-5 h-5 text-[#FFB800] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0112 3c1.268 0 2.49.234 3.62.661m1.156 5.05a10.05 10.05 0 011.66 2.043m-9.043 9.14a10.05 10.05 0 01-1.66-2.043m9.043-9.14A10.003 10.003 0 0112 21c-1.268 0-2.49-.234-3.62-.661m-1.156-5.05a10.05 10.05 0 01-1.66-2.043" /></svg>
                                        <p className="text-[12px] font-bold text-[#1A1A2E] leading-relaxed">
                                            Passkey approval is required to schedule and cancel autopay payments.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleCreateRule}
                                        disabled={isCreating || !smartAccountId}
                                        className="w-full py-4 mt-4 bg-[#FFD572] hover:bg-[#FFB800] text-[#1A1A2E] font-black rounded-3xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {isCreating ? (
                                            <div className="w-5 h-5 border-2 border-[#1A1A2E]/20 border-t-[#1A1A2E] rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Schedule Autopay Payment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

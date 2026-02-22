"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Address, xdr } from "@stellar/stellar-sdk";
import {
    backendCancelScheduledTransfer,
    backendExecuteScheduledTransfer,
    backendListScheduledTransfers,
    backendScheduleTransfer,
    loginChallenge,
} from "@/services/backendservices";
import { parsePaymentRequest, shortAddress } from "@/lib/paymentRequest";

const STROOPS_PER_USDC = 10_000_000n;
const QR_REGION_ID = "vaulton-autopay-qr-reader";
const ACTIVE_STATUSES = new Set(["pending", "executing"]);

const STATUS_STYLES = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    executing: "bg-sky-50 text-sky-700 border-sky-100",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    cancelled: "bg-red-50 text-red-700 border-red-100",
    failed: "bg-rose-50 text-rose-700 border-rose-100",
    consumed: "bg-gray-100 text-gray-700 border-gray-200",
};

const RECIPIENT_ADDRESS_RE = /^(?:[GC][A-Z2-7]{20,}|0x[a-fA-F0-9]{40})$/;

const pad2 = (value) => String(value).padStart(2, "0");

const toDatetimeLocalInput = (dateLike) => {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const formatDateTime = (value) => {
    if (!value && value !== 0) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const formatStroopsToUsdc = (value) => {
    try {
        const raw = BigInt(String(value ?? 0));
        const whole = raw / STROOPS_PER_USDC;
        const frac = raw % STROOPS_PER_USDC;
        const fracText = frac.toString().padStart(7, "0").replace(/0+$/, "");
        return fracText ? `${whole.toString()}.${fracText}` : `${whole.toString()}.0`;
    } catch {
        const num = Number(value);
        if (!Number.isFinite(num)) return "0.00";
        return (num / 10_000_000).toFixed(2);
    }
};

const parseUsdcToStroops = (value) => {
    const text = String(value || "").trim();
    if (!/^\d+(?:\.\d{1,7})?$/.test(text)) {
        throw new Error("Enter a valid USDC amount (up to 7 decimals)");
    }
    const [wholeRaw, fracRaw = ""] = text.split(".");
    const whole = BigInt(wholeRaw || "0");
    const frac = BigInt((fracRaw + "0000000").slice(0, 7) || "0");
    const total = whole * STROOPS_PER_USDC + frac;
    if (total <= 0n) {
        throw new Error("Amount must be greater than 0");
    }
    return total.toString();
};

const isLikelyWalletAddress = (value) => RECIPIENT_ADDRESS_RE.test(String(value || "").trim());

const bytesToHex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

const hexToBytes = (hex) => {
    const clean = String(hex || "").trim();
    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
};

const bytesToBase64Url = (bytes) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const concatBytes = (...chunks) => {
    const total = chunks.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of chunks) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
};

const encodeBigIntLe = (value, byteLen) => {
    let working = BigInt(value);
    if (working < 0n) {
        throw new Error("Negative values are not supported");
    }
    const bytes = new Uint8Array(byteLen);
    for (let i = 0; i < byteLen; i += 1) {
        bytes[i] = Number(working & 0xffn);
        working >>= 8n;
    }
    if (working !== 0n) {
        throw new Error(`Value does not fit in ${byteLen} bytes`);
    }
    return bytes;
};

const derToRs = (derBytes) => {
    const der = derBytes instanceof Uint8Array ? derBytes : new Uint8Array(derBytes);
    let offset = 0;
    if (der[offset++] !== 0x30) throw new Error("Invalid DER signature");
    offset += 1;
    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature");
    let rLen = der[offset++];
    let r = der.slice(offset, offset + rLen);
    offset += rLen;
    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature");
    let sLen = der[offset++];
    let s = der.slice(offset, offset + sLen);

    if (r[0] === 0 && r.length > 32) r = r.slice(1);
    if (s[0] === 0 && s.length > 32) s = s.slice(1);
    if (r.length > 32) r = r.slice(-32);
    if (s.length > 32) s = s.slice(-32);

    const out = new Uint8Array(64);
    out.set(r, 32 - r.length);
    out.set(s, 64 - s.length);
    return out;
};

const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));

const buildScheduledTransferChallengeBytes = async ({ recipient, amount, txIdHex, deadline }) => {
    const txIdBytes = hexToBytes(txIdHex);
    if (txIdBytes.length !== 32) {
        throw new Error("txIdHex must be 32 bytes");
    }

    const recipientScValXdr = new Uint8Array(
        xdr.ScVal.scvAddress(Address.fromString(recipient).toScAddress()).toXDR()
    );
    const fnName = new TextEncoder().encode("scheduled_transfer");
    const amountBytes = encodeBigIntLe(BigInt.asUintN(128, BigInt(amount)), 16);
    const deadlineBytes = encodeBigIntLe(BigInt(deadline || 0), 8);
    const fullPayload = concatBytes(fnName, recipientScValXdr, amountBytes, txIdBytes, deadlineBytes);

    return sha256(fullPayload);
};

const buildCancelScheduledChallengeBytes = async (txIdHex) => {
    const txIdBytes = hexToBytes(txIdHex);
    if (txIdBytes.length !== 32) {
        throw new Error("txIdHex must be 32 bytes");
    }
    const fnName = new TextEncoder().encode("cancel_scheduled");
    return sha256(concatBytes(fnName, txIdBytes));
};

const randomTxIdHex = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
};

const getErrorMessage = (error, fallback) => {
    if (!error) return fallback;
    if (error.name === "NotAllowedError") return "Passkey request was cancelled";
    if (typeof error === "string") return error;
    return error.message || fallback;
};

const statusChipClass = (status) => STATUS_STYLES[status] || "bg-gray-50 text-gray-700 border-gray-200";

const normalizeTransferList = (data) => {
    const transfers = Array.isArray(data?.transfers) ? data.transfers : [];
    return [...transfers].sort((a, b) => {
        const aTime = new Date(a.scheduledTime || a.deadline || 0).getTime();
        const bTime = new Date(b.scheduledTime || b.deadline || 0).getTime();
        return aTime - bTime;
    });
};

export default function AutopayHub({ onBack, user, onDataChanged }) {
    const [transfers, setTransfers] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [listError, setListError] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({ recipient: "", amount: "", scheduledAt: "" });
    const [formError, setFormError] = useState("");
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    const [banner, setBanner] = useState(null);
    const [actionState, setActionState] = useState({ txId: "", kind: "" });

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const [scannerStatus, setScannerStatus] = useState("Preparing camera...");
    const [isStartingScanner, setIsStartingScanner] = useState(false);

    const scannerInstanceRef = useRef(null);
    const startScannerRef = useRef(null);

    const walletAddress = user?.smartAccountId || "";
    const userId = user?.userId || "";

    const activeTransfers = useMemo(
        () => transfers.filter((item) => ACTIVE_STATUSES.has(item.status)),
        [transfers]
    );
    const pendingTransfers = useMemo(
        () => transfers.filter((item) => item.status === "pending"),
        [transfers]
    );

    const loadTransfers = async () => {
        if (!walletAddress) {
            setTransfers([]);
            setListError("");
            return;
        }

        setIsLoadingList(true);
        setListError("");
        try {
            const data = await backendListScheduledTransfers(walletAddress);
            setTransfers(normalizeTransferList(data));
        } catch (error) {
            console.error("Failed to load scheduled transfers", error);
            setTransfers([]);
            setListError(getErrorMessage(error, "Could not load autopay list"));
        } finally {
            setIsLoadingList(false);
        }
    };

    useEffect(() => {
        loadTransfers();
    }, [walletAddress]);

    const stopScanner = async () => {
        const instance = scannerInstanceRef.current;
        if (!instance) return;
        scannerInstanceRef.current = null;
        try {
            if (instance.isScanning) {
                await instance.stop();
            }
        } catch (error) {
            console.error("Failed to stop autopay scanner", error);
        }
        try {
            await instance.clear();
        } catch (error) {
            console.error("Failed to clear autopay scanner", error);
        }
    };

    useEffect(() => () => {
        stopScanner();
    }, []);

    const closeScanner = async () => {
        setIsScannerOpen(false);
        await stopScanner();
    };

    const applyScannedRecipient = (decodedText) => {
        const parsed = parsePaymentRequest(decodedText);
        if (!parsed.recipient) {
            setScannerError("QR scanned, but no wallet address was found.");
            return false;
        }
        setForm((prev) => ({
            ...prev,
            recipient: parsed.recipient,
            amount: prev.amount || parsed.amount || "",
        }));
        setScannerError("");
        setScannerStatus("QR scanned successfully");
        return true;
    };

    const startScanner = async () => {
        setScannerError("");
        setScannerStatus("Preparing camera...");
        setIsStartingScanner(true);
        try {
            if (scannerInstanceRef.current) {
                await stopScanner();
            }
            const { Html5Qrcode } = await import("html5-qrcode");
            const scanner = new Html5Qrcode(QR_REGION_ID);
            scannerInstanceRef.current = scanner;
            setScannerStatus("Starting camera...");
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
                async (decodedText) => {
                    const ok = applyScannedRecipient(decodedText);
                    if (ok) {
                        await closeScanner();
                    }
                },
                () => {}
            );
            setScannerStatus("Point your camera at a wallet QR code");
        } catch (error) {
            console.error("Autopay QR scanner failed", error);
            setScannerError(getErrorMessage(error, "Unable to access camera"));
            setScannerStatus("");
        } finally {
            setIsStartingScanner(false);
        }
    };
    startScannerRef.current = startScanner;

    useEffect(() => {
        if (!isScannerOpen) return;
        if (scannerInstanceRef.current) return;
        startScannerRef.current?.();
    }, [isScannerOpen]);

    const openCreateModal = () => {
        setBanner(null);
        setFormError("");
        setForm((prev) => ({
            recipient: prev.recipient || "",
            amount: prev.amount || "",
            scheduledAt: prev.scheduledAt || toDatetimeLocalInput(Date.now() + 24 * 60 * 60 * 1000),
        }));
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        if (isSubmittingCreate) return;
        setIsCreateOpen(false);
    };

    const applyPreset = (offsetMs) => {
        setForm((prev) => ({ ...prev, scheduledAt: toDatetimeLocalInput(Date.now() + offsetMs) }));
    };

    const requestPasskeySignature = async (challengeBytes) => {
        const challengeOpts = await loginChallenge();
        const rpId = challengeOpts?.options?.rpId || window.location.hostname;
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: challengeBytes,
                rpId,
                allowCredentials: [],
                userVerification: "preferred",
                timeout: 120000,
            },
        });

        if (!assertion || !assertion.response) {
            throw new Error("Passkey signing failed");
        }

        const signatureHex = bytesToHex(derToRs(new Uint8Array(assertion.response.signature)));
        const authData = bytesToBase64Url(new Uint8Array(assertion.response.authenticatorData));
        const clientDataJSON = bytesToBase64Url(new Uint8Array(assertion.response.clientDataJSON));

        return { signatureHex, authData, clientDataJSON };
    };

    const refreshAfterChange = async () => {
        await loadTransfers();
        if (onDataChanged) {
            await onDataChanged();
        }
    };

    const handleCreateAutopay = async () => {
        setFormError("");
        setBanner(null);
        setIsSubmittingCreate(true);
        try {
            if (!walletAddress) throw new Error("No smart account found. Please log in first.");
            if (!userId) throw new Error("User session missing. Please log in again.");

            const recipient = String(form.recipient || "").trim();
            if (!recipient) throw new Error("Recipient address is required");
            if (!isLikelyWalletAddress(recipient)) throw new Error("Enter a valid recipient wallet address");
            if (recipient === walletAddress) throw new Error("Recipient cannot be your own wallet address");

            const amountInStroops = parseUsdcToStroops(form.amount);
            const deadline = new Date(form.scheduledAt).getTime();
            if (!form.scheduledAt || Number.isNaN(deadline)) {
                throw new Error("Scheduled date and time is required");
            }
            if (deadline <= Date.now()) {
                throw new Error("Scheduled time must be in the future");
            }

            const txIdHex = randomTxIdHex();
            const challengeBytes = await buildScheduledTransferChallengeBytes({
                recipient,
                amount: amountInStroops,
                txIdHex,
                deadline,
            });
            const sigData = await requestPasskeySignature(challengeBytes);

            const result = await backendScheduleTransfer({
                childId: walletAddress,
                recipient,
                amount: amountInStroops,
                txIdHex,
                deadline,
                signatureHex: sigData.signatureHex,
                authData: sigData.authData,
                clientDataJSON: sigData.clientDataJSON,
                userId,
            });

            if (!result?.success) {
                throw new Error(result?.error || "Failed to schedule autopay");
            }

            setBanner({
                type: "success",
                message: `Autopay scheduled for ${formatDateTime(result.scheduledTime || deadline)}.`,
            });
            setIsCreateOpen(false);
            setForm({ recipient: "", amount: "", scheduledAt: "" });
            await refreshAfterChange();
        } catch (error) {
            console.error("Create autopay failed", error);
            setFormError(getErrorMessage(error, "Failed to create autopay"));
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    const handleExecute = async (txIdHex) => {
        setBanner(null);
        setActionState({ txId: txIdHex, kind: "execute" });
        try {
            const result = await backendExecuteScheduledTransfer(txIdHex);
            if (result?.success) {
                setBanner({ type: "success", message: `Autopay executed${result.txHash ? ` • ${shortAddress(result.txHash, 10, 8)}` : ""}` });
            } else if (result?.retry || result?.status === "consumed") {
                setBanner({ type: "warning", message: result.error || `Execution deferred (${result.status || "retry"})` });
            } else {
                setBanner({ type: "error", message: result?.error || "Failed to execute autopay" });
            }
            await refreshAfterChange();
        } catch (error) {
            console.error("Execute scheduled transfer failed", error);
            setBanner({ type: "error", message: getErrorMessage(error, "Failed to execute autopay") });
            await loadTransfers();
        } finally {
            setActionState({ txId: "", kind: "" });
        }
    };

    const handleCancel = async (txIdHex) => {
        setBanner(null);
        setActionState({ txId: txIdHex, kind: "cancel" });
        try {
            if (!walletAddress) throw new Error("No smart account found. Please log in first.");

            const challengeBytes = await buildCancelScheduledChallengeBytes(txIdHex);
            const sigData = await requestPasskeySignature(challengeBytes);

            const result = await backendCancelScheduledTransfer({
                childId: walletAddress,
                txIdHex,
                signatureHex: sigData.signatureHex,
                authData: sigData.authData,
                clientDataJSON: sigData.clientDataJSON,
            });

            if (result?.success) {
                setBanner({ type: "success", message: "Scheduled autopay cancelled" });
            } else if (result?.status === "consumed") {
                setBanner({ type: "warning", message: result.error || "Scheduled autopay already consumed" });
            } else {
                setBanner({ type: "error", message: result?.error || "Failed to cancel scheduled autopay" });
            }
            await refreshAfterChange();
        } catch (error) {
            console.error("Cancel scheduled transfer failed", error);
            setBanner({ type: "error", message: getErrorMessage(error, "Failed to cancel scheduled autopay") });
            await loadTransfers();
        } finally {
            setActionState({ txId: "", kind: "" });
        }
    };

    const handleFormRecipientChange = (value) => {
        setForm((prev) => ({ ...prev, recipient: value }));
        if (formError) setFormError("");
    };

    const activeCount = activeTransfers.length;
    const completedCount = transfers.filter((item) => item.status === "completed").length;

    return (
        <div className="space-y-8 pb-24 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-11 h-11 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[#1A1A2E] hover:shadow-md"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Autopay</p>
                        <h2 className="text-2xl md:text-4xl font-black tracking-tight text-[#1A1A2E]">Scheduled Payments</h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadTransfers}
                        type="button"
                        className="px-4 py-3 rounded-2xl bg-white border border-gray-100 font-bold text-[#1A1A2E] shadow-sm hover:shadow-md disabled:opacity-50"
                        disabled={isLoadingList}
                    >
                        {isLoadingList ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                        onClick={openCreateModal}
                        type="button"
                        disabled={!walletAddress}
                        className="px-5 py-3 rounded-2xl bg-[#FFB800] text-[#1A1A2E] font-black shadow-[0_10px_20px_-8px_rgba(255,184,0,0.55)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Autopay
                    </button>
                </div>
            </div>

            {banner && (
                <div className={`rounded-2xl border p-4 ${banner.type === "success"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : banner.type === "warning"
                        ? "bg-amber-50 border-amber-100 text-amber-800"
                        : "bg-red-50 border-red-100 text-red-800"}`}>
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold break-words">{banner.message}</p>
                        <button type="button" onClick={() => setBanner(null)} className="text-xs font-black uppercase tracking-widest opacity-70 hover:opacity-100">Close</button>
                    </div>
                </div>
            )}

            {!walletAddress ? (
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 p-8 md:p-10 shadow-sm">
                    <div className="max-w-2xl space-y-3">
                        <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">Smart account required</h3>
                        <p className="text-sm font-semibold text-gray-500 leading-relaxed">
                            Log in and deploy your smart account to create and manage scheduled USDC autopay payments.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</p>
                            <p className="text-3xl font-black text-[#1A1A2E]">{activeCount}</p>
                            <p className="text-xs font-bold text-gray-400">Pending + executing</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                            <p className="text-3xl font-black text-[#1A1A2E]">{pendingTransfers.length}</p>
                            <p className="text-xs font-bold text-gray-400">Ready to cancel or execute</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completed</p>
                            <p className="text-3xl font-black text-[#1A1A2E]">{completedCount}</p>
                            <p className="text-xs font-bold text-gray-400">Executed scheduled transfers</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">All Autopay</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status-aware scheduled payment list</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wallet</p>
                                <p className="text-xs font-mono text-gray-500">{shortAddress(walletAddress, 10, 8)}</p>
                            </div>
                        </div>

                        {isLoadingList && transfers.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center text-sm font-bold text-gray-400">
                                Loading scheduled autopay payments...
                            </div>
                        ) : listError ? (
                            <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold">
                                {listError}
                            </div>
                        ) : transfers.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-2">
                                <p className="text-base font-black text-[#1A1A2E]">No scheduled autopay payments yet</p>
                                <p className="text-sm font-semibold text-gray-400">Create one to see its schedule and status here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transfers.map((item) => {
                                    const isPending = item.status === "pending";
                                    const isBusy = actionState.txId === item.id;
                                    return (
                                        <div key={item.id} className="rounded-3xl border border-gray-100 bg-[#FAFBFD] p-4 md:p-5 space-y-4">
                                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-widest ${statusChipClass(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{shortAddress(item.id, 10, 8)}</span>
                                                    </div>
                                                    <p className="text-sm md:text-base font-black text-[#1A1A2E] break-all" title={item.recipient}>
                                                        {item.recipient}
                                                    </p>
                                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-gray-500">
                                                        <span>Amount: ${formatStroopsToUsdc(item.amount)} USDC</span>
                                                        <span>Scheduled: {formatDateTime(item.scheduledTime || item.deadline)}</span>
                                                        {item.createdAt && <span>Created: {formatDateTime(item.createdAt)}</span>}
                                                        {item.executedAt && <span>Updated: {formatDateTime(item.executedAt)}</span>}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                                    {isPending && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExecute(item.id)}
                                                            disabled={isBusy}
                                                            className="px-4 py-2 rounded-xl bg-[#1A1A2E] text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                                        >
                                                            {isBusy && actionState.kind === "execute" ? "Executing..." : "Execute"}
                                                        </button>
                                                    )}
                                                    {isPending && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancel(item.id)}
                                                            disabled={isBusy}
                                                            className="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                                        >
                                                            {isBusy && actionState.kind === "cancel" ? "Cancelling..." : "Cancel"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {(item.txHash || item.error) && (
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    {item.txHash && (
                                                        <div className="bg-white border border-gray-100 rounded-2xl p-3">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Transaction Hash</p>
                                                            <p className="text-xs font-mono text-[#1A1A2E] break-all">{item.txHash}</p>
                                                        </div>
                                                    )}
                                                    {item.error && (
                                                        <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Error</p>
                                                            <p className="text-xs font-semibold text-red-700 break-words">{item.error}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {isCreateOpen && (
                <div className="fixed inset-0 z-[110] bg-[#1A1A2E]/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/60">
                        <div className="p-5 md:p-7 border-b border-gray-100 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Create Autopay</p>
                                <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">Schedule Autopay Payment</h3>
                                <p className="text-sm font-semibold text-gray-400 mt-1">One-time scheduled USDC payment with passkey authorization.</p>
                            </div>
                            <button type="button" onClick={closeCreateModal} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500" disabled={isSubmittingCreate}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-5 md:p-7 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Recipient Address</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.recipient}
                                        onChange={(e) => handleFormRecipientChange(e.target.value)}
                                        placeholder="Enter wallet address"
                                        className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-4 pr-14 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#FFB800] focus:ring-4 focus:ring-[#FFB800]/15"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScannerError("");
                                            setScannerStatus("Preparing camera...");
                                            setIsScannerOpen(true);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-50 text-[#FFB800]"
                                        title="Scan QR"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-xs font-semibold text-gray-400">Scan Vaulton, Stellar, MetaMask, Trust Wallet, Freighter, or plain address QR codes.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Amount (USDC)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.amount}
                                        onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#FFB800] focus:ring-4 focus:ring-[#FFB800]/15"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Schedule Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduledAt}
                                        onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#FFB800] focus:ring-4 focus:ring-[#FFB800]/15"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Quick Presets</p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "+2 min", ms: 2 * 60 * 1000 },
                                        { label: "+1 day", ms: 24 * 60 * 60 * 1000 },
                                        { label: "+1 week", ms: 7 * 24 * 60 * 60 * 1000 },
                                        { label: "+1 month", ms: 30 * 24 * 60 * 60 * 1000 },
                                    ].map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => applyPreset(preset.ms)}
                                            className="px-3 py-2 rounded-xl bg-[#F8F9FB] border border-gray-200 text-xs font-black text-[#1A1A2E] hover:bg-white"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formError && (
                                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    disabled={isSubmittingCreate}
                                    className="py-3 rounded-2xl border border-gray-200 bg-white text-[#1A1A2E] font-black disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateAutopay}
                                    disabled={isSubmittingCreate || !walletAddress}
                                    className="py-3 rounded-2xl bg-[#FFB800] text-[#1A1A2E] font-black disabled:opacity-50"
                                >
                                    {isSubmittingCreate ? "Scheduling..." : "Schedule Autopay Payment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isScannerOpen && (
                <div className="fixed inset-0 z-[120] bg-[#1A1A2E]/70 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
                            <div>
                                <h4 className="text-lg font-black text-[#1A1A2E]">Scan Recipient QR</h4>
                                <p className="text-xs font-semibold text-gray-400">Detected address will prefill the autopay recipient input.</p>
                            </div>
                            <button type="button" onClick={closeScanner} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="rounded-2xl bg-black overflow-hidden aspect-square relative border border-gray-100">
                                <div id={QR_REGION_ID} className="w-full h-full" />
                                {isStartingScanner && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm font-bold">
                                        Starting camera...
                                    </div>
                                )}
                            </div>

                            {scannerStatus && <p className="text-xs font-bold text-gray-400">{scannerStatus}</p>}
                            {scannerError && <p className="text-sm font-semibold text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">{scannerError}</p>}

                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={closeScanner} className="py-3 rounded-xl border border-gray-200 font-bold text-[#1A1A2E]">
                                    Cancel
                                </button>
                                <button type="button" onClick={startScanner} disabled={isStartingScanner} className="py-3 rounded-xl bg-[#1A1A2E] text-white font-bold disabled:opacity-50">
                                    Retry Camera
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

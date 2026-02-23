"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startAuthentication } from "@simplewebauthn/browser";
import {
    backendDonate,
    getUSDCBalance,
    getTransactions,
    getNonce,
    loginChallenge,
    transferUSDC,
} from "@/services/backendservices";
import { parsePaymentRequest, shortAddress } from "@/lib/paymentRequest";

const CONTACT_COLOR_CLASSES = [
    "bg-blue-100 text-blue-600",
    "bg-purple-100 text-purple-600",
    "bg-emerald-100 text-emerald-600",
    "bg-orange-100 text-orange-600",
    "bg-amber-100 text-amber-600",
    "bg-rose-100 text-rose-600",
    "bg-cyan-100 text-cyan-600",
];
const QR_REGION_ID = "vaulton-send-qr-reader";
const STROOPS_PER_USDC_BIGINT = 10_000_000n;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hashString = (value) => {
    let hash = 0;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return hash;
};

const getContactColorClass = (address) => CONTACT_COLOR_CLASSES[hashString(address) % CONTACT_COLOR_CLASSES.length];
const getAddressInitial = (address) => (address ? String(address).slice(0, 1).toUpperCase() : "?");

const isLikelyWalletAddress = (value) => {
    const text = String(value || "").trim();
    if (!text) return false;
    return /^[GC][A-Z2-7]{20,}$/.test(text) || /^0x[a-fA-F0-9]{40}$/.test(text);
};

const createContact = (address) => ({
    id: address,
    address,
    initial: getAddressInitial(address),
    color: getContactColorClass(address),
});

const base64UrlToBytes = (b64) => {
    const base64 = String(b64).replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return new Uint8Array([...atob(padded)].map((c) => c.charCodeAt(0)));
};

const bytesToHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

const derToRs = (der) => {
    let offset = 2;
    if (der[offset++] !== 0x02) throw new Error("Invalid DER");
    let rLen = der[offset++];
    let r = der.slice(offset, offset + rLen);
    offset += rLen;
    if (r[0] === 0 && r.length > 32) r = r.slice(1);
    while (r.length < 32) r = new Uint8Array([0, ...r]);
    r = r.slice(-32);

    if (der[offset++] !== 0x02) throw new Error("Invalid DER");
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

const usdcTextToStroopsBigInt = (value) => {
    const raw = String(value || "").trim();
    if (!raw) throw new Error("Amount is required");

    const normalized = raw.startsWith(".") ? `0${raw}` : raw;
    if (!/^\d*(?:\.\d{0,7})?$/.test(normalized) || normalized === ".") {
        throw new Error("Enter a valid USDC amount");
    }

    const [wholeRaw, fracRaw = ""] = normalized.split(".");
    const whole = BigInt(wholeRaw || "0");
    const frac = BigInt((fracRaw + "0000000").slice(0, 7) || "0");
    return whole * STROOPS_PER_USDC_BIGINT + frac;
};

const formatStroopsToUsdc2 = (value) => {
    const amount = value < 0n ? -value : value;
    const whole = amount / STROOPS_PER_USDC_BIGINT;
    const frac = (amount % STROOPS_PER_USDC_BIGINT).toString().padStart(7, "0").slice(0, 2);
    return `${whole.toString()}.${frac}`;
};

const extractBalanceStroops = (payload) => {
    const direct =
        payload?.balanceInStroops ??
        payload?.balanceStroops ??
        payload?.balance_stroops ??
        payload?.stroops;
    if (direct != null) {
        const clean = String(direct).trim();
        if (/^\d+$/.test(clean)) return BigInt(clean);
    }

    const usdcValue =
        payload?.balanceInUsdc ??
        payload?.balanceUsdc ??
        payload?.balance_in_usdc ??
        payload?.usdcBalance;
    if (usdcValue != null) {
        return usdcTextToStroopsBigInt(usdcValue);
    }

    const fallback = payload?.balance;
    if (fallback != null) {
        const clean = String(fallback).trim();
        if (/^\d+$/.test(clean)) return BigInt(clean);
        return usdcTextToStroopsBigInt(clean);
    }

    throw new Error("Unable to read current wallet balance");
};

const buildTransferChallengeBase64Url = async (amountUsdc, nonce) => {
    const amountInStroops = usdcTextToStroopsBigInt(amountUsdc);
    if (amountInStroops <= 0n) {
        throw new Error("Amount must be greater than 0");
    }

    const amountBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) {
        amountBytes[i] = Number((amountInStroops >> BigInt(i * 8)) & 0xffn);
    }

    const nonceBigInt = BigInt(nonce);
    const nonceBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i += 1) {
        nonceBytes[i] = Number((nonceBigInt >> BigInt(i * 8)) & 0xffn);
    }

    const fnName = new TextEncoder().encode("transfer_usdc");
    const challengeData = new Uint8Array(fnName.length + 16 + 8);
    challengeData.set(fnName, 0);
    challengeData.set(amountBytes, fnName.length);
    challengeData.set(nonceBytes, fnName.length + 16);

    const hash = await crypto.subtle.digest("SHA-256", challengeData);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return {
        challengeBase64Url: b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
        amountInStroops: amountInStroops.toString(),
    };
};

const parseAmount = (value) => {
    const text = String(value || "").trim();
    if (!text || !/^\d*(?:\.\d{0,7})?$/.test(text) || text === ".") {
        throw new Error("Enter a valid USDC amount");
    }
    const num = Number(text);
    if (!Number.isFinite(num) || num <= 0) {
        throw new Error("Amount must be greater than 0");
    }
    return text;
};

export default function SendScreen({
    onBack,
    balance,
    user,
    prefill,
    onTransactionComplete,
    forceAnonymousMode = false,
    showRecipientSuggestions = true,
    title = "Send to",
}) {
    const [step, setStep] = useState(1);
    const [selectedContact, setSelectedContact] = useState(null);
    const [amount, setAmount] = useState("0.00");
    const [isAnonymous, setIsAnonymous] = useState(forceAnonymousMode);
    const [isWhitelisting, setIsWhitelisting] = useState(false);
    const [tipSenderName, setTipSenderName] = useState("Anonymous");
    const [tipMessage, setTipMessage] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [recentRecipients, setRecentRecipients] = useState([]);
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
    const [recipientsError, setRecipientsError] = useState("");

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const [scannerStatus, setScannerStatus] = useState("Preparing camera...");
    const [isStartingScanner, setIsStartingScanner] = useState(false);

    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [processingStatus, setProcessingStatus] = useState("");
    const [processingError, setProcessingError] = useState("");
    const [paymentReceipt, setPaymentReceipt] = useState(null);

    const scannerInstanceRef = useRef(null);
    const startScannerRef = useRef(null);
    const appliedPrefillKeyRef = useRef("");

    const anonymousMode = forceAnonymousMode || isAnonymous;
    const isTipMode = Boolean(prefill?.tipMode && prefill?.recipient);
    const effectiveShowRecipientSuggestions = showRecipientSuggestions && !isTipMode;
    const headingTitle = isTipMode
        ? `Tip ${prefill?.creatorName || "Creator"}`
        : title;
    const tipMinimumAmount = useMemo(() => {
        if (!isTipMode) return 0;
        const fromMin = Number(prefill?.tipMinAmount);
        if (Number.isFinite(fromMin) && fromMin > 0) return fromMin;
        const fromAmount = Number(prefill?.amount);
        if (Number.isFinite(fromAmount) && fromAmount > 0) return fromAmount;
        return 0;
    }, [isTipMode, prefill?.amount, prefill?.tipMinAmount]);
    const parsedSearch = useMemo(() => parsePaymentRequest(searchQuery), [searchQuery]);
    const selectedRecipientAddress = selectedContact?.address || "";
    const walletAddress = user?.smartAccountId;
    const formattedBalance = useMemo(() => {
        const value = Number(balance);
        if (!Number.isFinite(value)) return "0.00";
        return value.toFixed(2);
    }, [balance]);

    useEffect(() => {
        if (forceAnonymousMode) {
            setIsAnonymous(true);
        }
    }, [forceAnonymousMode]);

    useEffect(() => {
        if (!isTipMode) return;
        if (prefill?.defaultMessage) {
            setTipMessage(String(prefill.defaultMessage).slice(0, 200));
        }
    }, [isTipMode, prefill?.defaultMessage]);

    const filteredRecipients = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return recentRecipients;
        return recentRecipients.filter((contact) => contact.address.toLowerCase().includes(query));
    }, [recentRecipients, searchQuery]);

    const applyRecipientSelection = useCallback((address, options = {}) => {
        const trimmed = String(address || "").trim();
        if (!trimmed) return;

        const existing = recentRecipients.find((contact) => contact.address === trimmed);
        const contact = existing || createContact(trimmed);
        setSelectedContact(contact);
        setSearchQuery(trimmed);

        if (options.prefillAmount && String(options.prefillAmount).trim()) {
            setAmount(String(options.prefillAmount));
        }

        setStep(2);
    }, [recentRecipients]);

    useEffect(() => {
        if (!effectiveShowRecipientSuggestions) {
            setRecentRecipients([]);
            setRecipientsError("");
            setIsLoadingRecipients(false);
            return;
        }

        if (!walletAddress) {
            setRecentRecipients([]);
            setRecipientsError("");
            setIsLoadingRecipients(false);
            return;
        }

        let cancelled = false;
        setIsLoadingRecipients(true);
        setRecipientsError("");

        (async () => {
            try {
                const data = await getTransactions(walletAddress, 1, 100);
                const txs = Array.isArray(data?.transactions) ? data.transactions : [];
                const unique = [];
                const seen = new Set();

                for (const tx of txs) {
                    const to = tx?.to;
                    const from = tx?.from;
                    if (!to || from !== walletAddress) continue;
                    if (seen.has(to)) continue;
                    seen.add(to);
                    unique.push(createContact(to));
                }

                if (!cancelled) setRecentRecipients(unique);
            } catch (error) {
                console.error("Failed to load recipient history", error);
                if (!cancelled) {
                    setRecentRecipients([]);
                    setRecipientsError("Could not load previous recipients");
                }
            } finally {
                if (!cancelled) setIsLoadingRecipients(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [walletAddress, effectiveShowRecipientSuggestions]);

    useEffect(() => {
        if (!prefill) return;
        const prefillKey = JSON.stringify({
            recipient: prefill.recipient || "",
            amount: prefill.amount || "",
            tipMinAmount: prefill.tipMinAmount || "",
            tipMode: Boolean(prefill.tipMode),
            creatorName: prefill.creatorName || "",
        });
        if (!prefillKey || prefillKey === appliedPrefillKeyRef.current) return;
        appliedPrefillKeyRef.current = prefillKey;

        const initialAmount = prefill.amount || prefill.tipMinAmount || "";
        if (initialAmount) setAmount(String(initialAmount));
        if (prefill.recipient) applyRecipientSelection(prefill.recipient, { prefillAmount: initialAmount });
    }, [prefill, applyRecipientSelection]);

    const stopScanner = async () => {
        const instance = scannerInstanceRef.current;
        if (!instance) return;
        scannerInstanceRef.current = null;
        try {
            if (instance.isScanning) await instance.stop();
        } catch (error) {
            console.error("Failed to stop QR scanner", error);
        }
        try {
            await instance.clear();
        } catch (error) {
            console.error("Failed to clear QR scanner", error);
        }
    };

    useEffect(() => () => {
        stopScanner();
    }, []);

    const closeScanner = async () => {
        setIsScannerOpen(false);
        await stopScanner();
    };

    const handleScanResult = async (decodedText) => {
        const parsed = parsePaymentRequest(decodedText);
        if (!parsed.recipient) {
            setScannerError("QR scanned, but no wallet address was found in it.");
            return;
        }

        setScannerError("");
        setScannerStatus("QR scanned successfully");
        applyRecipientSelection(parsed.recipient, { prefillAmount: parsed.amount || "" });
        await closeScanner();
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
            const qr = new Html5Qrcode(QR_REGION_ID);
            scannerInstanceRef.current = qr;

            setScannerStatus("Starting camera...");
            await qr.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
                async (decodedText) => {
                    await handleScanResult(decodedText);
                },
                () => {}
            );
            setScannerStatus("Point your camera at a QR code");
        } catch (error) {
            console.error("QR scanner failed to start", error);
            setScannerError(error?.message || "Unable to access camera for QR scanning");
            setScannerStatus("");
        } finally {
            setIsStartingScanner(false);
        }
    };
    startScannerRef.current = startScanner;

    const openScannerModal = () => {
        setScannerError("");
        setScannerStatus("Preparing camera...");
        setIsScannerOpen(true);
    };

    useEffect(() => {
        if (!isScannerOpen) return;
        if (scannerInstanceRef.current) return;
        startScannerRef.current?.();
    }, [isScannerOpen]);

    const handleChooseTypedAddress = () => {
        const recipientFromQuery = parsedSearch.recipient || searchQuery.trim();
        if (!recipientFromQuery || !isLikelyWalletAddress(recipientFromQuery)) return;
        applyRecipientSelection(recipientFromQuery, { prefillAmount: parsedSearch.amount || "" });
    };

    const resetFlow = () => {
        setStep(1);
        setSelectedContact(null);
        setSearchQuery("");
        setAmount("0.00");
        setTipSenderName("Anonymous");
        setTipMessage(prefill?.defaultMessage ? String(prefill.defaultMessage).slice(0, 200) : "");
        setPaymentReceipt(null);
        setProcessingError("");
        setProcessingStatus("");
        setIsProcessingPayment(false);
        if (!forceAnonymousMode) setIsAnonymous(false);
        setIsWhitelisting(false);
    };

    const validateBeforeProcessing = () => {
        if (!walletAddress && !anonymousMode) {
            throw new Error("No smart account found. Please log in first.");
        }
        if (!user?.userId) {
            throw new Error("User session missing. Please log in again.");
        }
        if (!selectedRecipientAddress) {
            throw new Error("Recipient address is required");
        }
        if (!isLikelyWalletAddress(selectedRecipientAddress)) {
            throw new Error("Enter a valid recipient wallet address");
        }
        if (walletAddress && selectedRecipientAddress === walletAddress) {
            throw new Error("Recipient cannot be your own wallet address");
        }
        return parseAmount(amount);
    };

    const processAnonymousPayment = async (amountText) => {
        setProcessingStatus("Requesting passkey sign-in challenge...");
        const loginOpts = await loginChallenge();
        if (!loginOpts?.options) throw new Error("Unable to get passkey options");

        setProcessingStatus("Sign with your passkey to simulate anonymous payment...");
        await startAuthentication(loginOpts.options);

        await delay(600);
        return {
            mode: "anonymous",
            amount: amountText,
            recipient: selectedRecipientAddress,
            txHash: null,
            localId: `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            message: "Anonymous payment simulated on frontend (not recorded in transaction history)",
        };
    };

    const processStandardPayment = async (amountText) => {
        setProcessingStatus("Fetching account nonce...");
        const nonceData = await getNonce(walletAddress);
        if (nonceData?.nonce == null) {
            throw new Error("Failed to fetch nonce");
        }

        setProcessingStatus("Building transfer challenge...");
        const { challengeBase64Url, amountInStroops } = await buildTransferChallengeBase64Url(amountText, nonceData.nonce);

        setProcessingStatus("Requesting passkey authentication...");
        const loginOpts = await loginChallenge();
        if (!loginOpts?.options) {
            throw new Error("No passkey options returned from server");
        }

        const options = { ...loginOpts.options, challenge: challengeBase64Url };
        setProcessingStatus("Sign transaction with your passkey...");
        const credential = await startAuthentication(options);

        const sigBytes = base64UrlToBytes(credential.response.signature);
        const rsSignature = derToRs(sigBytes);
        const signatureHex = bytesToHex(rsSignature);

        if (isTipMode) {
            setProcessingStatus("Submitting SuperChat donation...");
            const donateRes = await backendDonate({
                childId: walletAddress,
                recipient: selectedRecipientAddress,
                amount: amountInStroops,
                signatureHex,
                authData: credential.response.authenticatorData,
                clientDataJSON: credential.response.clientDataJSON,
                userId: user.userId,
                senderName: String(tipSenderName || "Anonymous").trim() || "Anonymous",
                message: String(tipMessage || "").slice(0, 200),
            });

            if (!donateRes?.success) {
                throw new Error(donateRes?.error || `Donation failed${donateRes?.status ? ` (${donateRes.status})` : ""}`);
            }

            return {
                mode: "tip",
                amount: amountText,
                recipient: selectedRecipientAddress,
                txHash: donateRes.txHash || donateRes.hash || null,
                status: donateRes.status || "SUCCESS",
                localId: `tip_${Date.now().toString(36)}`,
                message: "SuperChat sent successfully",
            };
        }

        setProcessingStatus("Submitting transfer to Stellar...");
        const transferRes = await transferUSDC({
            childId: walletAddress,
            recipient: selectedRecipientAddress,
            amount: amountInStroops,
            signatureHex,
            authData: credential.response.authenticatorData,
            clientDataJSON: credential.response.clientDataJSON,
            userId: user.userId,
        });

        if (!transferRes?.success) {
            throw new Error(transferRes?.error || `Transfer failed${transferRes?.status ? ` (${transferRes.status})` : ""}`);
        }

        return {
            mode: "standard",
            amount: amountText,
            recipient: selectedRecipientAddress,
            txHash: transferRes.txHash || null,
            status: transferRes.status || "SUCCESS",
            localId: `tx_${Date.now().toString(36)}`,
            message: "Payment sent successfully",
        };
    };

    const assertSufficientBalance = async (amountText) => {
        if (!walletAddress) {
            throw new Error("No smart account found. Please log in first.");
        }

        const requiredStroops = usdcTextToStroopsBigInt(amountText);
        const balanceData = await getUSDCBalance(walletAddress);
        const availableStroops = extractBalanceStroops(balanceData);
        if (availableStroops < requiredStroops) {
            throw new Error(`Insufficient balance. Available $${formatStroopsToUsdc2(availableStroops)} USDC.`);
        }
    };

    const handleProcessPayment = async () => {
        setProcessingError("");
        setPaymentReceipt(null);
        setIsProcessingPayment(true);
        setProcessingStatus("Preparing payment...");
        setStep(3);

        try {
            const amountText = validateBeforeProcessing();
            if (!anonymousMode) {
                setProcessingStatus("Checking current wallet balance...");
                await assertSufficientBalance(amountText);
            }

            const receipt = anonymousMode
                ? await processAnonymousPayment(amountText)
                : await processStandardPayment(amountText);

            setPaymentReceipt(receipt);
            setProcessingStatus(
                anonymousMode
                    ? "Anonymous payment prepared"
                    : isTipMode
                        ? "SuperChat sent successfully"
                        : "Payment sent successfully"
            );
            setStep(4);

            if (!anonymousMode && onTransactionComplete) {
                await onTransactionComplete();
            }
        } catch (error) {
            console.error("Send payment failed", error);
            setProcessingError(error?.message || "Payment failed");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="space-y-2">
                            <button
                                onClick={onBack}
                                type="button"
                                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#1A1A2E] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>Home</span>
                                <span>/</span>
                                <span className="text-[#1A1A2E]">{headingTitle}</span>
                            </button>
                            <h3 className="text-2xl font-black text-[#1A1A2E]">{headingTitle}</h3>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Wallet address or scan QR"
                                className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-14 text-sm font-bold focus:shadow-xl focus:border-[#FFB800] transition-all outline-none"
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <button onClick={openScannerModal} type="button" className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-50 rounded-lg text-[#FFB800]" title="Scan QR">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </button>
                        </div>

                        {(parsedSearch.recipient || parsedSearch.amount) && (
                            <div className="bg-[#FFF8E7] border border-[#FFE2A3] rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#B7791F]">Detected Payment Request</p>
                                {parsedSearch.recipient && <p className="text-xs font-mono text-[#1A1A2E] break-all">{parsedSearch.recipient}</p>}
                                {parsedSearch.amount && <p className="text-xs font-bold text-[#1A1A2E]">Requested amount: ${parsedSearch.amount} USDC</p>}
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Source: {parsedSearch.source}</p>
                            </div>
                        )}

                        {searchQuery.trim() && isLikelyWalletAddress(parsedSearch.recipient || searchQuery.trim()) && (
                            <button onClick={handleChooseTypedAddress} type="button" className="w-full p-4 bg-[#1A1A2E] text-white rounded-2xl font-black flex items-center justify-between">
                                <span className="truncate">Use address {shortAddress(parsedSearch.recipient || searchQuery.trim(), 12, 10)}</span>
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        )}

                        {effectiveShowRecipientSuggestions ? (
                            <div className="space-y-6 text-gray-400 font-bold text-xs uppercase tracking-widest">
                                <p>Recent Recipients</p>

                                {isLoadingRecipients ? (
                                    <div className="p-6 bg-white rounded-2xl border border-gray-100 text-center text-gray-400">Loading recipients...</div>
                                ) : recipientsError ? (
                                    <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-center text-red-500 normal-case text-sm font-semibold">{recipientsError}</div>
                                ) : recentRecipients.length === 0 ? (
                                    <div className="p-6 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 normal-case text-sm font-semibold">
                                        No previous recipients yet. Send your first payment to build this list.
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                            {recentRecipients.slice(0, 6).map((contact) => (
                                                <button key={`chip-${contact.id}`} onClick={() => applyRecipientSelection(contact.address)} className="flex flex-col items-center gap-2 min-w-[90px] group">
                                                    <div className={`w-14 h-14 rounded-full ${contact.color} flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform`}>
                                                        {contact.initial}
                                                    </div>
                                                    <span className="text-[#1A1A2E] normal-case text-center leading-tight text-[11px] font-bold">{shortAddress(contact.address, 5, 4)}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <p>All Previous Recipients</p>
                                        <div className="space-y-4">
                                            {filteredRecipients.map((contact) => (
                                                <button key={contact.id} onClick={() => applyRecipientSelection(contact.address)} className="w-full flex items-center justify-between p-4 bg-white rounded-3xl hover:shadow-lg transition-all border border-gray-50 group">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className={`w-12 h-12 rounded-full ${contact.color} flex items-center justify-center text-sm font-black shrink-0`}>{contact.initial}</div>
                                                        <div className="text-left min-w-0">
                                                            <p className="text-xs font-black text-[#1A1A2E] uppercase tracking-widest">Wallet Address</p>
                                                            <p className="text-[11px] text-gray-400 font-mono truncate" title={contact.address}>{contact.address}</p>
                                                        </div>
                                                    </div>
                                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-[#FFB800] transform transition-transform group-hover:translate-x-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            ))}
                                            {filteredRecipients.length === 0 && searchQuery.trim() && (
                                                <div className="p-5 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 normal-case text-sm font-semibold">No previous recipient matches this search.</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 normal-case text-sm font-semibold">
                                Enter a wallet address manually or scan a QR code to continue.
                            </div>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-8 animate-fade-in flex flex-col h-full">
                        <div className="text-center space-y-2">
                            <p className="text-gray-400 text-sm font-bold">{isTipMode ? "Sending SuperChat to" : "Sending to"}</p>
                            <div className="flex items-center justify-center gap-3 max-w-full">
                                <div className={`w-10 h-10 rounded-full ${selectedContact?.color || "bg-gray-100 text-gray-500"} flex items-center justify-center text-xs font-black shrink-0`}>{selectedContact?.initial || "?"}</div>
                                <span className="text-lg md:text-xl font-black text-[#1A1A2E] truncate" title={selectedRecipientAddress}>{shortAddress(selectedRecipientAddress, 10, 8)}</span>
                                {!isTipMode && (
                                    <button onClick={() => setStep(1)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono break-all px-4">{selectedRecipientAddress}</p>
                            {isTipMode && prefill?.creatorName && (
                                <p className="text-xs font-semibold text-gray-500">Creator: {prefill.creatorName}</p>
                            )}
                        </div>

                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-4xl font-black text-[#FFB800]">$</span>
                                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-[220px] max-w-full bg-transparent text-center text-5xl md:text-7xl font-black tracking-tighter text-[#1A1A2E] outline-none" />
                            </div>
                            <button className="px-6 py-2 bg-gray-100 rounded-full text-sm font-bold text-[#1A1A2E] flex items-center gap-2 mx-auto">
                                USDC <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Available: ${formattedBalance} USDC</p>
                        </div>

                        <div className="flex justify-center gap-3 flex-wrap">
                            {["10", "25", "50", "100", "500"].map((val) => (
                                <button key={val} onClick={() => setAmount(val)} className="px-4 py-2 bg-[#F8F9FB] border border-gray-100 rounded-xl text-xs font-bold text-[#1A1A2E] hover:bg-white hover:shadow-md transition-all">${val}</button>
                            ))}
                        </div>

                        {isTipMode && tipMinimumAmount > 0 && Number.isFinite(Number(amount)) && Number(amount) < tipMinimumAmount && (
                            <div className="bg-[#FFF8E7] border border-[#FFE2A3] rounded-2xl p-3">
                                <p className="text-xs font-semibold text-[#7A5200]">
                                    This amount is below the minimum tip (${tipMinimumAmount.toFixed(2)}). Payment can still go through, but it won&apos;t be displayed as SuperChat.
                                </p>
                            </div>
                        )}

                        {isTipMode && (
                            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 space-y-4 shadow-sm">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Your Name</label>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        value={tipSenderName}
                                        onChange={(e) => setTipSenderName(e.target.value.slice(0, 50))}
                                        placeholder="Anonymous"
                                        className="w-full bg-[#F8F9FB] border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold text-[#1A1A2E] outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Message</label>
                                    <textarea
                                        rows={3}
                                        maxLength={200}
                                        value={tipMessage}
                                        onChange={(e) => setTipMessage(e.target.value.slice(0, 200))}
                                        placeholder="Write your SuperChat message..."
                                        className="w-full bg-[#F8F9FB] border border-gray-100 rounded-xl py-3 px-4 text-sm font-semibold text-[#1A1A2E] outline-none resize-none"
                                    />
                                    <p className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tipMessage.length}/200</p>
                                </div>
                            </div>
                        )}

                        {!forceAnonymousMode && !isTipMode && (
                            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${isAnonymous ? "bg-[#FFB800] text-[#1A1A2E]" : "bg-gray-100 text-gray-400"}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#1A1A2E]">Anonymous Send</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Frontend simulation (no history recorded)</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsAnonymous((prev) => !prev)} className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isAnonymous ? "bg-[#FFB800]" : "bg-gray-200"}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isAnonymous ? "left-7" : "left-1"}`} />
                                    </button>
                                </div>

                                {isAnonymous && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-4 border-t border-gray-50 bg-[#FFB800]/5 -mx-6 -mb-6 p-6 rounded-b-[2.5rem] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-[#1A1A2E] uppercase">Whitelisted Address required</span>
                                            <button onClick={() => setIsWhitelisting((prev) => !prev)} className="text-[10px] font-black text-[#FFB800] uppercase hover:underline">
                                                {isWhitelisting ? "- Remove from whitelist" : "+ Add to whitelist"}
                                            </button>
                                        </div>
                                        <div className="bg-white/80 p-3 rounded-xl border border-[#FFB800]/20 flex items-center gap-3">
                                            <svg className="w-4 h-4 text-[#FFB800]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            <p className="text-[9px] font-bold text-gray-500 italic">Anonymous mode is simulated on frontend for now. No transaction will be recorded in history.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {forceAnonymousMode && (
                            <div className="bg-[#FFF8E7] p-4 rounded-2xl border border-[#FFE2A3] text-sm font-semibold text-[#7A5200]">
                                Anonymous pay is frontend-simulated for now. You will still sign with your passkey, but no transfer API is called and no history is recorded.
                            </div>
                        )}

                        <div className="mt-auto grid grid-cols-2 gap-4">
                            <button onClick={() => (isTipMode ? onBack() : setStep(1))} className="py-5 bg-white border border-gray-100 rounded-3xl font-black text-[#1A1A2E] shadow-sm hover:shadow-lg transition-all">Back</button>
                            <button onClick={handleProcessPayment} className="py-5 bg-[#FFB800] rounded-3xl font-black text-[#1A1A2E] shadow-[0_10px_20px_-5px_rgba(255,184,0,0.4)] hover:scale-105 transition-all">
                                {anonymousMode ? "Sign Anonymous Payment" : isTipMode ? "Send SuperChat" : "Sign & Send"}
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-10 animate-fade-in text-center flex flex-col justify-center min-h-[420px]">
                        <div className="relative mx-auto">
                            <div className="absolute inset-0 bg-[#FFB800] rounded-full blur-3xl opacity-20 animate-pulse"></div>
                            <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-gray-50">
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                                    <svg className="w-16 h-16 text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0112 3c1.268 0 2.49.234 3.62.661m1.156 5.05a10.05 10.05 0 011.66 2.043m-9.043 9.14a10.05 10.05 0 01-1.66-2.043m9.043-9.14A10.003 10.003 0 0112 21c-1.268 0-2.49-.234-3.62-.661m-1.156-5.05a10.05 10.05 0 01-1.66-2.043" /></svg>
                                </motion.div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-[#1A1A2E]">{isProcessingPayment ? "Authenticating" : processingError ? "Payment Failed" : "Processing"}</h3>
                            <p className="text-gray-400 font-bold max-w-md mx-auto">{processingError || processingStatus || "Verify with your biometrics to complete the transaction."}</p>
                        </div>

                        {isProcessingPayment ? (
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-10 h-10 border-4 border-[#FFB800]/20 border-t-[#FFB800] rounded-full animate-spin"></div>
                            </div>
                        ) : processingError ? (
                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
                                <button onClick={() => setStep(2)} className="py-4 bg-white border border-gray-100 rounded-2xl font-black text-[#1A1A2E]">Back</button>
                                <button onClick={handleProcessPayment} className="py-4 bg-[#1A1A2E] text-white rounded-2xl font-black">Retry</button>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <button onClick={() => setStep(4)} className="px-6 py-3 bg-[#1A1A2E] text-white rounded-2xl font-black">Continue</button>
                            </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-10 animate-fade-in text-center flex flex-col items-center py-8">
                        <div className="w-24 h-24 bg-[#10B981]/10 text-[#10B981] rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </motion.div>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(16,185,129,0.1)_100%)]"></div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-4xl font-black text-[#1A1A2E]">
                                {anonymousMode ? "Anonymous Payment Prepared" : isTipMode ? "SuperChat Sent!" : "Payment Sent!"}
                            </h3>
                            <p className="text-gray-400 font-bold leading-relaxed text-lg px-2 break-all">
                                <span className="text-[#1A1A2E]">${paymentReceipt?.amount || amount}</span> {anonymousMode ? "prepared for" : isTipMode ? "sent as tip to" : "sent to"} <span className="text-[#1A1A2E]">{shortAddress(paymentReceipt?.recipient || selectedRecipientAddress, 10, 8)}</span>
                            </p>
                        </div>

                        <div className="w-full bg-[#F8F9FB] border border-gray-100 p-6 rounded-[2.5rem] space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{anonymousMode ? "Request ID" : "Transaction ID"}</p>
                                <p className="text-xs font-mono text-[#1A1A2E] p-3 bg-white rounded-xl border border-gray-50 text-center break-all">{paymentReceipt?.txHash || paymentReceipt?.localId || `txn_vlt_${Date.now().toString(36)}`}</p>
                            </div>
                            <div className={`flex items-center justify-center gap-2 ${anonymousMode ? "text-amber-600" : "text-[#10B981]"}`}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                <span className="text-[10px] font-black uppercase tracking-widest">{anonymousMode ? "Frontend simulated only • no history recorded" : "Confirmed request submitted to backend"}</span>
                            </div>
                            {paymentReceipt?.message && <p className="text-xs font-semibold text-gray-500 text-center">{paymentReceipt.message}</p>}
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4">
                            <button onClick={resetFlow} className="py-5 bg-white border border-gray-100 rounded-3xl font-black text-[#1A1A2E] shadow-sm hover:shadow-lg transition-all">Send Another</button>
                            <button onClick={onBack} className="py-5 bg-[#1A1A2E] rounded-3xl font-black text-white shadow-xl hover:scale-105 transition-all">Done</button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full pb-24 relative">
            {step < 3 && (
                <div className="flex justify-center gap-4 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] transition-all duration-500 shadow-md ${s === step ? "bg-[#FFB800] text-[#1A1A2E] scale-110" : s < step ? "bg-[#1A1A2E] text-white" : "bg-white text-gray-300 border border-gray-100"}`}>
                                {s}
                            </div>
                            {s < 3 && <div className={`w-12 h-0.5 mx-2 rounded-full transition-all duration-500 ${s < step ? "bg-[#FFB800]" : "bg-gray-200"}`} />}
                        </div>
                    ))}
                </div>
            )}
            {renderStep()}

            <AnimatePresence>
                {isScannerOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-[#1A1A2E]/70 backdrop-blur-sm p-4 flex items-center justify-center">
                        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="text-lg font-black text-[#1A1A2E]">Scan Wallet QR</h4>
                                    <p className="text-xs font-semibold text-gray-400">Supports Vaulton links, Stellar URIs, and plain wallet addresses</p>
                                </div>
                                <button onClick={closeScanner} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="rounded-2xl bg-black overflow-hidden aspect-square relative border border-gray-100">
                                    <div id={QR_REGION_ID} className="w-full h-full" />
                                    {isStartingScanner && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm font-bold">Starting camera...</div>}
                                </div>

                                {scannerStatus && <p className="text-xs font-bold text-gray-400">{scannerStatus}</p>}
                                {scannerError && <p className="text-sm font-semibold text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">{scannerError}</p>}

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={closeScanner} className="py-3 rounded-xl border border-gray-200 font-bold text-[#1A1A2E]">Cancel</button>
                                    <button onClick={startScanner} className="py-3 rounded-xl bg-[#1A1A2E] text-white font-bold" disabled={isStartingScanner}>Retry Camera</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

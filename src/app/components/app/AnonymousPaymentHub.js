"use client";

import { useCallback, useEffect, useState } from "react";
import {
    zkGetPoolBalance,
    zkGetUserInfo,
    zkPrepareDeposit,
    zkPrepareWithdrawal,
    zkSubmitDeposit,
    zkSubmitWithdrawal,
} from "@/services/backendservices";

const CURVE_ORDER = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
const HALF_CURVE_ORDER = CURVE_ORDER >> 1n;
const STROOPS_PER_USDC = 10_000_000n;

const STATUS_STYLE = {
    info: "bg-blue-50 border-blue-100 text-blue-700",
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
    error: "bg-red-50 border-red-100 text-red-700",
};

const getErrorMessage = (error, fallback) => {
    const apiError = error?.response?.data?.error;
    if (apiError) return String(apiError);
    if (error?.message) return String(error.message);
    return fallback;
};

const usdcToStroopsString = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;

    const normalized = raw.startsWith(".") ? `0${raw}` : raw;
    if (!/^\d*(?:\.\d{0,7})?$/.test(normalized) || normalized === ".") return null;

    const [wholeRaw, fractionRaw = ""] = normalized.split(".");
    const whole = BigInt(wholeRaw || "0");
    const fraction = BigInt((fractionRaw + "0000000").slice(0, 7) || "0");
    const stroops = whole * STROOPS_PER_USDC + fraction;
    if (stroops <= 0n) return null;
    return stroops.toString();
};

const formatUsdc = (stroopsValue) => {
    try {
        const stroops = BigInt(String(stroopsValue || "0"));
        const whole = stroops / STROOPS_PER_USDC;
        const frac2 = ((stroops % STROOPS_PER_USDC) / 100_000n).toString().padStart(2, "0");
        return `${whole.toString()}.${frac2}`;
    } catch (_) {
        return "0.00";
    }
};

const uint8ToHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hexToUint8 = (hex) => {
    const clean = String(hex || "").trim();
    if (!clean || clean.length % 2 !== 0 || /[^a-f0-9]/i.test(clean)) {
        throw new Error("Invalid challenge format");
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
        out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }
    return out;
};

const uint8ToBase64Url = (bytes) => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlToUint8 = (b64url) => {
    const base64 = String(b64url || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return new Uint8Array([...atob(padded)].map((char) => char.charCodeAt(0)));
};

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

    const sBig = BigInt(`0x${uint8ToHex(s)}`);
    if (sBig > HALF_CURVE_ORDER) {
        const lowS = CURVE_ORDER - sBig;
        s = hexToUint8(lowS.toString(16).padStart(64, "0"));
    }

    const rs = new Uint8Array(64);
    rs.set(r, 0);
    rs.set(s, 32);
    return rs;
};

function StatusMessage({ status }) {
    if (!status?.message) return null;
    const toneClass = STATUS_STYLE[status.type] || STATUS_STYLE.info;
    return (
        <div className={`mt-3 rounded-2xl border px-4 py-3 text-xs font-semibold whitespace-pre-wrap ${toneClass}`}>
            {status.message}
        </div>
    );
}

export default function AnonymousPaymentHub({ onBack, user }) {
    const userId = String(user?.userId || "").trim();
    const [credentialId, setCredentialId] = useState("");
    const [zkSmartAccountId, setZkSmartAccountId] = useState("");

    const [poolBalance, setPoolBalance] = useState("0");
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawRecipient, setWithdrawRecipient] = useState("");

    const [infoStatus, setInfoStatus] = useState(null);
    const [balanceStatus, setBalanceStatus] = useState(null);
    const [depositStatus, setDepositStatus] = useState(null);
    const [withdrawStatus, setWithdrawStatus] = useState(null);

    const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const loadUserState = useCallback(async () => {
        if (!userId) return;

        try {
            const savedSession = window.localStorage.getItem("passkeySmartAccount");
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                if (parsed?.currentUser === userId && parsed?.credentialId) {
                    setCredentialId(String(parsed.credentialId));
                }
            }
        } catch (_) {
            // Ignore malformed local storage.
        }

        try {
            const info = await zkGetUserInfo(userId);
            const nextAddress = String(info?.zkSmartAccountId || "").trim();
            setZkSmartAccountId(nextAddress);
            if (!nextAddress) {
                setInfoStatus({
                    type: "error",
                    message: "Anonymous account setup is not available for this user yet. Please create a new smart account to auto-enable it.",
                });
            } else {
                setInfoStatus(null);
            }
        } catch (error) {
            setInfoStatus({
                type: "error",
                message: getErrorMessage(error, "Could not load anonymous account status"),
            });
        }
    }, [userId]);

    const refreshPoolBalance = useCallback(async (silent = false) => {
        if (!userId) return;
        if (!silent) {
            setIsRefreshingBalance(true);
            setBalanceStatus({ type: "info", message: "Refreshing private balance..." });
        }

        try {
            const data = await zkGetPoolBalance(userId);
            setPoolBalance(String(data?.balance || "0"));
            if (!silent) {
                setBalanceStatus({
                    type: "success",
                    message: "Private balance updated.",
                });
            }
        } catch (error) {
            if (!silent) {
                setBalanceStatus({
                    type: "error",
                    message: getErrorMessage(error, "Could not refresh private balance"),
                });
            }
        } finally {
            if (!silent) setIsRefreshingBalance(false);
        }
    }, [userId]);

    const signWithPasskey = useCallback(async (challengeHex) => {
        if (!challengeHex) throw new Error("Missing passkey challenge");
        const challengeBytes = hexToUint8(challengeHex);
        const options = {
            challenge: challengeBytes.buffer,
            rpId: window.location.hostname,
            userVerification: "required",
            timeout: 60_000,
        };

        if (credentialId) {
            const credentialBytes = base64UrlToUint8(credentialId);
            options.allowCredentials = [
                {
                    id: credentialBytes.buffer,
                    type: "public-key",
                    transports: ["internal", "hybrid"],
                },
            ];
        }

        const assertion = await navigator.credentials.get({ publicKey: options });
        if (!assertion?.response) throw new Error("Passkey confirmation was cancelled");

        const derSig = new Uint8Array(assertion.response.signature);
        const rsSig = derToRs(derSig);

        return {
            signatureHex: uint8ToHex(rsSig),
            authenticatorData: uint8ToBase64Url(new Uint8Array(assertion.response.authenticatorData)),
            clientDataJSON: uint8ToBase64Url(new Uint8Array(assertion.response.clientDataJSON)),
        };
    }, [credentialId]);

    useEffect(() => {
        if (!userId) return;
        loadUserState();
        refreshPoolBalance(true);
    }, [loadUserState, refreshPoolBalance, userId]);

    const handleDeposit = async () => {
        const amount = usdcToStroopsString(depositAmount);
        if (!amount) {
            setDepositStatus({ type: "error", message: "Enter a valid USDC amount." });
            return;
        }
        if (!userId || !zkSmartAccountId) {
            setDepositStatus({ type: "error", message: "Anonymous account is not ready." });
            return;
        }

        setIsDepositing(true);
        setDepositStatus({ type: "info", message: "Preparing private deposit..." });

        try {
            const prepData = await zkPrepareDeposit({
                childAddress: zkSmartAccountId,
                amount,
                userId,
            });

            setDepositStatus({ type: "info", message: "Confirm with passkey..." });
            const signature = await signWithPasskey(prepData?.signaturePayload);

            const submitData = await zkSubmitDeposit({
                childAddress: String(prepData?.childAddress || zkSmartAccountId),
                userId,
                proofXdr: prepData?.proofXdr,
                extDataXdr: prepData?.extDataXdr,
                signatureHex: signature.signatureHex,
                authenticatorData: signature.authenticatorData,
                clientDataJSON: signature.clientDataJSON,
                prepareData: prepData,
                noteData: prepData?.noteData,
                allOutputCommitmentHexes: prepData?.allOutputCommitmentHexes,
            });

            if (!submitData?.success) {
                throw new Error(submitData?.errorDetails || submitData?.status || "Private deposit failed");
            }

            setDepositStatus({ type: "success", message: "Deposit completed successfully." });
            setDepositAmount("");
            await refreshPoolBalance(true);
        } catch (error) {
            setDepositStatus({
                type: "error",
                message: getErrorMessage(error, "Private deposit failed"),
            });
        } finally {
            setIsDepositing(false);
        }
    };

    const handleWithdraw = async () => {
        const amount = usdcToStroopsString(withdrawAmount);
        const recipient = String(withdrawRecipient || "").trim();
        if (!recipient) {
            setWithdrawStatus({ type: "error", message: "Enter recipient wallet address." });
            return;
        }
        if (!amount) {
            setWithdrawStatus({ type: "error", message: "Enter a valid USDC amount." });
            return;
        }
        if (!userId || !zkSmartAccountId) {
            setWithdrawStatus({ type: "error", message: "Anonymous account is not ready." });
            return;
        }

        setIsWithdrawing(true);
        setWithdrawStatus({ type: "info", message: "Preparing private withdrawal..." });

        try {
            const prepData = await zkPrepareWithdrawal({
                userId,
                amount,
                recipient,
            });

            setWithdrawStatus({ type: "info", message: "Confirm with passkey..." });
            const signature = await signWithPasskey(prepData?.signaturePayload);

            const submitData = await zkSubmitWithdrawal({
                childAddress: String(prepData?.childAddress || zkSmartAccountId),
                userId,
                proofXdr: prepData?.proofXdr,
                extDataXdr: prepData?.extDataXdr,
                signatureHex: signature.signatureHex,
                authenticatorData: signature.authenticatorData,
                clientDataJSON: signature.clientDataJSON,
                prepareData: prepData,
                spentNoteCommitmentHex: prepData?.spentNoteCommitmentHex,
                spentNoteCommitmentHexes: prepData?.spentNoteCommitmentHexes,
                inputNullifier0Hex: prepData?.inputNullifier0Hex,
                inputNullifierHexes: prepData?.inputNullifierHexes,
                changeNoteData: prepData?.changeNoteData,
                allOutputCommitmentHexes: prepData?.allOutputCommitmentHexes,
            });

            if (!submitData?.success) {
                throw new Error(submitData?.errorDetails || submitData?.status || "Private withdrawal failed");
            }

            setWithdrawStatus({ type: "success", message: "Withdrawal completed successfully." });
            setWithdrawAmount("");
            setWithdrawRecipient("");
            await refreshPoolBalance(true);
        } catch (error) {
            setWithdrawStatus({
                type: "error",
                message: getErrorMessage(error, "Private withdrawal failed"),
            });
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (!userId) {
        return (
            <div className="space-y-4 animate-fade-in">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#1A1A2E] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Add-ons</span>
                </button>
                <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
                    Login is required to use anonymous payments.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#1A1A2E] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Add-ons</span>
                    <span>/</span>
                    <span className="text-[#1A1A2E]">Anonymous Pay</span>
                </button>
                <h3 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">Anonymous Payments</h3>
                <p className="text-sm font-semibold text-gray-500">
                    Simple private deposit and withdrawal.
                </p>
            </div>

            <section className="bg-white border border-gray-100 rounded-[2rem] p-5 md:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Private Balance</p>
                        <p className="text-3xl font-black text-[#1A1A2E]">
                            ${formatUsdc(poolBalance)} <span className="text-sm text-gray-400 font-bold">USDC</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refreshPoolBalance(false)}
                        disabled={isRefreshingBalance}
                        className="rounded-xl px-4 py-2 text-xs font-black bg-[#F8F9FB] border border-gray-100 text-[#1A1A2E] hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isRefreshingBalance ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
                <StatusMessage status={infoStatus} />
                <StatusMessage status={balanceStatus} />
            </section>

            <section className="bg-white border border-gray-100 rounded-[2rem] p-5 md:p-6 shadow-sm space-y-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Deposit</p>
                    <h4 className="text-lg font-black text-[#1A1A2E]">Add funds privately</h4>
                </div>
                <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount (USDC)</span>
                    <input
                        type="number"
                        min="0"
                        step="0.0000001"
                        inputMode="decimal"
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(event.target.value)}
                        placeholder="e.g. 1 or 2.5"
                        className="w-full rounded-2xl border border-gray-100 bg-[#F8F9FB] px-4 py-3 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#FFB800]"
                    />
                </label>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Converted automatically to stroops (1 USDC = 10,000,000 stroops)
                </p>
                <button
                    type="button"
                    onClick={handleDeposit}
                    disabled={isDepositing || !zkSmartAccountId}
                    className="w-full rounded-2xl py-3 px-4 font-black text-sm bg-[#1A1A2E] text-white hover:bg-[#2d2d48] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                    {isDepositing ? "Depositing..." : "Deposit"}
                </button>
                <StatusMessage status={depositStatus} />
            </section>

            <section className="bg-white border border-gray-100 rounded-[2rem] p-5 md:p-6 shadow-sm space-y-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Withdrawal</p>
                    <h4 className="text-lg font-black text-[#1A1A2E]">Withdraw privately</h4>
                </div>
                <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recipient wallet</span>
                    <input
                        type="text"
                        value={withdrawRecipient}
                        onChange={(event) => setWithdrawRecipient(event.target.value)}
                        placeholder="G... or C..."
                        className="w-full rounded-2xl border border-gray-100 bg-[#F8F9FB] px-4 py-3 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#FFB800]"
                    />
                </label>
                <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount (USDC)</span>
                    <input
                        type="number"
                        min="0"
                        step="0.0000001"
                        inputMode="decimal"
                        value={withdrawAmount}
                        onChange={(event) => setWithdrawAmount(event.target.value)}
                        placeholder="e.g. 0.5"
                        className="w-full rounded-2xl border border-gray-100 bg-[#F8F9FB] px-4 py-3 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#FFB800]"
                    />
                </label>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Converted automatically to stroops (1 USDC = 10,000,000 stroops)
                </p>
                <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || !zkSmartAccountId}
                    className="w-full rounded-2xl py-3 px-4 font-black text-sm bg-[#FFB800] text-[#1A1A2E] hover:bg-[#f0ac00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                    {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                </button>
                <StatusMessage status={withdrawStatus} />
            </section>
        </div>
    );
}

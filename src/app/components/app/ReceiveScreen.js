"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { buildVaultonSendLink, shortAddress } from "@/lib/paymentRequest";

const sanitizeAmountInput = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    if (!/^\d*(?:\.\d{0,7})?$/.test(text)) return text;
    return text;
};

export default function ReceiveScreen({ onBack, user }) {
    const [amount, setAmount] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [copyState, setCopyState] = useState("");

    const walletAddress = user?.smartAccountId || "";

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const vaultonLink = useMemo(() => {
        if (!walletAddress || !origin) return "";
        return buildVaultonSendLink({ origin, recipient: walletAddress, amount });
    }, [walletAddress, origin, amount]);

    useEffect(() => {
        let cancelled = false;

        if (!vaultonLink) {
            setQrDataUrl("");
            return;
        }

        (async () => {
            try {
                const qrcode = await import("qrcode");
                const dataUrl = await qrcode.toDataURL(vaultonLink, {
                    errorCorrectionLevel: "M",
                    margin: 1,
                    width: 320,
                    color: {
                        dark: "#111827",
                        light: "#FFFFFF",
                    },
                });
                if (!cancelled) {
                    setQrDataUrl(dataUrl);
                }
            } catch (error) {
                console.error("Failed to generate QR", error);
                if (!cancelled) {
                    setQrDataUrl("");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [vaultonLink]);

    const handleCopy = async (value, key) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopyState(key);
            setTimeout(() => setCopyState(""), 1500);
        } catch (error) {
            console.error("Copy failed", error);
        }
    };

    return (
        <div className="space-y-5 md:space-y-6 animate-fade-in pb-24">
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
                    <span className="text-[#1A1A2E]">Receive</span>
                </button>
                <div className="space-y-1">
                    <h3 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">Receive Payment</h3>
                    <p className="text-gray-400 font-bold text-xs md:text-sm tracking-tight">Generate a Vaulton payment request QR or shareable link</p>
                </div>
            </div>

            {!walletAddress ? (
                <div className="bg-white p-8 rounded-[2rem] border border-dashed border-gray-200 text-center space-y-2">
                    <p className="text-lg font-black text-[#1A1A2E]">No wallet address available</p>
                    <p className="text-sm text-gray-500 font-semibold">Log in and deploy a smart account to generate a payment request QR.</p>
                </div>
            ) : (
                <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-lg space-y-5 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100/60 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-100/70 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receive To</p>
                            <p className="text-sm md:text-base font-black text-[#1A1A2E] mt-1 truncate" title={walletAddress}>{shortAddress(walletAddress, 12, 10)}</p>
                        </div>
                        <button
                            onClick={() => handleCopy(walletAddress, "address")}
                            aria-label={copyState === "address" ? "Address copied" : "Copy address"}
                            title={copyState === "address" ? "Copied" : "Copy address"}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 ${copyState === "address" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-gray-100 text-[#1A1A2E]"}`}
                        >
                            {copyState === "address" ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="mx-auto w-full max-w-[280px] md:max-w-[320px] rounded-[1.5rem] bg-[#F8F9FB] p-3 border border-gray-100 shadow-inner">
                            <div className="relative rounded-[1.2rem] bg-white p-3 shadow-sm border border-gray-100">
                                <div className="relative aspect-square rounded-xl bg-white flex items-center justify-center overflow-hidden">
                                    {qrDataUrl ? (
                                        <Image src={qrDataUrl} alt="Vaulton payment request QR" width={320} height={320} unoptimized className="w-full h-full object-contain rounded-xl" />
                                    ) : (
                                        <div className="text-center text-sm font-semibold text-gray-400 px-6">Generating QR...</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Link</p>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(vaultonLink, "link")}
                                    aria-label={copyState === "link" ? "Payment link copied" : "Copy payment link"}
                                    title={copyState === "link" ? "Copied" : "Copy payment link"}
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shrink-0 ${copyState === "link" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-gray-100 text-[#1A1A2E]"}`}
                                >
                                    {copyState === "link" ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <div className="p-4 bg-[#F8F9FB] rounded-xl border border-gray-100 font-mono text-xs text-[#1A1A2E] break-all leading-relaxed">
                                {vaultonLink}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 bg-[#F8F9FB] p-4 rounded-[1.5rem] border border-gray-100 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Request Amount (Optional)</p>
                                <p className="text-xs font-semibold text-gray-400 mt-1">Set an amount to prefill Send.</p>
                            </div>
                            <button
                                onClick={() => setAmount("")}
                                type="button"
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:text-[#1A1A2E]"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
                            <span className="text-xl font-black text-[#FFB800]">$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                                className="flex-1 text-2xl font-black text-[#1A1A2E] outline-none bg-transparent placeholder:text-gray-300 min-w-0"
                            />
                            <div className="px-3 py-1.5 bg-[#F8F9FB] rounded-full text-[11px] font-black text-[#1A1A2E] border border-gray-100">USDC</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

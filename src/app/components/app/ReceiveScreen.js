"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { buildStellarPayUri, buildVaultonSendLink, shortAddress } from "@/lib/paymentRequest";

const sanitizeAmountInput = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    if (!/^\d*(?:\.\d{0,7})?$/.test(text)) return text;
    return text;
};

export default function ReceiveScreen({ onBack, user }) {
    const [tab, setTab] = useState("qr");
    const [amount, setAmount] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [copyState, setCopyState] = useState("");

    const walletAddress = user?.smartAccountId || "";

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const vaultonLink = useMemo(() => {
        if (!walletAddress || !origin) return "";
        return buildVaultonSendLink({ origin, recipient: walletAddress, amount });
    }, [walletAddress, origin, amount]);

    const stellarUri = useMemo(() => {
        if (!walletAddress) return "";
        return buildStellarPayUri({ recipient: walletAddress, amount });
    }, [walletAddress, amount]);

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

    const handleShare = async () => {
        if (!vaultonLink) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Vaulton Payment Request",
                    text: amount ? `Send ${amount} USDC via Vaulton` : "Send USDC via Vaulton",
                    url: vaultonLink,
                });
                return;
            } catch (error) {
                if (error?.name !== "AbortError") {
                    console.error("Share failed", error);
                }
            }
        }

        await handleCopy(vaultonLink, "link");
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black text-[#1A1A2E]">Receive Payment</h3>
                    <p className="text-gray-400 font-bold text-sm tracking-tight">Generate a Vaulton payment request QR or shareable link</p>
                </div>
                <button onClick={onBack} className="text-gray-400 font-bold hover:text-[#1A1A2E] shrink-0">Back</button>
            </div>

            <div className="bg-white p-3 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex p-2 bg-gray-100 rounded-[1.25rem] gap-2">
                    <button
                        onClick={() => setTab("qr")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all duration-300 ${tab === "qr" ? "bg-white text-[#1A1A2E] shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01" />
                        </svg>
                        QR Code
                    </button>
                    <button
                        onClick={() => setTab("link")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all duration-300 ${tab === "link" ? "bg-white text-[#1A1A2E] shadow-md" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 11-5.656 5.656l-1.102-1.101" />
                        </svg>
                        Payment Link
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Request Amount (Optional)</p>
                        <p className="text-xs font-semibold text-gray-400 mt-1">When set, Vaulton QR/link opens Send with a prefilled amount.</p>
                    </div>
                    <button
                        onClick={() => setAmount("")}
                        type="button"
                        className="px-3 py-2 rounded-xl border border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:text-[#1A1A2E]"
                    >
                        Clear
                    </button>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-[#F8F9FB] px-4 py-3">
                    <span className="text-2xl font-black text-[#FFB800]">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                        className="flex-1 text-3xl font-black text-[#1A1A2E] outline-none bg-transparent placeholder:text-gray-300"
                    />
                    <div className="px-4 py-2 bg-white rounded-full text-xs font-black text-[#1A1A2E] border border-gray-100 shadow-sm">USDC</div>
                </div>
            </div>

            {!walletAddress ? (
                <div className="bg-white p-10 rounded-[3rem] border border-dashed border-gray-200 text-center space-y-3">
                    <p className="text-xl font-black text-[#1A1A2E]">No wallet address available</p>
                    <p className="text-sm text-gray-500 font-semibold">Log in and deploy a smart account to generate a payment request QR.</p>
                </div>
            ) : (
                <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-gray-100 shadow-xl space-y-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-100/60 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-100/70 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receive To</p>
                            <p className="text-sm md:text-base font-black text-[#1A1A2E] mt-1" title={walletAddress}>{shortAddress(walletAddress, 12, 10)}</p>
                        </div>
                        <button
                            onClick={() => handleCopy(walletAddress, "address")}
                            className="px-4 py-2 rounded-xl border border-gray-100 bg-white text-[11px] font-black uppercase tracking-widest text-[#1A1A2E] shadow-sm"
                        >
                            {copyState === "address" ? "Copied" : "Copy Address"}
                        </button>
                    </div>

                    {tab === "qr" ? (
                        <div className="relative z-10 grid lg:grid-cols-[1fr_1.1fr] gap-6 items-center">
                            <div className="mx-auto w-full max-w-[320px] rounded-[2rem] bg-[#F8F9FB] p-4 border border-gray-100 shadow-inner">
                                <div className="relative rounded-[1.5rem] bg-white p-4 shadow-sm border border-gray-100">
                                    <div className="absolute inset-3 pointer-events-none border-2 border-dashed border-gray-100 rounded-[1.2rem]"></div>
                                    <div className="relative aspect-square rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                                        {qrDataUrl ? (
                                            <Image src={qrDataUrl} alt="Vaulton payment request QR" width={320} height={320} unoptimized className="w-full h-full object-contain rounded-xl" />
                                        ) : (
                                            <div className="text-center text-sm font-semibold text-gray-400 px-6">Generating QR...</div>
                                        )}
                                    </div>
                                    <div className="absolute top-2 left-2 w-5 h-5 border-l-2 border-t-2 border-[#FFB800] rounded-tl-xl"></div>
                                    <div className="absolute top-2 right-2 w-5 h-5 border-r-2 border-t-2 border-[#FFB800] rounded-tr-xl"></div>
                                    <div className="absolute bottom-2 left-2 w-5 h-5 border-l-2 border-b-2 border-[#FFB800] rounded-bl-xl"></div>
                                    <div className="absolute bottom-2 right-2 w-5 h-5 border-r-2 border-b-2 border-[#FFB800] rounded-br-xl"></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">What this QR does</p>
                                    <p className="text-sm font-semibold text-[#1A1A2E] leading-relaxed">
                                        Opens Vaulton Send with your wallet address prefilled{amount ? ` and ${amount} USDC requested` : ""}. It can also be scanned by this app from another device.
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Wallet URI (Fallback)</p>
                                    <p className="font-mono text-xs text-[#1A1A2E] break-all">{stellarUri}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleCopy(vaultonLink, "link")} className="py-3 rounded-xl border border-gray-100 bg-white font-black text-sm text-[#1A1A2E] shadow-sm">
                                        {copyState === "link" ? "Copied Link" : "Copy Link"}
                                    </button>
                                    <button onClick={handleShare} className="py-3 rounded-xl bg-[#FFB800] font-black text-sm text-[#1A1A2E] shadow-[0_10px_20px_-10px_rgba(255,184,0,0.5)]">
                                        Share Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 space-y-5">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vaulton Payment Request Link</p>
                                <div className="p-5 bg-[#F8F9FB] rounded-2xl border border-gray-100 font-mono text-xs text-[#1A1A2E] break-all leading-relaxed">
                                    {vaultonLink}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stellar URI (Wallet Fallback)</p>
                                <div className="p-5 bg-white rounded-2xl border border-gray-100 font-mono text-xs text-[#1A1A2E] break-all leading-relaxed">
                                    {stellarUri}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-3">
                                <button onClick={() => handleCopy(vaultonLink, "link")} className="w-full py-4 bg-[#1A1A2E] text-white rounded-2xl font-black text-sm">{copyState === "link" ? "Copied" : "Copy Vaulton Link"}</button>
                                <button onClick={() => handleCopy(stellarUri, "stellar")} className="w-full py-4 border border-gray-100 bg-white rounded-2xl font-black text-sm text-[#1A1A2E]">{copyState === "stellar" ? "Copied" : "Copy Stellar URI"}</button>
                                <button onClick={handleShare} className="w-full py-4 bg-[#FFB800] rounded-2xl font-black text-sm text-[#1A1A2E]">Share Request</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-[#1A1A2E] p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                        <p className="text-[#FFB800] text-[10px] font-black uppercase tracking-widest">Your Stellar Address</p>
                        <p className="text-white text-xs md:text-sm font-mono group-hover:text-[#FFB800] transition-colors tracking-tight break-all">{walletAddress || "No smart account deployed"}</p>
                    </div>
                    {walletAddress && (
                        <button onClick={() => handleCopy(walletAddress, "address")} className="p-3 bg-white/5 rounded-xl hover:bg-[#FFB800] hover:text-[#1A1A2E] text-white transition-all shadow-sm shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs font-semibold text-gray-300 leading-relaxed">
                        Tip: Share the Vaulton link/QR for the best experience (opens Send with prefilled details). The Stellar URI is included as a fallback for wallet apps that support `stellar:pay`.
                    </p>
                </div>
            </div>
        </div>
    );
}

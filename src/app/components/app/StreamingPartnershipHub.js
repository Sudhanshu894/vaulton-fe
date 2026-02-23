"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
    backendGetCreatorDonations,
    backendGetCreatorSettings,
    backendUpdateCreatorSettings,
} from "@/services/backendservices";
import { buildVaultonTipLink, shortAddress } from "@/lib/paymentRequest";

const STROOPS_PER_USDC = 10_000_000;
const DEFAULT_MIN_USDC = "1.00";
const DEFAULT_DURATION_SECONDS = "5";
const SETUP_SEEN_PREFIX = "vaulton_streaming_setup_done_";

const formatUsdcFromStroops = (stroops) => {
    const value = Number(stroops);
    if (!Number.isFinite(value)) return "0.00";
    return (value / STROOPS_PER_USDC).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const parseSettings = (payload) => {
    const raw = payload?.settings || payload?.data || payload || {};
    const enabledRaw = raw.overlayEnabled ?? raw.donationEnabled ?? raw.enabled;
    const minDonationRaw = raw.minDonationAmount ?? raw.minTipAmount ?? raw.minimumAmount;
    const displayDurationRaw = raw.displayDuration ?? raw.durationMs ?? raw.displayTimeMs;

    return {
        donationEnabled: enabledRaw == null ? true : Boolean(enabledRaw),
        minDonationStroops: Number.isFinite(Number(minDonationRaw)) ? String(minDonationRaw) : String(STROOPS_PER_USDC),
        displayDurationMs: Number.isFinite(Number(displayDurationRaw)) ? Number(displayDurationRaw) : 5000,
    };
};

const parseDonations = (payload) => {
    const items = payload?.donations || payload?.items || payload?.data || [];
    return Array.isArray(items) ? items : [];
};

const formatTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
};

const getCreatorSlug = (user) => {
    const address = String(user?.smartAccountId || "").trim();
    if (/^[GC][A-Z2-7]{20,}$/.test(address)) {
        return address;
    }

    const source = user?.name || user?.userId || "creator";
    return String(source)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "creator";
};

export default function StreamingPartnershipHub({ onBack, user }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState("");
    const [copyState, setCopyState] = useState("");
    const [showTipQr, setShowTipQr] = useState(false);
    const [tipQrDataUrl, setTipQrDataUrl] = useState("");
    const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

    const [donationEnabled, setDonationEnabled] = useState(true);
    const [minTipUsdc, setMinTipUsdc] = useState(DEFAULT_MIN_USDC);
    const [displayDurationSeconds, setDisplayDurationSeconds] = useState(DEFAULT_DURATION_SECONDS);
    const [donations, setDonations] = useState([]);

    const creatorSlug = useMemo(() => getCreatorSlug(user), [user]);
    const setupSeenKey = useMemo(
        () => `${SETUP_SEEN_PREFIX}${user?.userId || "guest"}`,
        [user?.userId]
    );
    const creatorAddress = user?.smartAccountId || "";
    const creatorName = String(user?.name ?? "").trim() || "Anonymous";
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const tipLink = useMemo(() => {
        if (!creatorAddress || !origin) return "";
        const minimum = Number(minTipUsdc);
        const minimumAmount = Number.isFinite(minimum) && minimum > 0 ? minimum.toFixed(2) : "";
        return buildVaultonTipLink({
            origin,
            slug: creatorSlug,
            recipient: creatorAddress,
            amount: minimumAmount,
            minAmount: minimumAmount,
            creatorName,
        });
    }, [creatorAddress, creatorName, creatorSlug, minTipUsdc, origin]);

    const overlayLink = useMemo(() => {
        if (!creatorAddress || !origin) return "";
        return `${origin}/overlay?address=${encodeURIComponent(creatorAddress)}`;
    }, [creatorAddress, origin]);

    const stats = useMemo(() => {
        const totalStroops = donations.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
        const totalMessages = donations.length;
        const avgStroops = totalMessages > 0 ? totalStroops / totalMessages : 0;
        return {
            totalUsdc: formatUsdcFromStroops(totalStroops),
            totalMessages,
            avgUsdc: formatUsdcFromStroops(avgStroops),
        };
    }, [donations]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        setHasCompletedSetup(window.localStorage.getItem(setupSeenKey) === "1");
    }, [setupSeenKey]);

    useEffect(() => {
        if (!user?.userId) {
            setDonations([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setLoadError("");

        (async () => {
            try {
                const [settingsData, donationsData] = await Promise.all([
                    backendGetCreatorSettings(user.userId),
                    backendGetCreatorDonations(user.userId),
                ]);
                if (cancelled) return;

                const parsedSettings = parseSettings(settingsData);
                const minUsdc = Number(parsedSettings.minDonationStroops) / STROOPS_PER_USDC;
                const rawDuration = Number(parsedSettings.displayDurationMs || 0);
                const durationSeconds = Math.max(1, Math.round(rawDuration > 1000 ? rawDuration / 1000 : rawDuration));
                setDonationEnabled(parsedSettings.donationEnabled);
                setMinTipUsdc(
                    Number.isFinite(minUsdc) && minUsdc > 0
                        ? minUsdc.toFixed(2)
                        : DEFAULT_MIN_USDC
                );
                setDisplayDurationSeconds(String(durationSeconds || Number(DEFAULT_DURATION_SECONDS)));
                setDonations(parseDonations(donationsData));
            } catch (error) {
                console.error("Failed to load streaming partnership data", error);
                if (!cancelled) {
                    setLoadError(error?.response?.data?.error || "Failed to load creator settings");
                    setDonations([]);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.userId]);

    useEffect(() => {
        let cancelled = false;
        if (!showTipQr || !tipLink) {
            setTipQrDataUrl("");
            return;
        }

        (async () => {
            try {
                const qrcode = await import("qrcode");
                const dataUrl = await qrcode.toDataURL(tipLink, {
                    errorCorrectionLevel: "M",
                    margin: 1,
                    width: 240,
                    color: { dark: "#111827", light: "#FFFFFF" },
                });
                if (!cancelled) setTipQrDataUrl(dataUrl);
            } catch (error) {
                console.error("Failed to generate tip link QR", error);
                if (!cancelled) setTipQrDataUrl("");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [showTipQr, tipLink]);

    const handleCopy = async (text, key) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopyState(key);
            setTimeout(() => setCopyState(""), 1200);
        } catch (error) {
            console.error("Copy failed", error);
        }
    };

    const handleSaveSettings = async () => {
        if (!user?.userId) {
            setSaveError("Missing user session");
            return;
        }

        setSaveError("");
        setSaveSuccess("");

        const rawMin = Number(String(minTipUsdc || "").trim());
        const rawDurationSeconds = Number(String(displayDurationSeconds || "").trim());

        if (donationEnabled && (!Number.isFinite(rawMin) || rawMin <= 0)) {
            setSaveError("Minimum SuperChat amount must be greater than 0");
            return;
        }
        if (donationEnabled && (!Number.isFinite(rawDurationSeconds) || rawDurationSeconds <= 0)) {
            setSaveError("Display duration must be greater than 0 seconds");
            return;
        }

        const minValue = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : Number(DEFAULT_MIN_USDC);
        const durationSeconds = Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
            ? rawDurationSeconds
            : Number(DEFAULT_DURATION_SECONDS);

        const minDonationAmount = String(Math.round(minValue * STROOPS_PER_USDC));
        const payload = {
            overlayEnabled: donationEnabled,
            minDonationAmount,
            displayDuration: Math.round(durationSeconds * 1000),
        };

        setIsSaving(true);
        try {
            const response = await backendUpdateCreatorSettings(user.userId, payload);
            if (!response?.success && response?.error) {
                throw new Error(response.error);
            }
            if (typeof window !== "undefined") {
                window.localStorage.setItem(setupSeenKey, "1");
            }
            setHasCompletedSetup(true);
            setSaveSuccess("Settings saved");
            setTimeout(() => setSaveSuccess(""), 1400);
        } catch (error) {
            console.error("Failed to save creator settings", error);
            setSaveError(error?.response?.data?.error || error?.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (!user?.userId) {
        return (
            <div className="space-y-5 pb-24">
                <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#1A1A2E]">
                    <span>←</span> Back to Add-ons
                </button>
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-8 text-center">
                    <p className="text-lg font-black text-[#1A1A2E]">Log in to manage Streaming Partnership</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-7 animate-fade-in pb-24">
            <div className="space-y-2">
                <button onClick={onBack} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#1A1A2E] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Add-ons</span>
                    <span>/</span>
                    <span className="text-[#1A1A2E]">Streaming Partnership</span>
                </button>
                <h2 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">Streaming Partnership</h2>
                <p className="text-sm text-gray-500 font-semibold">Creator tools for SuperChat links and stream overlays</p>
            </div>

            {isLoading ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center">
                    <div className="w-7 h-7 mx-auto border-4 border-[#FFB800]/25 border-t-[#FFB800] rounded-full animate-spin" />
                    <p className="mt-3 text-sm font-semibold text-gray-500">Loading creator dashboard...</p>
                </div>
            ) : !hasCompletedSetup ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 space-y-5">
                    <div>
                        <h3 className="text-xl font-black text-[#1A1A2E]">Creator Setup</h3>
                        <p className="text-sm text-gray-500 font-semibold mt-1">Set your donation rules once, then manage everything from dashboard.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-black text-[#1A1A2E]">Enable SuperChat Donations</p>
                                <p className="text-xs text-gray-500 font-semibold">Allow viewers to send highlighted donations</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDonationEnabled((v) => !v)}
                                className={`w-12 h-7 rounded-full transition-all relative ${donationEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                            >
                                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${donationEnabled ? "left-6" : "left-1"}`} />
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Minimum SuperChat (USDC)</p>
                                <input
                                    disabled={!donationEnabled}
                                    value={minTipUsdc}
                                    onChange={(e) => setMinTipUsdc(e.target.value.replace(/[^\d.]/g, ""))}
                                    className={`w-full bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A2E] outline-none ${!donationEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                    placeholder="1.00"
                                />
                            </div>
                            <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Display Time (seconds)</p>
                                <input
                                    disabled={!donationEnabled}
                                    value={displayDurationSeconds}
                                    onChange={(e) => setDisplayDurationSeconds(e.target.value.replace(/[^\d]/g, ""))}
                                    className={`w-full bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A2E] outline-none ${!donationEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                    placeholder="5"
                                />
                            </div>
                        </div>
                    </div>

                    {(loadError || saveError || saveSuccess) && (
                        <p className={`text-sm font-semibold ${saveSuccess ? "text-emerald-600" : "text-red-500"}`}>
                            {saveSuccess || saveError || loadError}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="w-full py-3 rounded-2xl bg-[#FFB800] text-[#1A1A2E] font-black text-sm disabled:opacity-60"
                    >
                        {isSaving ? "Saving..." : "Save Setup & Continue"}
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-gray-500">Total Received</p>
                            <p className="text-2xl font-black text-[#1A1A2E] mt-1">${stats.totalUsdc}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-gray-500">Messages</p>
                            <p className="text-2xl font-black text-[#1A1A2E] mt-1">{stats.totalMessages}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-gray-500">Avg Tip</p>
                            <p className="text-2xl font-black text-[#1A1A2E] mt-1">${stats.avgUsdc}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-gray-500">Status</p>
                            <p className={`text-2xl font-black mt-1 ${donationEnabled ? "text-emerald-600" : "text-gray-500"}`}>
                                {donationEnabled ? "Active" : "Disabled"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6">
                        <div className="grid lg:grid-cols-2 gap-4">
                            <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-black text-[#1A1A2E]">Tip Link</h3>
                                        <p className="text-xs text-gray-500 font-semibold">Viewers open this to send SuperChats to your creator address.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopy(tipLink, "tip")}
                                            className={`w-9 h-9 rounded-xl border flex items-center justify-center ${copyState === "tip" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-gray-100 text-[#1A1A2E]"}`}
                                            title={copyState === "tip" ? "Copied" : "Copy tip link"}
                                        >
                                            {copyState === "tip" ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setShowTipQr((v) => !v)}
                                            className={`w-9 h-9 rounded-xl border flex items-center justify-center ${showTipQr ? "bg-[#FFB800]/15 border-[#FFB800]/40 text-[#B7791F]" : "bg-white border-gray-100 text-[#1A1A2E]"}`}
                                            title={showTipQr ? "Hide QR" : "Show QR"}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-xl p-3 text-xs font-mono text-[#1A1A2E] break-all">
                                    {tipLink || "Tip link unavailable"}
                                </div>

                                {showTipQr && (
                                    <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-start">
                                        <div className="rounded-xl bg-white border border-gray-100 p-2.5">
                                            {tipQrDataUrl ? (
                                                <Image
                                                    src={tipQrDataUrl}
                                                    alt="Tip link QR"
                                                    width={180}
                                                    height={180}
                                                    unoptimized
                                                    className="w-full h-auto rounded-lg bg-white"
                                                />
                                            ) : (
                                                <div className="aspect-square rounded-lg bg-white flex items-center justify-center text-xs text-gray-400 font-semibold">
                                                    Generating QR...
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 font-semibold">
                                            Display this QR on stream so viewers can scan and open your tip link instantly.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-black text-[#1A1A2E]">Streaming Overlay Link</h3>
                                        <p className="text-xs text-gray-500 font-semibold">Use this browser-source link in OBS/Streamlabs to show live SuperChats.</p>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(overlayLink, "overlay")}
                                        className={`w-9 h-9 rounded-xl border flex items-center justify-center ${copyState === "overlay" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-gray-100 text-[#1A1A2E]"}`}
                                        title={copyState === "overlay" ? "Copied" : "Copy streaming link"}
                                    >
                                        {copyState === "overlay" ? (
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
                                <div className="bg-white border border-gray-100 rounded-xl p-3 text-xs font-mono text-[#1A1A2E] break-all">
                                    {overlayLink || "Streaming link unavailable"}
                                </div>
                                <p className="text-xs text-gray-500 font-semibold">
                                    In OBS: add a Browser source and paste this link.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 space-y-4">
                        <h3 className="text-lg font-black text-[#1A1A2E]">Creator Settings</h3>
                        <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-black text-[#1A1A2E]">Enable Donations</p>
                                <p className="text-xs text-gray-500 font-semibold">Turn SuperChat receiving on/off</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDonationEnabled((v) => !v)}
                                className={`w-12 h-7 rounded-full transition-all relative ${donationEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                            >
                                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${donationEnabled ? "left-6" : "left-1"}`} />
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Minimum SuperChat (USDC)</p>
                                <input
                                    disabled={!donationEnabled}
                                    value={minTipUsdc}
                                    onChange={(e) => setMinTipUsdc(e.target.value.replace(/[^\d.]/g, ""))}
                                    className={`w-full bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A2E] outline-none ${!donationEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                />
                            </div>
                            <div className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Display Time (seconds)</p>
                                <input
                                    disabled={!donationEnabled}
                                    value={displayDurationSeconds}
                                    onChange={(e) => setDisplayDurationSeconds(e.target.value.replace(/[^\d]/g, ""))}
                                    className={`w-full bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A2E] outline-none ${!donationEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                />
                            </div>
                        </div>

                        {(loadError || saveError || saveSuccess) && (
                            <p className={`text-sm font-semibold ${saveSuccess ? "text-emerald-600" : "text-red-500"}`}>
                                {saveSuccess || saveError || loadError}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#FFB800] text-[#1A1A2E] text-sm font-black disabled:opacity-60"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-black text-[#1A1A2E]">Recent SuperChats</h3>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{donations.length} total</span>
                        </div>

                        {donations.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-[#F8F9FB] border border-dashed border-gray-200 text-center">
                                <p className="text-sm font-semibold text-gray-500">No SuperChats yet. Transactions will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {donations.map((donation, index) => {
                                    const key = donation?._id || donation?.id || donation?.txHash || `${index}-${donation?.createdAt || "donation"}`;
                                    const senderName = donation?.senderName || donation?.name || "Anonymous";
                                    const message = donation?.message || "";
                                    const amount = formatUsdcFromStroops(donation?.amount);
                                    const created = formatTimestamp(donation?.createdAt);
                                    const txHash = donation?.txHash || donation?.hash || "";

                                    return (
                                        <div key={key} className="bg-[#F8F9FB] border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-3">
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-[#1A1A2E] truncate">{senderName}</p>
                                                    {created && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{created}</span>}
                                                </div>
                                                {message ? (
                                                    <p className="text-sm text-gray-600 font-semibold break-words">{message}</p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 font-semibold italic">No message</p>
                                                )}
                                                {txHash && (
                                                    <p className="text-[10px] font-mono text-gray-400">
                                                        {shortAddress(txHash, 10, 8)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-black text-emerald-600">${amount}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">USDC</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

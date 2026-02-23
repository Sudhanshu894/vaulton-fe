"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const quickAmounts = ["5", "10", "25", "50", "100"];
const STREAMING_VISITED_KEY_PREFIX = "vaulton_streaming_seen_";

const getInitials = (name) => {
    const safe = String(name || "JD").trim();
    if (!safe) return "JD";
    const parts = safe.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

function Toggle({ enabled, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`w-12 h-7 rounded-full transition-all duration-300 relative ${enabled ? "bg-emerald-500" : "bg-gray-300"}`}
            aria-pressed={enabled}
        >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${enabled ? "left-6" : "left-1"}`} />
        </button>
    );
}

function InfoCard({ title, value, icon, iconColor = "text-[#1A1A2E]" }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-4 md:p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs md:text-sm font-bold">
                <span className={iconColor}>{icon}</span>
                {title}
            </div>
            <p className="mt-2 text-2xl md:text-4xl font-black tracking-tight text-[#1A1A2E]">{value}</p>
        </div>
    );
}

export default function StreamingPartnershipHub({ onBack, user }) {
    const [screen, setScreen] = useState(() => {
        if (typeof window === "undefined") return "creator";
        const key = `${STREAMING_VISITED_KEY_PREFIX}${user?.userId || "guest"}`;
        const hasVisited = window.localStorage.getItem(key) === "1";
        if (!hasVisited) {
            window.localStorage.setItem(key, "1");
        }
        return hasVisited ? "hub" : "creator";
    });
    const [minimumTip, setMinimumTip] = useState("1");
    const [acceptUsdc, setAcceptUsdc] = useState(true);
    const [acceptXlm, setAcceptXlm] = useState(true);
    const [copyState, setCopyState] = useState("");
    const [sendCurrency, setSendCurrency] = useState("USDC");
    const [sendAmount, setSendAmount] = useState("0");
    const [sendMessage, setSendMessage] = useState("");
    const [sendStatus, setSendStatus] = useState("");

    const creatorName = user?.name || "John Doe";
    const creatorSlug = useMemo(() => {
        const source = user?.userId || creatorName || "johndoe";
        return String(source).toLowerCase().replace(/[^a-z0-9]+/g, "");
    }, [creatorName, user?.userId]);
    const initials = getInitials(creatorName);
    const tipLink = `https://vaulton.app/tip/${creatorSlug || "johndoe"}`;
    const overlayLink = `https://vaulton.app/overlay/${creatorSlug || "johndoe"}`;

    const handleCopy = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyState(key);
            setTimeout(() => setCopyState(""), 1200);
        } catch (e) {
            console.error("Failed to copy", e);
        }
    };

    const handleSend = () => {
        const n = Number(sendAmount);
        if (!Number.isFinite(n) || n <= 0) return;
        setSendStatus(`SuperChat sent to ${creatorName} (frontend simulation).`);
        setTimeout(() => setSendStatus(""), 2400);
    };

    if (screen === "creator") {
        return (
            <div className="space-y-4 md:space-y-7 animate-fade-in pb-20 md:pb-24">
                <button onClick={() => setScreen("hub")} className="text-sm md:text-2xl font-black text-gray-500 flex items-center gap-2 md:gap-3 hover:text-[#1A1A2E]">
                    <span>←</span> Back to SuperChat
                </button>

                <div className="flex items-start md:items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-[#FFB800] rounded-xl md:rounded-2xl flex items-center justify-center text-[#1A1A2E]">
                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-2xl md:text-5xl font-black tracking-tight text-[#1A1A2E]">Creator Setup</h3>
                        <p className="text-sm md:text-2xl text-gray-500 font-bold">Manage your SuperChat links and settings</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <InfoCard
                        title="Total Earned"
                        value="--"
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.2 0-5.5 1.4-5.5 3.2 0 1.9 2.3 3.3 5.5 3.3 3 0 5.5 1.3 5.5 3.2 0 1.8-2.5 3.3-5.5 3.3m0-13V5m0 16v-2" /></svg>}
                        iconColor="text-amber-500"
                    />
                    <InfoCard
                        title="Messages"
                        value="--"
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h4m8 5l-4-4H7a3 3 0 01-3-3V6a3 3 0 013-3h10a3 3 0 013 3v13z" /></svg>}
                        iconColor="text-blue-500"
                    />
                    <InfoCard
                        title="Avg Tip"
                        value="--"
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4-4 4 4 5-6" /></svg>}
                        iconColor="text-emerald-500"
                    />
                    <InfoCard
                        title="Status"
                        value="Active"
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        iconColor="text-emerald-500"
                    />
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-4 md:space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l3-3m0 0l-3-3m3 3H3m17 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-xl md:text-4xl font-black text-[#1A1A2E] tracking-tight">Tip Link</h4>
                            <p className="text-sm md:text-xl text-gray-500 font-bold">Paste this in your social media bio or stream description</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input readOnly value={tipLink} className="w-full flex-1 rounded-xl md:rounded-2xl bg-[#F2F5F9] px-3 md:px-4 py-3 md:py-4 text-xs sm:text-sm md:text-2xl font-mono font-bold text-[#1A1A2E] outline-none" />
                        <button onClick={() => handleCopy(tipLink, "tip")} className="w-full sm:w-auto px-5 md:px-7 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#FFB800] text-[#1A1A2E] font-black text-base md:text-2xl">
                            {copyState === "tip" ? "Copied" : "Copy"}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {["YouTube", "Twitch", "Twitter/X", "Instagram"].map((item) => (
                            <span key={item} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[#F2F5F9] text-gray-500 font-bold text-xs sm:text-sm md:text-xl">{item}</span>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-4 md:space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-6 4H5a2 2 0 01-2-2V8a2 2 0 012-2h4m6 12h4a2 2 0 002-2V8a2 2 0 00-2-2h-4m0 12V6m0 12H9m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-xl md:text-4xl font-black text-[#1A1A2E] tracking-tight">Stream Overlay Link</h4>
                            <p className="text-sm md:text-xl text-gray-500 font-bold">Add as Browser Source in OBS / Streamlabs</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input readOnly value={overlayLink} className="w-full flex-1 rounded-xl md:rounded-2xl bg-[#F2F5F9] px-3 md:px-4 py-3 md:py-4 text-xs sm:text-sm md:text-2xl font-mono font-bold text-[#1A1A2E] outline-none" />
                        <button onClick={() => handleCopy(overlayLink, "overlay")} className="w-full sm:w-auto px-5 md:px-7 py-3 md:py-4 rounded-xl md:rounded-2xl bg-purple-500 text-white font-black text-base md:text-2xl">
                            {copyState === "overlay" ? "Copied" : "Copy"}
                        </button>
                    </div>

                    <div className="rounded-xl md:rounded-2xl bg-purple-50 border border-purple-100 px-3 md:px-4 py-3 text-xs md:text-lg font-semibold text-gray-500">
                        In OBS: Sources → Add → Browser → paste this URL. Set width to 400px and height to 600px. SuperChats will animate on screen during your stream.
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-3 md:space-y-4">
                    <h4 className="text-xl md:text-4xl font-black tracking-tight text-[#1A1A2E]">SuperChat Settings</h4>

                    <div className="rounded-xl md:rounded-2xl bg-[#F2F5F9] px-4 md:px-5 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                        <div>
                            <p className="text-base md:text-3xl font-black text-[#1A1A2E]">Minimum Tip Amount</p>
                            <p className="text-xs md:text-xl text-gray-500 font-bold">Set the minimum amount viewers can send</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl md:text-3xl font-black text-[#1A1A2E]">$</span>
                            <input
                                value={minimumTip}
                                onChange={(e) => setMinimumTip(e.target.value.replace(/[^\d.]/g, ""))}
                                className="w-16 md:w-20 text-right bg-transparent text-xl md:text-3xl font-black text-[#1A1A2E] outline-none"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl md:rounded-2xl bg-[#F2F5F9] px-4 md:px-5 py-3 md:py-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-base md:text-3xl font-black text-[#1A1A2E]">Accept USDC</p>
                            <p className="text-xs md:text-xl text-gray-500 font-bold">Allow tips in USDC stablecoin</p>
                        </div>
                        <Toggle enabled={acceptUsdc} onToggle={() => setAcceptUsdc((v) => !v)} />
                    </div>

                    <div className="rounded-xl md:rounded-2xl bg-[#F2F5F9] px-4 md:px-5 py-3 md:py-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-base md:text-3xl font-black text-[#1A1A2E]">Accept XLM</p>
                            <p className="text-xs md:text-xl text-gray-500 font-bold">Allow tips in Stellar Lumens</p>
                        </div>
                        <Toggle enabled={acceptXlm} onToggle={() => setAcceptXlm((v) => !v)} />
                    </div>
                </div>
            </div>
        );
    }

    if (screen === "sender") {
        return (
            <div className="space-y-4 md:space-y-6 animate-fade-in pb-20 md:pb-24 max-w-4xl mx-auto">
                <button onClick={() => setScreen("hub")} className="text-sm md:text-xl font-black text-gray-500 flex items-center gap-2 hover:text-[#1A1A2E]">
                    <span>←</span> Back to SuperChat
                </button>

                <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#1A1A2E] text-white text-2xl md:text-4xl font-black flex items-center justify-center">
                        {initials}
                    </div>
                    <h3 className="text-2xl md:text-5xl font-black tracking-tight text-[#1A1A2E]">Send SuperChat to {creatorName}</h3>
                    <p className="text-base md:text-2xl text-gray-500 font-bold">Your message will appear on their stream</p>
                </div>

                <div className="text-center">
                    <div className="inline-flex items-center gap-2 md:gap-3 text-5xl md:text-8xl font-black text-gray-500">
                        <span className="text-3xl md:text-6xl text-gray-500">$</span>
                        <input
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value.replace(/[^\d.]/g, ""))}
                            className="w-28 md:w-56 text-center bg-transparent outline-none text-[#1A1A2E]"
                        />
                    </div>
                </div>

                <div className="flex justify-center gap-2 flex-wrap">
                    {["USDC", "XLM"].map((token) => (
                        <button
                            key={token}
                            onClick={() => setSendCurrency(token)}
                            className={`px-5 md:px-8 py-2.5 md:py-3 rounded-2xl md:rounded-3xl text-base md:text-3xl font-black border ${sendCurrency === token ? "bg-amber-50 border-amber-200 text-amber-500" : "bg-[#F2F5F9] border-gray-200 text-gray-500"}`}
                        >
                            {token}
                        </button>
                    ))}
                </div>

                <div className="flex justify-center gap-2 flex-wrap">
                    {quickAmounts.map((value) => (
                        <button
                            key={value}
                            onClick={() => setSendAmount(value)}
                            className="px-4 md:px-5 py-2.5 md:py-3 rounded-2xl md:rounded-3xl bg-[#F2F5F9] border border-gray-200 text-base md:text-3xl font-black text-[#1A1A2E]"
                        >
                            ${value}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <textarea
                        value={sendMessage}
                        onChange={(e) => setSendMessage(e.target.value.slice(0, 200))}
                        placeholder="Write your message..."
                        className="w-full h-36 md:h-56 rounded-2xl md:rounded-3xl bg-[#F2F5F9] border border-gray-200 text-lg md:text-4xl px-4 md:px-6 py-4 md:py-6 text-[#1A1A2E] placeholder:text-gray-400 font-medium outline-none resize-none"
                    />
                    <p className="text-right text-sm md:text-3xl font-bold text-gray-500">{sendMessage.length}/200</p>
                </div>

                <button
                    onClick={handleSend}
                    disabled={!Number(sendAmount)}
                    className="w-full py-3.5 md:py-5 rounded-2xl md:rounded-3xl bg-[#F5DCAB] text-[#1A1A2E] text-xl md:text-4xl font-black disabled:opacity-60"
                >
                    ⚡ Send SuperChat
                </button>

                {sendStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl md:rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 md:p-4 text-sm md:text-lg font-bold text-center"
                    >
                        {sendStatus}
                    </motion.div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5 md:space-y-8 animate-fade-in pb-20 md:pb-24">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button onClick={onBack} className="text-sm md:text-2xl font-black text-gray-500 flex items-center gap-2 md:gap-3 hover:text-[#1A1A2E]">
                    <span>←</span> Back to Add-ons
                </button>
                <div className="text-left sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add-on</p>
                    <h2 className="text-lg sm:text-xl md:text-3xl font-black tracking-tight text-[#1A1A2E]">Streaming Partnership</h2>
                </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4 md:gap-5">
                <div className="relative overflow-hidden rounded-[1.75rem] md:rounded-[2.5rem] p-4 md:p-8 bg-gradient-to-br from-[#1A2438] via-[#2C3A52] to-[#31435F] text-white shadow-sm">
                    <div className="absolute top-0 right-0 w-28 h-28 md:w-40 md:h-40 bg-amber-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="space-y-4 md:space-y-5 relative z-10">
                        <div className="flex items-start md:items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                                <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-4xl font-black tracking-tight">Creator Mode</h3>
                                <p className="text-sm md:text-2xl text-blue-100 font-bold">Set up SuperChat for your streams</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                                <p className="text-xs md:text-xl text-blue-100 font-bold">Total Earned</p>
                                <p className="text-3xl md:text-6xl font-black tracking-tight">--</p>
                            </div>
                            <div className="bg-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4">
                                <p className="text-xs md:text-xl text-blue-100 font-bold">Messages</p>
                                <p className="text-3xl md:text-6xl font-black tracking-tight">--</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setScreen("creator")}
                            className="w-full py-3 md:py-4 rounded-2xl md:rounded-3xl bg-[#FFB800] text-[#1A1A2E] text-lg md:text-3xl font-black hover:brightness-105"
                        >
                            ⚙ Manage Creator Setup →
                        </button>
                    </div>
                </div>

                {/* <div className="bg-white border border-gray-200 rounded-[1.75rem] md:rounded-[2.5rem] p-4 md:p-8 space-y-4 md:space-y-5">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h4m8 5l-4-4H7a3 3 0 01-3-3V6a3 3 0 013-3h10a3 3 0 013 3v13z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl md:text-4xl font-black tracking-tight text-[#1A1A2E]">Send a SuperChat</h3>
                            <p className="text-sm md:text-2xl font-bold text-gray-500">Support your favorite creators</p>
                        </div>
                    </div>
                    <p className="text-base md:text-3xl leading-relaxed text-gray-500 font-medium">
                        Visit a creator&apos;s tip link to send them a highlighted message with a crypto tip via USDC or XLM.
                    </p>
                    <button
                        onClick={() => setScreen("sender")}
                        className="w-full py-3 md:py-4 rounded-2xl md:rounded-3xl border border-gray-200 text-[#1A1A2E] text-lg md:text-3xl font-black hover:bg-gray-50"
                    >
                        👁 Preview Sender Flow
                    </button>
                </div> */}
            </div>

            <div className="space-y-2 md:space-y-3">
                <h4 className="text-xl md:text-4xl font-black tracking-tight text-[#1A1A2E]">Recent SuperChats</h4>
                <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-4 md:p-6">
                    <p className="text-sm md:text-base font-semibold text-gray-500">
                        No SuperChats yet. Live activity will appear here once transactions start.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-4 md:space-y-5">
                <h4 className="text-xl md:text-4xl font-black tracking-tight text-[#1A1A2E]">How SuperChat Works</h4>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-2xl md:rounded-3xl bg-[#F2F5F9] p-4 md:p-5 text-center">
                        <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3 md:mb-4">
                            <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l3-3m0 0l-3-3m3 3H3m17 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-lg md:text-3xl font-black text-[#1A1A2E]">Share Your Link</p>
                        <p className="text-sm md:text-2xl text-gray-500 font-semibold mt-2">Paste your tip link in your YouTube, Twitch, or social media bio.</p>
                    </div>
                    <div className="rounded-2xl md:rounded-3xl bg-[#F2F5F9] p-4 md:p-5 text-center">
                        <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3 md:mb-4">
                            <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h4m8 5l-4-4H7a3 3 0 01-3-3V6a3 3 0 013-3h10a3 3 0 013 3v13z" />
                            </svg>
                        </div>
                        <p className="text-lg md:text-3xl font-black text-[#1A1A2E]">Fans Send Tips</p>
                        <p className="text-sm md:text-2xl text-gray-500 font-semibold mt-2">Viewers visit your link, compose a message, pick a color tier, and pay in USDC or XLM.</p>
                    </div>
                    <div className="rounded-2xl md:rounded-3xl bg-[#F2F5F9] p-4 md:p-5 text-center">
                        <div className="w-10 h-10 md:w-14 md:h-14 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3 md:mb-4">
                            <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-6 4H5a2 2 0 01-2-2V8a2 2 0 012-2h4m6 12V6m0 12H9m6 0H9" />
                            </svg>
                        </div>
                        <p className="text-lg md:text-3xl font-black text-[#1A1A2E]">Show on Stream</p>
                        <p className="text-sm md:text-2xl text-gray-500 font-semibold mt-2">Add the overlay link to OBS/Streamlabs to display SuperChats live on your stream.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

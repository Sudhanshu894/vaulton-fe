"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { backendUpdateName } from "@/services/backendservices";

const formatMemberSince = (createdAt) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "Member since -";
    return `Member since ${date.toLocaleString(undefined, { month: "short", year: "numeric" })}`;
};

const getProfileInitial = (name) => {
    const text = String(name || "").trim();
    if (!text) return "A";
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function ProfileHub({ onBack, onLogout, user, onUserUpdated }) {
    const [subTab, setSubTab] = useState("profile");
    const [displayName, setDisplayName] = useState(user?.name || "");
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameMessage, setNameMessage] = useState({ type: "", text: "" });

    const memberSinceLabel = useMemo(() => formatMemberSince(user?.createdAt), [user?.createdAt]);

    useEffect(() => {
        setDisplayName(user?.name || "");
    }, [user?.name]);

    const handleSaveName = async () => {
        if (!user?.userId || isSavingName) return;

        setIsSavingName(true);
        setNameMessage({ type: "", text: "" });
        try {
            const nextName = String(displayName || "").trim() || "Anonymous";
            const response = await backendUpdateName(user.userId, nextName);
            if (response?.success === false) {
                throw new Error(response?.error || "Failed to update name");
            }

            setDisplayName(nextName);
            onUserUpdated?.({ name: nextName });
            setNameMessage({ type: "success", text: "Name updated" });
        } catch (error) {
            console.error("Failed to update profile name", error);
            setNameMessage({ type: "error", text: error?.response?.data?.error || error?.message || "Failed to update name" });
        } finally {
            setIsSavingName(false);
        }
    };

    const renderSubTab = () => {
        switch (subTab) {
            case "profile":
                return (
                    <div className="space-y-8 animate-fade-in w-full max-w-full">
                        <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col items-center gap-6 min-w-0 overflow-hidden">
                            <div className="relative group shrink-0">
                                <div className="w-24 h-24 bg-[#1A1A2E] text-white rounded-full flex items-center justify-center text-3xl font-black shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500 uppercase">
                                    {getProfileInitial(user?.name)}
                                </div>
                                <div className="absolute -inset-2 bg-gradient-to-tr from-[#FFB800] to-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <button className="absolute bottom-0 right-0 p-2 bg-[#FFB800] text-[#1A1A2E] rounded-full shadow-lg border-4 border-white z-20 hover:scale-110 transition-transform">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="text-center w-full min-w-0">
                                <h4 className="text-2xl font-black text-[#1A1A2E] truncate px-2">@{user?.userId || "user"}</h4>
                                <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest mt-1 truncate px-2">
                                    {user?.smartAccountId ? `${user.smartAccountId.slice(0, 6)}...${user.smartAccountId.slice(-6)}` : "No Smart Account"}
                                </p>
                                <p className="text-[#FFB800] text-[9px] font-black uppercase tracking-[0.2em] mt-2">{memberSinceLabel}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                                            placeholder="Anonymous"
                                            className="w-full bg-[#F8F9FB] p-4 rounded-2xl text-sm font-bold border border-transparent outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveName}
                                            disabled={isSavingName}
                                            className="px-4 py-4 rounded-2xl bg-[#1A1A2E] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                        >
                                            {isSavingName ? "Saving" : "Save"}
                                        </button>
                                    </div>
                                    {nameMessage.text && (
                                        <p className={`text-xs font-semibold px-1 ${nameMessage.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                                            {nameMessage.text}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">User Identifier</label>
                                    <input type="text" value={`@${user?.userId || ""}`} readOnly className="w-full bg-[#F8F9FB] p-4 rounded-2xl text-sm font-bold border border-transparent outline-none transition-all cursor-not-allowed" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Smart Account ID</label>
                                    <input type="text" value={user?.smartAccountId || ""} readOnly className="w-full bg-[#F8F9FB] p-4 rounded-2xl text-[10px] font-mono font-bold border border-transparent outline-none transition-all cursor-not-allowed" />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[2.5rem] border border-red-50 space-y-4">
                                <button
                                    onClick={onLogout}
                                    className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Terminate Session
                                </button>
                            </div>

                            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 space-y-6">
                                <h5 className="text-sm font-black text-[#1A1A2E] uppercase tracking-widest">Preferences</h5>
                                {[
                                    { label: "Default Currency", val: "USDC", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                                    { label: "Theme", val: "Light", icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" },
                                    { label: "Network", val: "Stellar Mainnet", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[#FFB800] transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black ${item.val.includes('Mainnet') ? 'text-emerald-500' : 'text-[#1A1A2E]'}`}>{item.val}</span>
                                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case "sdk":
                return (
                    <div className="space-y-8 animate-fade-in h-[500px] flex flex-col">
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 flex-1 flex flex-col items-center justify-center text-center space-y-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB800]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                            <div className="w-24 h-24 bg-[#F8F9FB] rounded-3xl flex items-center justify-center text-[#FFB800] border border-gray-100 shadow-inner">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-3xl font-black text-[#1A1A2E]">Wallet SDK</h4>
                                <p className="text-gray-400 font-bold max-w-sm mx-auto leading-relaxed">Enable passkey-powered Stellar payments in your own app with just 3 lines of code.</p>
                            </div>

                            <div className="w-full bg-[#1A1A2E] p-6 rounded-2xl text-left overflow-hidden border border-white/5">
                                <div className="flex gap-1.5 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                                </div>
                                <code className="text-[10px] font-mono text-emerald-400 block break-all leading-tight">
                                    npm install @vaulton/sdk<br />
                                    <span className="text-blue-400">const</span> vault = <span className="text-yellow-400">new</span> Vaulton(<span className="text-orange-400">&apos;YOUR_API_KEY&apos;</span>);<br />
                                    <span className="text-blue-400">await</span> vault.pay({'{'} amount: <span className="text-purple-400">&apos;50.00&apos;</span> {'}'});
                                </code>
                            </div>

                            <button className="px-8 py-4 bg-[#FFB800] text-[#1A1A2E] rounded-2xl font-black shadow-lg hover:scale-105 transition-all">Get API Key</button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 h-full animate-fade-in pb-24">
            <div className="flex items-center justify-between px-2">
                <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-[#1A1A2E] hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="text-lg font-black text-[#1A1A2E] uppercase tracking-widest">{subTab}</h3>
                <div className="w-11"></div> {/* Spacer */}
            </div>

            <div className="flex gap-2 p-2 bg-gray-100 rounded-3xl overflow-x-auto no-scrollbar">
                {[
                    { id: "profile", label: "Profile" },
                    { id: "sdk", label: "SDK Docs" },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${subTab === t.id ? 'bg-[#1A1A2E] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {renderSubTab()}
            </div>
        </div>
    );
}

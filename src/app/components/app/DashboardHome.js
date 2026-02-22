"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { backendListScheduledTransfers, getTransactions } from "@/services/backendservices";
import { shortAddress } from "@/lib/paymentRequest";

const ACTIVE_AUTOPAY_STATUSES = new Set(["pending", "executing"]);

const formatAmountUsdc = (stroops) => {
    const value = Number(stroops);
    if (!Number.isFinite(value)) return "0.00";
    return (value / 10_000_000).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatDateLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No schedule";
    return `Next: ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
};

const getAutopayIcon = (status) => {
    const color = status === "completed"
        ? "bg-emerald-50 text-emerald-600"
        : status === "cancelled"
            ? "bg-red-50 text-red-600"
            : status === "executing"
                ? "bg-sky-50 text-sky-600"
                : "bg-purple-50 text-purple-600";

    return (
        <div className={`w-10 h-10 md:w-14 md:h-14 ${color} rounded-xl md:rounded-2xl flex items-center justify-center shrink-0`}>
            <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        </div>
    );
};

export default function DashboardHome({ onNavigate, user, balance, refreshBalance }) {
    const router = useRouter();
    const [autopayPreview, setAutopayPreview] = useState([]);
    const [allActiveAutopays, setAllActiveAutopays] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

    const walletAddress = user?.smartAccountId;

    useEffect(() => {
        if (!walletAddress) {
            setAutopayPreview([]);
            setAllActiveAutopays([]);
            setRecentTransactions([]);
            return;
        }

        let cancelled = false;
        setIsLoadingPreviews(true);

        (async () => {
            try {
                const [autopayData, txData] = await Promise.all([
                    backendListScheduledTransfers(walletAddress),
                    getTransactions(walletAddress, 1, 5),
                ]);

                if (cancelled) return;

                const transfers = Array.isArray(autopayData?.transfers) ? autopayData.transfers : [];
                const activeTransfers = transfers
                    .filter((t) => ACTIVE_AUTOPAY_STATUSES.has(t.status))
                    .sort((a, b) => new Date(a.scheduledTime || a.deadline || 0) - new Date(b.scheduledTime || b.deadline || 0));

                setAllActiveAutopays(activeTransfers);
                setAutopayPreview(activeTransfers.slice(0, 3));
                setRecentTransactions(Array.isArray(txData?.transactions) ? txData.transactions.slice(0, 4) : []);
            } catch (error) {
                console.error("Failed to load dashboard previews", error);
                if (!cancelled) {
                    setAutopayPreview([]);
                    setAllActiveAutopays([]);
                    setRecentTransactions([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPreviews(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [walletAddress]);

    const monthlyAutopayTotal = useMemo(() => {
        const total = allActiveAutopays.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return formatAmountUsdc(total);
    }, [allActiveAutopays]);

    return (
        <div className="space-y-8 md:space-y-12 animate-fade-in pb-24">
            <div className="grid lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2 relative overflow-hidden bg-[#1A1A2E] text-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col justify-center min-h-[300px] md:min-h-[350px]">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB800]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-400 text-sm md:text-base font-bold tracking-tight">Total Balance</p>
                            <button
                                onClick={refreshBalance}
                                className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors active:scale-95"
                            >
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>

                        <div>
                            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-none break-all truncate max-w-full">${balance}</h2>
                            <div className="flex items-center gap-3 mt-4 group cursor-pointer w-fit max-w-full" onClick={() => user?.smartAccountId && navigator.clipboard.writeText(user.smartAccountId)}>
                                <p className="text-gray-400 text-sm font-mono truncate">{user?.smartAccountId ? shortAddress(user.smartAccountId, 8, 8) : "No smart account deployed"}</p>
                                {user?.smartAccountId && (
                                    <svg className="w-5 h-5 text-gray-500 shrink-0 group-hover:text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-6 pt-4">
                            <div className="bg-white/5 p-4 md:p-6 rounded-3xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-300 min-w-0 overflow-hidden">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">USDC</p>
                                <p className="text-lg md:text-2xl font-black truncate">${balance}</p>
                                <p className="text-gray-500 text-[10px] font-bold truncate">{balance} USDC</p>
                            </div>
                            <div className="bg-white/5 p-4 md:p-6 rounded-3xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-300 min-w-0">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Network</p>
                                <p className="text-lg md:text-2xl font-black">Stellar</p>
                                <p className="text-gray-500 text-[10px] font-bold">Standard</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center gap-4 md:gap-6">
                    <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest text-center lg:text-left">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {[
                            { id: 'send', label: 'Send', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', color: 'bg-blue-500' },
                            { id: 'receive', label: 'Receive', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01', color: 'bg-emerald-500' },
                            { id: 'autopay', label: 'Autopay', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'bg-purple-500' },
                            { id: 'anonymous', label: 'Anonymous Pay', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', color: 'bg-gray-800' }
                        ].map((action) => (
                            <button
                                key={action.id}
                                onClick={() => onNavigate(action.id)}
                                className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-50 rounded-2xl md:rounded-3xl hover:bg-white hover:shadow-xl transition-all duration-300 group"
                            >
                                <div className={`w-10 h-10 md:w-12 md:h-12 ${action.color} text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                                    </svg>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-[#1A1A2E] tracking-tight">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <section className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">Active Autopay</h3>
                        </div>
                        <button onClick={() => onNavigate("autopay")} className="text-xs font-black text-[#FFB800] uppercase tracking-widest hover:underline">View All</button>
                    </div>

                    {isLoadingPreviews && autopayPreview.length === 0 ? (
                        <div className="p-8 text-center text-sm font-bold text-gray-400 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                            Loading active autopay...
                        </div>
                    ) : autopayPreview.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 space-y-2">
                            <p className="text-base font-black text-[#1A1A2E]">No active autopay payments</p>
                            <p className="text-sm font-bold text-gray-400">Pending and executing scheduled payments will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {autopayPreview.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate("autopay")}
                                    className="w-full flex items-center justify-between p-4 md:p-5 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group cursor-pointer text-left"
                                >
                                    <div className="flex items-center gap-5 min-w-0">
                                        {getAutopayIcon(item.status)}
                                        <div className="min-w-0">
                                            <p className="text-base font-black text-[#1A1A2E] truncate" title={item.recipient}>{shortAddress(item.recipient, 10, 8)}</p>
                                            <p className="text-xs text-gray-400 font-bold truncate">{formatDateLabel(item.scheduledTime || item.deadline)} • {item.status}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm md:text-base font-black text-[#1A1A2E] shrink-0">${formatAmountUsdc(item.amount)}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-400">Active autopay total</p>
                        <p className="text-xl font-black text-[#1A1A2E]">${monthlyAutopayTotal}</p>
                    </div>
                </section>

                <section className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">Recent Activity</h3>
                        <button
                            onClick={() => router.push("/dashboard/transactions")}
                            className="text-xs font-black text-[#FFB800] uppercase tracking-widest hover:underline"
                        >
                            View All
                        </button>
                    </div>

                    {isLoadingPreviews && recentTransactions.length === 0 ? (
                        <div className="p-8 text-center text-sm font-bold text-gray-400 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                            Loading recent transactions...
                        </div>
                    ) : recentTransactions.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 space-y-2">
                            <p className="text-base font-black text-[#1A1A2E]">No transactions yet</p>
                            <p className="text-sm font-bold text-gray-400">Completed transfers and autopay activity will show here.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {recentTransactions.map((tx) => {
                                const isIncoming = tx.to === walletAddress;
                                const counterpart = isIncoming ? tx.from : tx.to;
                                const amountText = `${isIncoming ? "+" : "-"}$${formatAmountUsdc(tx.amount)}`;
                                const label = tx.type ? tx.type.replace(/-/g, " ") : "transaction";

                                return (
                                    <button
                                        key={tx._id || tx.hash}
                                        onClick={() => router.push("/dashboard/transactions")}
                                        className="w-full flex items-center justify-between group cursor-pointer hover:bg-gray-50 -mx-6 px-4 md:px-6 py-3 rounded-[1.5rem] md:rounded-[2rem] transition-all text-left"
                                    >
                                        <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                            <div className={`w-10 h-10 md:w-14 md:h-14 ${isIncoming ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"} rounded-full flex items-center justify-center shrink-0`}>
                                                <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {isIncoming ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                    )}
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-base md:text-lg font-black text-[#1A1A2E] truncate">{shortAddress(counterpart, 10, 8)}</p>
                                                <p className="text-xs md:text-sm font-bold text-gray-400 truncate capitalize">{label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-base md:text-lg font-black ${isIncoming ? "text-emerald-500" : "text-[#1A1A2E]"}`}>{amountText}</p>
                                            <p className="text-[10px] md:text-xs font-bold text-gray-300 uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

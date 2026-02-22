"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getTransactions } from "@/services/backendservices";
import { shortAddress } from "@/lib/paymentRequest";

const formatUsdc = (amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "0.00";
    return (value / 10_000_000).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function DashboardTransactionsPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        const savedUser = sessionStorage.getItem("vaulton_user");
        if (!savedUser) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            setUser(JSON.parse(savedUser));
        } catch {
            setUser(null);
        }
    }, []);

    const walletAddress = user?.smartAccountId;

    const fetchHistory = async (address, pageNum) => {
        if (!address) {
            setTransactions([]);
            setTotalPages(1);
            return;
        }

        setLoading(true);
        try {
            const data = await getTransactions(address, pageNum, 12);
            setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
            setTotalPages(data?.pagination?.totalPages || 1);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
            setTransactions([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!walletAddress) return;
        fetchHistory(walletAddress, page);
    }, [walletAddress, page]);

    const pageLabel = useMemo(() => `Page ${page} of ${Math.max(1, totalPages)}`, [page, totalPages]);

    if (!user) {
        return (
            <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-white rounded-[2rem] border border-gray-100 shadow-lg p-8 text-center space-y-4">
                    <h1 className="text-2xl font-black text-[#1A1A2E]">Transactions</h1>
                    <p className="text-sm font-semibold text-gray-500">Please open the dashboard and log in to view your transaction history.</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="w-full py-4 bg-[#1A1A2E] text-white rounded-2xl font-black"
                    >
                        Open Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-[#1A1A2E] p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 md:p-7 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push("/dashboard")} className="p-2 text-gray-400 hover:text-[#1A1A2E]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-black truncate">All Transactions</h1>
                            <p className="text-xs md:text-sm text-gray-400 font-bold truncate">{shortAddress(walletAddress, 10, 10)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchHistory(walletAddress, page)}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl border border-gray-100 text-xs font-black text-[#FFB800] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? "Loading" : "Refresh"}
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm p-5 md:p-7 space-y-4">
                    {loading && transactions.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 font-bold">Loading transactions...</div>
                    ) : transactions.length === 0 ? (
                        <div className="py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                            <p className="font-black text-[#1A1A2E]">No transactions found</p>
                            <p className="text-sm font-semibold text-gray-400">Once you start sending or receiving USDC, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => {
                                const isOutgoing = tx.from === walletAddress;
                                const counterparty = isOutgoing ? tx.to : tx.from;
                                return (
                                    <button
                                        key={tx._id || tx.hash}
                                        onClick={() => setSelectedTransaction(tx)}
                                        className="w-full text-left p-4 md:p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-4 min-w-0">
                                            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${isOutgoing ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"}`}>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {isOutgoing ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                    )}
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm md:text-base font-black text-[#1A1A2E]">{isOutgoing ? "Sent" : "Received"} USDC</p>
                                                <p className="text-xs text-gray-400 font-mono truncate" title={counterparty}>{shortAddress(counterparty, 12, 10)}</p>
                                                <p className="text-[11px] text-gray-300 font-bold mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-base md:text-lg font-black ${isOutgoing ? "text-[#1A1A2E]" : "text-emerald-500"}`}>{isOutgoing ? "-" : "+"}${formatUsdc(tx.amount)}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{tx.type || "transaction"}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="pt-3 flex items-center justify-center gap-4">
                            <button
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={page === 1 || loading}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-bold text-gray-500">{pageLabel}</span>
                            <button
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages || loading}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedTransaction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedTransaction(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xl font-black text-[#1A1A2E]">Transaction Details</h3>
                                <button onClick={() => setSelectedTransaction(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                                    <p className={`text-2xl font-black ${selectedTransaction.from === walletAddress ? "text-[#1A1A2E]" : "text-emerald-500"}`}>
                                        {selectedTransaction.from === walletAddress ? "-" : "+"}${formatUsdc(selectedTransaction.amount)}
                                    </p>
                                    <p className="text-xs text-gray-400 font-bold mt-1">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                                </div>

                                {[
                                    ["Hash", selectedTransaction.hash],
                                    ["From", selectedTransaction.from],
                                    ["To", selectedTransaction.to],
                                    ["Type", selectedTransaction.type || "-"],
                                    ["Token", selectedTransaction.tokenSymbol || "-"],
                                    ["Memo", selectedTransaction.memo || "-"],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                                            <p className="text-xs font-mono text-[#1A1A2E] break-all flex-1">{value}</p>
                                            {typeof value === "string" && value !== "-" && (
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(value)}
                                                    className="p-1.5 text-gray-400 hover:text-[#1A1A2E]"
                                                    title={`Copy ${label}`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {selectedTransaction.hash && (
                                    <a
                                        href={`https://stellar.expert/explorer/testnet/tx/${selectedTransaction.hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full text-center bg-[#1A1A2E] text-white py-3 rounded-xl font-bold"
                                    >
                                        View on Explorer
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

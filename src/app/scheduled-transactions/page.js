"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startAuthentication } from '@simplewebauthn/browser';
import Navbar from '../components/Navbar';
import {
    getScheduledTransactions,
    createScheduledTransaction,
    cancelScheduledTransaction,
    getScheduledTransactionById,
    loginChallenge,
    getNonce,
    getUSDCBalance
} from '../../services/backendservices';


export default function ScheduledTransactionsPage() {
    // State for user session
    const [user, setUser] = useState(null);

    // Form state
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [balance, setBalance] = useState(null);

    // List state
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    // Refs for stable polling and request tracking
    const transactionsRef = useRef(transactions);
    useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
    const refreshingRef = useRef(false);

    // Timer state for countdowns
    const [now, setNow] = useState(new Date());

    // Update timer every second and trigger immediate refresh when cooldown ends
    useEffect(() => {
        const timer = setInterval(() => {
            const nextNow = new Date();
            setNow(nextNow);

            // Trigger immediate refresh when a "pending" transaction's cooldown ends
            if (user?.smartAccountId && !refreshingRef.current) {
                const hasDue = transactionsRef.current.some(tx =>
                    tx.status === 'pending' && new Date(tx.scheduledAt) <= nextNow
                );

                if (hasDue) {
                    refreshingRef.current = true;
                    fetchTransactions(user.smartAccountId, page, filterStatus, true)
                        .finally(() => { refreshingRef.current = false; });
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [user?.smartAccountId, page, filterStatus]);

    // Polling for non-terminal transactions
    useEffect(() => {
        const checkTransactions = async () => {
            if (!user?.smartAccountId) return;

            const currentTime = new Date();
            // Poll if any transaction is NOT in a terminal state AND (it's already processing OR its time has come)
            const activeTxs = transactionsRef.current.filter(tx => {
                const isTerminal = ['success', 'failed', 'cancelled'].includes(tx.status);
                const isDue = new Date(tx.scheduledAt) <= currentTime;
                // If not terminal and (either it's past its time or it's already in a special state like 'processing')
                return !isTerminal && (tx.status !== 'pending' || isDue);
            });

            if (activeTxs.length === 0) return;

            // Use silent refresh to update the list without showing loaders
            fetchTransactions(user.smartAccountId, page, filterStatus, true);
        };

        // Run once immediately if there are active transactions
        checkTransactions();

        const pollTimer = setInterval(checkTransactions, 10000); // Poll every 10s as requested
        return () => clearInterval(pollTimer);
    }, [user?.smartAccountId, page, filterStatus]); // Stable interval relative to filters/user

    // Load user on mount
    useEffect(() => {
        const savedUser = sessionStorage.getItem('vaulton_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            fetchTransactions(parsedUser.smartAccountId, 1, filterStatus);
            fetchBalance(parsedUser.smartAccountId);
        }
    }, []);

    const fetchBalance = async (smartAccountId) => {
        if (!smartAccountId) return;
        try {
            const data = await getUSDCBalance(smartAccountId);
            if (!data.error) {
                setBalance(data.balanceInUsdc);
            }
        } catch (error) {
            console.error("Failed to fetch balance", error);
        }
    };

    const activeCount = transactions.filter(tx => !['success', 'failed', 'cancelled'].includes(tx.status)).length;

    const fetchTransactions = async (smartAccountId, targetPage = 1, targetStatus = 'all', isSilent = false) => {
        if (!smartAccountId) return;
        if (!isSilent) setIsLoading(true);
        try {
            const params = {
                userId: smartAccountId,
                page: targetPage,
                limit: 50
            };
            if (targetStatus !== 'all') {
                params.status = targetStatus;
            }
            const data = await getScheduledTransactions(params);
            if (data.scheduledTransactions) {
                const sorted = data.scheduledTransactions.sort((a, b) =>
                    new Date(b.scheduledAt) - new Date(a.scheduledAt)
                );

                // Only update if there's an actual change to avoid unnecessary re-renders
                // (Though React handles this mostly, deep comparison would be better, but simple ref update is fine)
                setTransactions(sorted);

                if (data.pagination) {
                    setPage(data.pagination.page);
                    setTotalPages(data.pagination.totalPages);
                }

                // If any transaction just finished successfully, refresh balance
                const hasNewSuccess = sorted.some(tx => tx.status === 'success') &&
                    !transactionsRef.current.some(tx => tx.status === 'success');
                if (hasNewSuccess) fetchBalance(smartAccountId);
            }
        } catch (error) {
            console.error("Failed to fetch scheduled transactions:", error);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    const handleFilterChange = (status) => {
        setFilterStatus(status);
        if (user?.smartAccountId) {
            fetchTransactions(user.smartAccountId, 1, status);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user || !user.smartAccountId) {
            alert("Please login first");
            return;
        }

        if (recipient.trim() === user.smartAccountId) {
            alert("Recipient address cannot be your own address.");
            setIsSubmitting(false);
            return;
        }

        if (activeCount > 0) {
            alert("You cannot add a new autopay transaction until your last one is completed (Success, Failed, or Cancelled).");
            setIsSubmitting(false);
            return;
        }

        if (new Date(scheduledDate) <= new Date()) {
            alert("Please select a future date and time for the autopay.");
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Get Nonce
            const nonceData = await getNonce(user.smartAccountId);
            if (nonceData.error) throw new Error(nonceData.error);

            // 2. Build Challenge (USDC transfer specific)
            // Amount to stroops (x 10^7)
            const amtStroops = Math.floor(parseFloat(amount) * 10000000);

            const amountBigInt = BigInt(amtStroops);
            const amountBytes = new Uint8Array(16);
            for (let i = 0; i < 16; i++) amountBytes[i] = Number((amountBigInt >> BigInt(i * 8)) & 0xffn);

            const nonceBigInt = BigInt(nonceData.nonce);
            const nonceBytes = new Uint8Array(8);
            for (let i = 0; i < 8; i++) nonceBytes[i] = Number((nonceBigInt >> BigInt(i * 8)) & 0xffn);

            const functionName = new TextEncoder().encode('transfer_usdc');
            // Check matching hashing logic with backend/contract
            const challengeData = new Uint8Array(functionName.length + 16 + 8);
            challengeData.set(functionName, 0);
            challengeData.set(amountBytes, functionName.length);
            challengeData.set(nonceBytes, functionName.length + 16);

            const challengeHash = await crypto.subtle.digest('SHA-256', challengeData);
            const challenge = btoa(String.fromCharCode(...new Uint8Array(challengeHash)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            // 3. Get Auth Options with specific challenge
            const authOptions = await loginChallenge();
            authOptions.options.challenge = challenge;

            // 4. Sign with Passkey
            const credential = await startAuthentication(authOptions.options);

            // 5. Helper to convert sig formats
            const base64UrlToBytes = (b64) => {
                const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
                return new Uint8Array([...atob(padded)].map(c => c.charCodeAt(0)));
            };

            const bytesToHex = (bytes) => {
                return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
            };

            const derToRs = (der) => {
                let offset = 2;
                if (der[offset++] !== 0x02) throw new Error('Invalid DER');
                let rLen = der[offset++];
                let r = der.slice(offset, offset + rLen);
                offset += rLen;
                if (r[0] === 0 && r.length > 32) r = r.slice(1);
                while (r.length < 32) r = new Uint8Array([0, ...r]);
                r = r.slice(-32);

                if (der[offset++] !== 0x02) throw new Error('Invalid DER');
                let sLen = der[offset++];
                let s = der.slice(offset, offset + sLen);
                if (s[0] === 0 && s.length > 32) s = s.slice(1);
                while (s.length < 32) s = new Uint8Array([0, ...s]);
                s = s.slice(-32);

                // Normalize S (Low-S check for secp256r1)
                const n = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
                const halfN = n / 2n;
                let sBig = 0n;
                for (const byte of s) sBig = (sBig << 8n) + BigInt(byte);
                if (sBig > halfN) {
                    sBig = n - sBig;
                    for (let i = 0; i < 32; i++) s[31 - i] = Number((sBig >> (BigInt(i) * 8n)) & 0xFFn);
                }

                const rs = new Uint8Array(64);
                rs.set(r, 0);
                rs.set(s, 32);
                return rs;
            };

            const sigBytes = base64UrlToBytes(credential.response.signature);
            const rsSignature = derToRs(sigBytes);
            const signatureHex = bytesToHex(rsSignature);

            // 6. Send to Backend
            const result = await createScheduledTransaction({
                childId: user.smartAccountId,
                recipient,
                amount: amtStroops.toString(),
                signatureHex,
                authData: credential.response.authenticatorData,
                clientDataJSON: credential.response.clientDataJSON,
                scheduledAt: new Date(scheduledDate).toISOString(),
                token: 'USDC'
            });

            if (result.success) {
                alert("Transaction Scheduled Successfully!");
                setRecipient('');
                setAmount('');
                setScheduledDate('');
                fetchTransactions(user.smartAccountId);
            } else {
                alert("Failed: " + result.error);
            }

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (txId) => {
        if (!confirm("Are you sure you want to cancel this scheduled transaction?")) return;
        try {
            const result = await cancelScheduledTransaction(txId);
            if (result.success) {
                alert("Transaction Cancelled");
                if (user?.smartAccountId) fetchTransactions(user.smartAccountId);
            } else {
                alert("Failed to cancel: " + result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Error cancelling transaction");
        }
    };

    const calculateTimeLeft = (targetDate) => {
        const diff = new Date(targetDate) - now;
        if (diff <= 0) return null; // Time is up!

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
    };

    // Helper to get Explorer Link
    const getExplorerLink = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

    return (
        <main className="min-h-screen bg-[#FAFAFA] pb-20">
            <Navbar />

            <div className="pt-32 px-6 lg:px-12 max-w-7xl mx-auto">
                {/* Coming Soon Banner */}
                <div className="mb-8 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 p-2 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                        <p className="font-medium">Recurring autopay transaction will be coming soon!</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight mb-2">
                            Autopay
                        </h1>
                        <p className="text-gray-500 text-lg">Schedule your recurring payments securely.</p>
                    </div>

                    {/* Pending Counter Badge */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending</p>
                            <p className="text-2xl font-black text-[#1A1A2E]">{activeCount}</p>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column: Create Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-100/50 border border-gray-100 sticky top-28">
                            <h2 className="text-xl font-bold text-[#1A1A2E] mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Schedule
                            </h2>

                            {!user ? (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 mb-4">Connect wallet to schedule payments</p>
                                </div>
                            ) : (
                                <form onSubmit={handleCreate} className="space-y-5">
                                    {activeCount > 0 && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                                            <div className="flex gap-3">
                                                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <p className="text-sm text-amber-700 leading-relaxed font-medium">
                                                    You can't add a new autopay transaction until your last one is either Success, Failed, or Cancelled.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Recipient Address</label>
                                        <input
                                            type="text"
                                            required
                                            disabled={activeCount > 0}
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            placeholder="G..."
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm disabled:opacity-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Amount (USDC)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            disabled={activeCount > 0}
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm disabled:opacity-50"
                                        />
                                        <div className="flex justify-between mt-1 px-1">
                                            <p className="text-[11px] text-gray-400">Available Balance:</p>
                                            <p className="text-[11px] font-bold text-indigo-600">
                                                {balance !== null ? `${balance} USDC` : '0.00 USDC'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Schedule Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            disabled={activeCount > 0}
                                            min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm disabled:opacity-50"
                                        />
                                        <p className="text-xs text-gray-400 mt-2">
                                            Transaction will be executed automatically at this time.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || activeCount > 0}
                                        className="w-full py-4 bg-[#1A1A2E] text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isSubmitting ? 'Signing...' : (activeCount > 0 ? 'Pending Request Active' : 'Schedule Payment')}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Right Column: List & Filters */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Filter Tabs & Refresh */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {['all', 'pending', 'success', 'failed', 'cancelled'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleFilterChange(status)}
                                        className={`px-5 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all cursor-pointer ${filterStatus === status
                                            ? 'bg-[#1A1A2E] text-white shadow-lg'
                                            : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => user?.smartAccountId && fetchTransactions(user.smartAccountId, page, filterStatus)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#1A1A2E] shrink-0 cursor-pointer"
                                disabled={isLoading}
                                title="Refresh Schedules"
                            >
                                <motion.svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    animate={isLoading ? { rotate: 720 } : { rotate: 0 }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </motion.svg>
                            </button>
                        </div>

                        {/* Transactions List - Scrollable Container */}
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {isLoading ? (
                                <div className="text-center py-20 text-gray-400">Loading schedules...</div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-400 font-medium">No scheduled transactions found</p>
                                </div>
                            ) : (
                                <>
                                    <AnimatePresence>
                                        {transactions.map((tx) => (
                                            <motion.div
                                                key={tx._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                                    {/* Left: Icon & Details */}
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.status === 'success' ? 'bg-green-50 text-green-600' :
                                                            tx.status === 'failed' ? 'bg-red-50 text-red-600' :
                                                                tx.status === 'cancelled' ? 'bg-gray-100 text-gray-400' :
                                                                    'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {tx.status === 'success' ? (
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            ) : tx.status === 'failed' || tx.status === 'cancelled' ? (
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            ) : (
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h3 className="font-bold text-[#1A1A2E] text-lg">
                                                                {(parseInt(tx.amount) / 10000000).toFixed(2)} {tx.token}
                                                            </h3>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="font-medium text-gray-400">To:</span>
                                                                    <span className="font-mono bg-gray-50 px-1.5 rounded text-gray-600">
                                                                        {tx.recipient.substring(0, 6)}...{tx.recipient.substring(tx.recipient.length - 4)}
                                                                    </span>
                                                                </span>
                                                                <span className="hidden sm:block text-gray-300">•</span>
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                    {new Date(tx.scheduledAt).toLocaleString()}
                                                                </span>
                                                            </div>

                                                            {tx.status === 'pending' && (
                                                                calculateTimeLeft(tx.scheduledAt) ? (
                                                                    <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                                                        <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        Executes in: {calculateTimeLeft(tx.scheduledAt)}
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md animate-pulse">
                                                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                        Processing Transaction...
                                                                    </div>
                                                                )
                                                            )}

                                                            {/* Transaction Hash & Explorer Link */}
                                                            {tx.txHash && (
                                                                <div className="mt-2">
                                                                    <a
                                                                        href={getExplorerLink(tx.txHash)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-indigo-600 underline decoration-gray-300 hover:decoration-indigo-600 underline-offset-2 transition-all"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                        View on Explorer: {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 8)}
                                                                    </a>
                                                                </div>
                                                            )}

                                                            {user && tx.remarks && !tx.txHash && (
                                                                <p className="text-xs text-gray-400 mt-2 max-w-md break-all">
                                                                    {tx.remarks}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Status & Action */}
                                                    <div className="flex items-center gap-4 self-end md:self-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${tx.status === 'success' ? 'bg-green-50 text-green-600 border-green-100' :
                                                            tx.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                tx.status === 'cancelled' ? 'bg-gray-50 text-gray-400 border-gray-100' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                            }`}>
                                                            {tx.status === 'pending' && !calculateTimeLeft(tx.scheduledAt) ? (
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                    Sending...
                                                                </span>
                                                            ) : tx.status}
                                                        </span>

                                                        {tx.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleCancel(tx._id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg group-hover:opacity-100 md:opacity-0 transition-opacity cursor-pointer"
                                                                title="Cancel Schedule"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => fetchTransactions(user.smartAccountId, page - 1, filterStatus)}
                                                disabled={page === 1 || isLoading}
                                                className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                Previous
                                            </button>
                                            <div className="text-sm font-bold text-gray-500">
                                                Page <span className="text-[#1A1A2E]">{page}</span> of {totalPages}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fetchTransactions(user.smartAccountId, page + 1, filterStatus)}
                                                disabled={page === totalPages || isLoading}
                                                className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

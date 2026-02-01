"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import { startAuthentication } from '@simplewebauthn/browser';
import { getNonce, loginChallenge, transferUSDC, getTransactions, getUSDCBalance } from "@/services/backendservices";

// --- Crypto Helper Functions (Ported from index.html) ---

function base64UrlToBytes(b64) {
    const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return new Uint8Array([...atob(padded)].map(c => c.charCodeAt(0)));
}

function bytesToHex(bytes) {
    return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

function derToRs(der) {
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
    for (const byte of s) {
        sBig = (sBig << 8n) + BigInt(byte);
    }

    if (sBig > halfN) {
        console.log('Normalizing signature s value to low-S form');
        sBig = n - sBig;
        for (let i = 0; i < 32; i++) {
            s[31 - i] = Number((sBig >> (BigInt(i) * 8n)) & 0xFFn);
        }
    }

    const rs = new Uint8Array(64);
    rs.set(r, 0);
    rs.set(s, 32);
    return rs;
}

export default function TransactionsPage() {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('send');

    // Send State
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("0");
    const [status, setStatus] = useState({ type: "", message: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [balance, setBalance] = useState(null);

    // History State
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        // Polling loop to detect user changes if Navbar updates local storage without page reload
        // Or just basic hydration.
        const checkUser = () => {
            const savedUser = sessionStorage.getItem('vaulton_user');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                if (!user || user.userId !== parsed.userId) {
                    setUser(parsed);
                    fetchBalance(parsed.smartAccountId);
                }
            } else if (user) {
                // User logged out
                setUser(null);
                setTransactions([]);
                setPage(1);
                setStatus({ type: "error", message: "Please login to access transactions." });
                setBalance(null);
            }
        };

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

        checkUser();
        // Set an interval to check for login state changes (from Navbar)
        const interval = setInterval(checkUser, 1000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (activeTab === 'history') {
            if (user && user.smartAccountId) {
                fetchHistory(user.smartAccountId, page);
            } else {
                setTransactions([]);
            }
        }
    }, [activeTab, user, page]);

    const fetchHistory = async (address, pageNum) => {
        setLoadingHistory(true);
        try {
            const data = await getTransactions(address, pageNum);
            setTransactions(data.transactions);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();

        if (!user || !user.smartAccountId) {
            setStatus({ type: "error", message: "No smart account found. Please register/login first." });
            return;
        }

        if (recipient.trim() === user.smartAccountId) {
            setStatus({ type: "error", message: "Recipient address cannot be your own address." });
            return;
        }

        setIsLoading(true);
        setStatus({ type: "info", message: "Initiating transfer..." });
        setTxHash(null);

        try {
            // 1. Get Nonce
            setStatus({ type: "info", message: "Fetching nonce..." });
            const nonceData = await getNonce(user.smartAccountId);
            if (!nonceData.nonce) {
                throw new Error("Failed to fetch nonce");
            }
            const nonce = nonceData.nonce;

            // 2. Build Challenge
            // Amount in stroops (1 USDC = 10,000,000 stroops)
            const amountInStroops = BigInt(Math.floor(parseFloat(amount) * 10_000_000));

            const amountBytes = new Uint8Array(16);
            for (let i = 0; i < 16; i++) {
                amountBytes[i] = Number((amountInStroops >> BigInt(i * 8)) & 0xffn);
            }

            const nonceBigInt = BigInt(nonce);
            const nonceBytes = new Uint8Array(8);
            for (let i = 0; i < 8; i++) {
                nonceBytes[i] = Number((nonceBigInt >> BigInt(i * 8)) & 0xffn);
            }

            const functionName = new TextEncoder().encode('transfer_usdc');
            const challengeData = new Uint8Array(functionName.length + 16 + 8);
            challengeData.set(functionName, 0);
            challengeData.set(amountBytes, functionName.length);
            challengeData.set(nonceBytes, functionName.length + 16);

            // SHA-256 Hash
            const challengeHash = await crypto.subtle.digest('SHA-256', challengeData);
            const challengeBase64 = btoa(String.fromCharCode(...new Uint8Array(challengeHash)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            // 3. Authenticate (Sign)
            setStatus({ type: "info", message: "Please sign with your passkey..." });

            const loginOpts = await loginChallenge();
            const options = loginOpts.options;
            options.challenge = challengeBase64;

            const credential = await startAuthentication(options);

            // 4. Process Signature
            const sigBytes = base64UrlToBytes(credential.response.signature);
            const rsSignature = derToRs(sigBytes);
            const signatureHex = bytesToHex(rsSignature);

            // 5. Submit Transfer
            setStatus({ type: "info", message: "Submitting transaction..." });
            const transferRes = await transferUSDC({
                childId: user.smartAccountId,
                recipient,
                amount: amountInStroops.toString(),
                signatureHex,
                authData: credential.response.authenticatorData,
                clientDataJSON: credential.response.clientDataJSON,
            });

            if (transferRes.status === 'SUCCESS') {
                setTxHash(transferRes.txHash);
                setStatus({
                    type: "success",
                    message: "Transfer Successful!"
                });
                setAmount("0");
                setRecipient("");
                await getNonce(user.smartAccountId);
                // Refresh history if already on tab? Or let user switch to it.
            } else {
                setStatus({
                    type: "error",
                    message: `Transfer Failed: ${JSON.stringify(transferRes.error || transferRes)}`
                });
            }

        } catch (error) {
            console.error("Transfer error:", error);
            setStatus({ type: "error", message: error.message || "Transaction failed" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <Navbar />

            <main className="pt-32 pb-20 px-6 lg:px-12 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 border border-gray-100 min-h-[600px]">
                    <h1 className="text-3xl lg:text-4xl font-black text-[#1A1A2E] mb-6">Transactions</h1>

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('send')}
                            className={`pb-4 px-2 font-bold text-lg transition-colors relative cursor-pointer ${activeTab === 'send' ? 'text-[#1A1A2E]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Send USDC
                            {activeTab === 'send' && <span className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1A2E] rounded-t-full"></span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`pb-4 px-2 font-bold text-lg transition-colors relative cursor-pointer ${activeTab === 'history' ? 'text-[#1A1A2E]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            History
                            {activeTab === 'history' && <span className="absolute bottom-0 left-0 w-full h-1 bg-[#1A1A2E] rounded-t-full"></span>}
                        </button>
                    </div>

                    {/* Send Tab Content */}
                    {/* Send Tab Content */}
                    {activeTab === 'send' && (
                        <div>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 mb-6 flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm">Gasless Transactions</h4>
                                    <p className="text-sm text-blue-700 mt-1">
                                        You don't need any XLM tokens for gas fees. All transaction costs are covered by the paymaster.
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-500 mb-8">Securely transfer funds using your biometric passkey.</p>

                            <form onSubmit={handleTransfer} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[#1A1A2E] mb-2">
                                        Recipient Address
                                    </label>
                                    <input
                                        type="text"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        placeholder="G..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800] outline-none transition-all bg-[#F8F8F8]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#1A1A2E] mb-2">
                                        Amount (USDC)
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.0000001"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800] outline-none transition-all bg-[#F8F8F8] font-mono"
                                            required
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">
                                            USDC
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-1 px-1">
                                        <p className="text-[11px] text-gray-400">Available Balance:</p>
                                        <p className="text-[11px] font-bold text-indigo-600">
                                            {balance !== null ? `${balance} USDC` : '0.00 USDC'}
                                        </p>
                                    </div>
                                </div>

                                {status.message && (
                                    <div className={`p-4 rounded-xl text-sm font-medium ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
                                        status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' :
                                            'bg-blue-50 text-blue-600 border border-blue-100'
                                        }`}>
                                        {status.message}
                                        {status.type === 'success' && txHash && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-green-200">
                                                    <span className="font-mono text-xs text-green-800 truncate flex-1" title={txHash}>
                                                        {txHash}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(txHash);
                                                            setIsCopied(true);
                                                            setTimeout(() => setIsCopied(false), 2000);
                                                        }}
                                                        className="text-xs font-bold text-green-700 hover:text-green-900 bg-green-100 px-2 py-1 rounded transition-colors"
                                                    >
                                                        {isCopied ? 'Copied!' : 'Copy'}
                                                    </button>
                                                </div>
                                                <a
                                                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-center font-semibold text-green-700 hover:text-green-900 hover:underline flex items-center justify-center gap-1"
                                                >
                                                    View on Explorer
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !user}
                                    className="w-full bg-[#1A1A2E] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#2A2A4E] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.99] cursor-pointer"
                                >
                                    {isLoading ? 'Processing...' : 'Sign & Transfer'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* History Tab Content */}
                    {
                        activeTab === 'history' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-gray-500">Your recent transaction activity.</p>
                                    <button
                                        onClick={() => user?.smartAccountId && fetchHistory(user.smartAccountId, page)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-[#1A1A2E] cursor-pointer"
                                        title="Refresh"
                                        disabled={loadingHistory}
                                    >
                                        <motion.svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            animate={loadingHistory ? { rotate: 720 } : { rotate: 0 }}
                                            transition={{ duration: 0.8, ease: "easeInOut" }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </motion.svg>
                                    </button>
                                </div>

                                {loadingHistory && transactions.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">Loading transactions...</div>
                                ) : transactions.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        No transactions found.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {transactions.map((tx) => {
                                            const isOut = tx.from === user?.smartAccountId;
                                            // Amount in backend is string stroops, convert to USDC
                                            const amountUSDC = (Number(tx.amount) / 10_000_000).toFixed(2);

                                            return (
                                                <div
                                                    key={tx._id || tx.hash}
                                                    onClick={() => setSelectedTransaction(tx)}
                                                    className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full ${isOut ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                {isOut ? (
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" className="rotate-45 origin-center" />
                                                                ) : (
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" className="rotate-45 origin-center" />
                                                                )}
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-[#1A1A2E]">
                                                                {isOut ? 'Sent USDC' : 'Received USDC'}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {new Date(tx.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col md:items-end gap-1">
                                                        <p className={`font-mono font-bold ${isOut ? 'text-red-500' : 'text-green-500'}`}>
                                                            {isOut ? '-' : '+'}{amountUSDC} USDC
                                                        </p>
                                                        <a
                                                            href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-500 hover:underline truncate max-w-[120px] md:max-w-[200px]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {tx.hash.substring(0, 12)}...
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-4 mt-8">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1 || loadingHistory}
                                            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm font-medium text-gray-600">
                                            Page {page} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages || loadingHistory}
                                            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >
            </main >

            {/* Transaction Detail Modal */}
            {
                selectedTransaction && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
                        onClick={() => setSelectedTransaction(null)}
                    >
                        <div
                            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[#1A1A2E]">Transaction Details</h3>
                                <button
                                    onClick={() => setSelectedTransaction(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl mb-2">
                                    <span className={`text-2xl font-black mb-1 ${selectedTransaction.from === user?.smartAccountId ? 'text-red-500' : 'text-green-500'}`}>
                                        {selectedTransaction.from === user?.smartAccountId ? '-' : '+'}
                                        {(Number(selectedTransaction.amount) / 10_000_000).toFixed(2)} USDC
                                    </span>
                                    <span className="text-sm text-gray-400 font-medium">
                                        {new Date(selectedTransaction.createdAt).toLocaleString()}
                                    </span>
                                </div>

                                <div className="space-y-4 text-sm">
                                    <div className="group">
                                        <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">Transaction Hash</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-mono text-gray-700 bg-gray-50 p-2 rounded-lg break-all text-xs flex-1 border border-gray-100">
                                                {selectedTransaction.hash}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedTransaction.hash);
                                                    // Could add a toast or temporary icon change here if desired
                                                }}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Copy Hash"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">From</p>
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <p className="font-mono text-xs text-gray-800 truncate flex-1" title={selectedTransaction.from}>
                                                    {selectedTransaction.from}
                                                </p>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(selectedTransaction.from)}
                                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                                    title="Copy Address"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">To</p>
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <p className="font-mono text-xs text-gray-800 truncate flex-1" title={selectedTransaction.to}>
                                                    {selectedTransaction.to}
                                                </p>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(selectedTransaction.to)}
                                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                                    title="Copy Address"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTransaction.memo && (
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">Memo</p>
                                            <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                {selectedTransaction.memo}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">Token</p>
                                        <p className="font-mono text-sm text-gray-800">
                                            {selectedTransaction.tokenSymbol}
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${selectedTransaction.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center bg-[#1A1A2E] text-white py-3 rounded-xl font-bold hover:bg-[#2A2A4E] transition-all shadow-lg hover:shadow-xl active:scale-[0.99]"
                                >
                                    View on Explorer
                                </a>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
    registerChallenge,
    verifyRegister,
    loginChallenge,
    verifyLogin,
    getUserInfo,
    getUSDCBalance,
    deploySmartAccount
} from "../../services/backendservices";

const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID;
const WASM_HASH = process.env.NEXT_PUBLIC_WASM_HASH;

export default function Navbar() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

    // Auth State
    const [user, setUser] = useState(null); // { userId, smartAccountId, ... }
    const [balance, setBalance] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        // Load state from local storage on mount
        const savedUser = sessionStorage.getItem('vaulton_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            if (parsedUser.smartAccountId) {
                fetchBalance(parsedUser.smartAccountId);
            }
        }
    }, []);

    const navLinks = [
        { name: "Transactions", href: "/transactions" },
        { name: "Autopay", href: "/scheduled-transactions" },
        { name: "FAQ", href: "/faq" },
        { name: "About", href: "/about" },
        { name: "Support", href: "/support" },
    ];

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleLinkClick = (href) => {
        setIsMenuOpen(false);
        router.push(href);
    };

    const fetchBalance = async (childId) => {
        if (!childId) return;
        setIsRefreshingBalance(true);
        try {
            const data = await getUSDCBalance(childId);
            if (!data.error) {
                setBalance(data.balanceInUsdc);
            }
        } catch (error) {
            console.error("Failed to fetch balance", error);
        } finally {
            setIsRefreshingBalance(false);
        }
    };

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            // 1. Get Challenge
            const challengeData = await registerChallenge();
            if (challengeData.tempUserId) {
                sessionStorage.setItem('tempUserId', challengeData.tempUserId);
            }

            // 2. WebAuthn Registration
            const credential = await startRegistration(challengeData.options);

            // 3. Verify Registration
            const tempUserId = sessionStorage.getItem('tempUserId');
            const verifyData = await verifyRegister(credential, tempUserId);

            if (verifyData.verified) {
                sessionStorage.removeItem('tempUserId');

                // 4. Update UI State & Deploy Smart Account (Simplified Flow)
                // In a real app, we might ask user to click "Deploy" separately, 
                // but checking connection/deploying if needed is good UX.

                // Get additional user info to see if account exists (it shouldn't for new reg, but good practice)
                const userInfo = await getUserInfo(verifyData.userId);

                let smartAccountId = userInfo.smartAccountId;
                let passkeyPubkey = userInfo.passkeyPubkey;

                // Extract pubkey from credential if not in userInfo (it should be though)
                if (!passkeyPubkey && credential.response.getPublicKey) {
                    const pubKeyBuffer = credential.response.getPublicKey();
                    if (pubKeyBuffer) {
                        const pubKey = new Uint8Array(pubKeyBuffer);
                        if (pubKey.length >= 65) {
                            const rawKey = pubKey.slice(-65);
                            passkeyPubkey = btoa(String.fromCharCode(...rawKey));
                        }
                    }
                }

                // Deploy if not exists
                if (!smartAccountId && passkeyPubkey) {
                    try {
                        console.log("Deploying smart account...");
                        const deployRes = await deploySmartAccount(
                            FACTORY_ID,
                            WASM_HASH,
                            credential.id,
                            passkeyPubkey,
                            verifyData.userId
                        );
                        if (deployRes.childId || deployRes.existingChildId) {
                            smartAccountId = deployRes.childId || deployRes.existingChildId;
                        }
                    } catch (deployErr) {
                        console.error("Auto-deploy failed", deployErr);
                    }
                }

                const newUser = {
                    userId: verifyData.userId,
                    smartAccountId,
                    passkeyPubkey
                };

                setUser(newUser);
                sessionStorage.setItem('vaulton_user', JSON.stringify(newUser));

                if (smartAccountId) {
                    fetchBalance(smartAccountId);
                }
            }
        } catch (error) {
            console.error("Registration error:", error);
            alert("Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            // 1. Get Challenge
            const challengeData = await loginChallenge();

            // 2. WebAuthn Authentication
            const credential = await startAuthentication(challengeData.options);

            // 3. Verify Login
            const verifyData = await verifyLogin(credential, challengeData.challengeId);

            if (verifyData.success) {
                // 4. Get User Info
                const userInfo = await getUserInfo(verifyData.userId);

                const loggedInUser = {
                    userId: userInfo.userId,
                    smartAccountId: userInfo.smartAccountId,
                    passkeyPubkey: userInfo.passkeyPubkey,
                    name: userInfo.name // If they have a set name
                };

                setUser(loggedInUser);
                sessionStorage.setItem('vaulton_user', JSON.stringify(loggedInUser));

                if (loggedInUser.smartAccountId) {
                    fetchBalance(loggedInUser.smartAccountId);
                }
            } else {
                alert("Login failed or no account found.");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setBalance(null);
        sessionStorage.removeItem('vaulton_user');
        setIsDropdownOpen(false);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex justify-center">
            <div className="w-full max-w-7xl px-6 lg:px-12">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleLinkClick("/")}>
                        <Image
                            src="/logo.png"
                            alt="Vaulton Logo"
                            width={180}
                            height={60}
                            className="h-30 md:h-40 lg:h-40 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300"
                            priority
                        />
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <button
                                key={link.name}
                                onClick={() => handleLinkClick(link.href)}
                                className="relative text-gray-600 hover:text-[#1A1A2E] font-medium transition-colors duration-300 group cursor-pointer"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1A1A2E] group-hover:w-full transition-all duration-300"></span>
                            </button>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4 text-[#1A1A2E] font-medium relative">
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    {user.name || user.userId.substring(0, 12)}...
                                    <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50"
                                        >
                                            <div className="flex flex-col gap-3">
                                                {/* Wallet Address Section */}
                                                <div className="p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-mono text-[#1A1A2E] truncate max-w-[180px]" title={user.smartAccountId}>
                                                            {user.smartAccountId ? user.smartAccountId : 'Deploying...'}
                                                        </p>
                                                        {user.smartAccountId && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(user.smartAccountId);
                                                                }}
                                                                className="text-gray-400 hover:text-[#1A1A2E] transition-colors cursor-pointer"
                                                                title="Copy Address"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-lg font-bold text-[#1A1A2E]">
                                                            {balance !== null ? `${balance} USDC` : '0.00 USDC'}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (user.smartAccountId) fetchBalance(user.smartAccountId);
                                                            }}
                                                            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                                                            title="Refresh Balance"
                                                            disabled={isRefreshingBalance}
                                                        >
                                                            <motion.svg
                                                                className="w-4 h-4 text-gray-600"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                animate={isRefreshingBalance ? { rotate: 720 } : { rotate: 0 }}
                                                                transition={{ duration: 0.8, ease: "easeInOut" }}
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </motion.svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleLogin}
                                    disabled={isLoading}
                                    className="relative cursor-pointer transition-all duration-300 group overflow-hidden disabled:opacity-50"
                                >
                                    <span className="relative z-10 text-[#1A1A2E] group-hover:text-[#4A4A6E] transition-colors duration-300">
                                        {isLoading ? 'Loading...' : 'Smart Account?'}
                                    </span>
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#1A1A2E] to-[#4A4A6E] transform origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"></span>
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#4A4A6E] to-[#1A1A2E] transform origin-right scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
                                </button>
                                <button
                                    onClick={handleRegister}
                                    disabled={isLoading}
                                    className="relative px-5 py-2 cursor-pointer font-semibold rounded-full overflow-hidden group bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="relative z-10">{isLoading ? 'Processing...' : 'Create one!'}</span>
                                    <span className="absolute inset-0 bg-gradient-to-r from-[#3A3A5E] to-[#1A1A2E] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleMenu}
                            className="text-[#1A1A2E] p-2 focus:outline-none"
                            aria-label="Toggle Menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Content */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="md:hidden overflow-hidden bg-white border-t border-gray-100"
                        >
                            <div className="flex flex-col py-6 gap-6">
                                {navLinks.map((link) => (
                                    <button
                                        key={link.name}
                                        onClick={() => handleLinkClick(link.href)}
                                        className="text-left text-lg text-gray-600 hover:text-[#1A1A2E] font-medium transition-colors duration-300 cursor-pointer"
                                    >
                                        {link.name}
                                    </button>
                                ))}
                                <div className="flex flex-col gap-4 pt-4 border-t border-gray-50">
                                    {user ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="text-[#1A1A2E] font-bold">
                                                {user.name || 'User'}
                                            </div>
                                            <div className="flex flex-col gap-1 bg-gray-50 p-3 rounded-lg">
                                                <span className="text-xs text-gray-500">Wallet Address</span>
                                                <span className="text-xs font-mono text-[#1A1A2E] break-all">{user.smartAccountId || 'Deploying...'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                <span className="text-gray-600">Balance:</span>
                                                <span className="font-bold text-[#1A1A2E]">{balance || '0'} USDC</span>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="text-left text-red-500 font-medium cursor-pointer"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { handleLogin(); toggleMenu(); }}
                                                className="text-left text-[#1A1A2E] font-medium cursor-pointer"
                                            >
                                                Smart Account?
                                            </button>
                                            <button
                                                onClick={() => { handleRegister(); toggleMenu(); }}
                                                className="w-full py-3 bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E] text-white rounded-xl font-semibold shadow-md active:scale-95 transition-transform cursor-pointer"
                                            >
                                                Create one!
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}

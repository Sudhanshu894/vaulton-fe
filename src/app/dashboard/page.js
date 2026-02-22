"use client";

import { useState } from "react";
import AppHeader from "../components/app/AppHeader";
import AppBottomBar from "../components/app/AppBottomBar";
import AppSidebar from "../components/app/AppSidebar";
import DashboardHome from "../components/app/DashboardHome";
import SendScreen from "../components/app/SendScreen";
import ReceiveScreen from "../components/app/ReceiveScreen";
import AddonsScreen from "../components/app/AddonsScreen";
import AutopayHub from "../components/app/AutopayHub";
import ProfileHub from "../components/app/ProfileHub";
import WelcomeAuth from "../components/app/WelcomeAuth";
import AnonymousPaymentHub from "../components/app/AnonymousPaymentHub";
import { useEffect } from "react";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
    registerChallenge,
    verifyRegister,
    loginChallenge,
    verifyLogin,
    getUserInfo,
    deploySmartAccount,
    getUSDCBalance
} from "@/services/backendservices";
import { getDashboardSendPrefill } from "@/lib/paymentRequest";

const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID;
const WASM_HASH = process.env.NEXT_PUBLIC_WASM_HASH;

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState("home");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [balance, setBalance] = useState("0.00");
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [sendPrefill, setSendPrefill] = useState(null);

    useEffect(() => {
        const applyPrefillFromUrl = () => {
            const parsedPrefill = getDashboardSendPrefill(new URLSearchParams(window.location.search));
            setSendPrefill(parsedPrefill);
            if (parsedPrefill?.tab === "send") {
                setActiveTab("send");
            } else if (parsedPrefill?.tab === "home") {
                setActiveTab("home");
            }
        };

        applyPrefillFromUrl();

        const savedUser = sessionStorage.getItem('vaulton_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            if (parsedUser.smartAccountId) {
                fetchBalance(parsedUser.smartAccountId);
            }
        }
        setIsAuthLoading(false);
        window.addEventListener("popstate", applyPrefillFromUrl);
        return () => {
            window.removeEventListener("popstate", applyPrefillFromUrl);
        };
    }, []);

    const fetchBalance = async (childId) => {
        try {
            const data = await getUSDCBalance(childId);
            if (data.balanceInUsdc) {
                setBalance(data.balanceInUsdc);
            }
        } catch (error) {
            console.error("Failed to fetch balance:", error);
        }
    };

    const handleRegister = async () => {
        setIsLoading(true);
        console.log("REGISTER: Starting registration flow...");
        try {
            // STEP 1: Registration Challenge
            const challengeData = await registerChallenge();
            console.log("REGISTER: Challenge data received:", challengeData);

            // STEP 2: Browser Registration
            const credential = await startRegistration(challengeData.options);
            console.log("REGISTER: Browser credential created:", credential);

            // STEP 3: Verify Registration
            const verifyData = await verifyRegister(credential);
            console.log("REGISTER: Verification response:", verifyData);

            if (verifyData.success || verifyData.verified) {
                const userId = verifyData.userId;

                // STEP 4: Fetch User Info to check for smart account
                const userInfo = await getUserInfo(userId);
                console.log("REGISTER: User info fetched:", userInfo);

                let smartAccountId = userInfo.smartAccountId;
                let passkeyPubkey = userInfo.passkeyPubkey;

                // STEP 5: Deploy Smart Account if not already present
                if (!smartAccountId) {
                    try {
                        console.log("REGISTER: No smart account found. Deploying now...");
                        const deployRes = await deploySmartAccount(
                            FACTORY_ID,
                            WASM_HASH,
                            credential.id,
                            passkeyPubkey,
                            userId
                        );
                        console.log("REGISTER: Deployment response:", deployRes);
                        if (deployRes.childId || deployRes.existingChildId) {
                            smartAccountId = deployRes.childId || deployRes.existingChildId;
                        }
                    } catch (deployErr) {
                        console.error("REGISTER: Smart account deployment failed:", deployErr);
                        // We still consider registration successful, but whale account creation failed
                    }
                }

                const newUser = {
                    userId: userId,
                    smartAccountId,
                    passkeyPubkey,
                    name: userInfo.name || "User"
                };

                setUser(newUser);
                sessionStorage.setItem('vaulton_user', JSON.stringify(newUser));

                if (smartAccountId) {
                    await fetchBalance(smartAccountId);
                }

                console.log("REGISTER: Seamless registration and deployment complete.");
            } else {
                console.error("REGISTER: Verification failed:", verifyData);
                alert("Registration verification failed.");
            }
        } catch (error) {
            console.error("REGISTER: Error occurred during registration:", error);
            alert("Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        setIsLoading(true);
        console.log("LOGIN: Starting discoverable login flow...");
        try {
            // STEP 1: Authentication Challenge (Discovery mode)
            const challengeData = await loginChallenge();
            console.log("LOGIN: Challenge data received:", challengeData);

            if (!challengeData.options) {
                throw new Error("No passkey options returned from server.");
            }

            // STEP 2: Browser Authentication (Resident Key Discovery)
            const credential = await startAuthentication(challengeData.options);
            console.log("LOGIN: Browser credential created:", credential);

            // STEP 3: Verify Login
            const verifyData = await verifyLogin(credential);
            console.log("LOGIN: Verification response:", verifyData);

            if (verifyData.success || verifyData.verified) {
                const userId = verifyData.userId;

                // STEP 4: Fetch full user context
                const userInfo = await getUserInfo(userId);
                console.log("LOGIN: User info fetched:", userInfo);

                const loggedInUser = {
                    userId: userInfo.userId,
                    smartAccountId: userInfo.smartAccountId,
                    passkeyPubkey: userInfo.passkeyPubkey,
                    name: userInfo.name || "User"
                };

                setUser(loggedInUser);
                sessionStorage.setItem('vaulton_user', JSON.stringify(loggedInUser));

                if (loggedInUser.smartAccountId) {
                    await fetchBalance(loggedInUser.smartAccountId);
                }

                console.log("LOGIN: User logged in successfully.");
            } else {
                console.error("LOGIN: Verification failed:", verifyData);
                alert("Login failed or no account found.");
            }
        } catch (error) {
            console.error("LOGIN: Error occurred during login:", error);
            alert("Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        sessionStorage.removeItem('vaulton_user');
        setActiveTab("home");
        setIsSidebarOpen(false);
        console.log("LOGOUT: User logged out successfully.");
    };

    const renderContent = () => {
        switch (activeTab) {
            case "home":
                return <DashboardHome onNavigate={setActiveTab} user={user} balance={balance} refreshBalance={() => fetchBalance(user?.smartAccountId)} />;
            case "send":
                return <SendScreen onBack={() => setActiveTab("home")} balance={balance} user={user} prefill={sendPrefill} />;
            case "receive":
                return <ReceiveScreen onBack={() => setActiveTab("home")} user={user} />;
            case "addons":
                return <AddonsScreen onBack={() => setActiveTab("home")} onSelectAddon={setActiveTab} />;
            case "anonymous":
                return <AnonymousPaymentHub onBack={() => setActiveTab("addons")} user={user} />;
            case "autopay":
                return <AutopayHub onBack={() => setActiveTab("home")} user={user} />;
            case "profile":
            case "settings":
                return <ProfileHub onBack={() => setActiveTab("home")} onLogout={handleLogout} user={user} />;
            default:
                return <DashboardHome onNavigate={setActiveTab} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-[#1A1A2E] flex flex-col md:flex-row">
            {user && (
                <AppSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    setActiveTab={(tab) => {
                        setActiveTab(tab);
                        setIsSidebarOpen(false);
                    }}
                    activeTab={activeTab}
                    onLogout={handleLogout}
                />
            )}

            <div className={`flex-1 flex flex-col ${user ? "md:pl-[280px]" : ""}`}>
                {user && (
                    <AppHeader
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onProfileClick={() => setActiveTab("profile")}
                        userName={user ? (user.name ? user.name.split(' ').map(n => n[0]).join('') : "U") : "V"}
                    />
                )}

                <main className="flex-1 w-full px-4 md:px-10 py-6 max-w-7xl mx-auto pb-44 md:pb-6 pt-28 md:pt-0">
                    {isAuthLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[#FFB800]/20 border-t-[#FFB800] rounded-full animate-spin"></div>
                        </div>
                    ) : user ? (
                        renderContent()
                    ) : (
                        <div className="max-w-lg mx-auto">
                            <WelcomeAuth onLogin={handleLogin} onRegister={handleRegister} isLoading={isLoading} />
                        </div>
                    )}
                </main>

                {user && (
                    <div className="md:hidden">
                        <AppBottomBar
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

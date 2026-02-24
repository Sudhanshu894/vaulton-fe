"use client";

import { useEffect, useState } from "react";
import AppHeader from "../components/app/AppHeader 2";
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
import StreamingPartnershipHub from "../components/app/StreamingPartnershipHub";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
    registerChallenge,
    verifyRegister,
    loginChallenge,
    verifyLogin,
    getUserInfo,
    deploySmartAccount,
    getUSDCBalance,
    zkDeployChild,
    zkGenerateKeys,
    zkDeriveKeys,
    zkPrepareRegister,
    zkSubmitRegister,
} from "@/services/backendservices";
import { getDashboardSendPrefill } from "@/lib/paymentRequest";

const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_ID;
const WASM_HASH = process.env.NEXT_PUBLIC_WASM_HASH;
const ZK_CURVE_ORDER = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
const ZK_HALF_CURVE_ORDER = ZK_CURVE_ORDER >> 1n;
const ZK_SETUP_FLAG_PREFIX = "vaulton_zk_setup_done_";

const formatBalance2 = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
};

const getUserInitials = (name) => {
    const text = String(name || "").trim();
    if (!text) return "A";
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const isAlreadyRegisteredError = (message) => /already.*register|already.*active|already.*exists/i.test(String(message || ""));

const uint8ToHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hexToUint8 = (hex) => {
    const clean = String(hex || "").trim();
    if (!clean || clean.length % 2 !== 0 || /[^a-f0-9]/i.test(clean)) {
        throw new Error("Invalid challenge format");
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
        out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }
    return out;
};

const uint8ToBase64Url = (bytes) => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlToUint8 = (b64url) => {
    const base64 = String(b64url || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return new Uint8Array([...atob(padded)].map((char) => char.charCodeAt(0)));
};

const derToRs = (der) => {
    let offset = 2;
    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature");
    let rLen = der[offset++];
    let r = der.slice(offset, offset + rLen);
    offset += rLen;
    if (r[0] === 0 && r.length > 32) r = r.slice(1);
    while (r.length < 32) r = new Uint8Array([0, ...r]);
    r = r.slice(-32);

    if (der[offset++] !== 0x02) throw new Error("Invalid DER signature");
    let sLen = der[offset++];
    let s = der.slice(offset, offset + sLen);
    if (s[0] === 0 && s.length > 32) s = s.slice(1);
    while (s.length < 32) s = new Uint8Array([0, ...s]);
    s = s.slice(-32);

    const sBig = BigInt(`0x${uint8ToHex(s)}`);
    if (sBig > ZK_HALF_CURVE_ORDER) {
        const lowS = ZK_CURVE_ORDER - sBig;
        s = hexToUint8(lowS.toString(16).padStart(64, "0"));
    }

    const rs = new Uint8Array(64);
    rs.set(r, 0);
    rs.set(s, 32);
    return rs;
};

const signZkChallengeWithPasskey = async (challengeHex, credentialId) => {
    if (!challengeHex) throw new Error("Missing passkey challenge");
    const challengeBytes = hexToUint8(challengeHex);
    const options = {
        challenge: challengeBytes.buffer,
        rpId: window.location.hostname,
        userVerification: "required",
        timeout: 60_000,
    };

    if (credentialId) {
        const credentialBytes = base64UrlToUint8(credentialId);
        options.allowCredentials = [
            {
                id: credentialBytes.buffer,
                type: "public-key",
                transports: ["internal", "hybrid"],
            },
        ];
    }

    const assertion = await navigator.credentials.get({ publicKey: options });
    if (!assertion?.response) throw new Error("Passkey confirmation was cancelled");

    const derSig = new Uint8Array(assertion.response.signature);
    const rsSig = derToRs(derSig);

    return {
        signatureHex: uint8ToHex(rsSig),
        authenticatorData: uint8ToBase64Url(new Uint8Array(assertion.response.authenticatorData)),
        clientDataJSON: uint8ToBase64Url(new Uint8Array(assertion.response.clientDataJSON)),
    };
};

const runAutomaticZkSetup = async ({ userId, credentialId }) => {
    const zkDeploy = await zkDeployChild(userId);
    const childAddress = String(zkDeploy?.childId || zkDeploy?.existingChildId || "").trim();
    if (!childAddress) {
        throw new Error("ZK smart account deployment failed");
    }

    await zkGenerateKeys(userId);
    const derived = await zkDeriveKeys(userId);
    const noteKeyHex = String(derived?.notePublicKeyHex || "").trim();
    const encryptionKeyHex = String(derived?.encryptionPublicKeyHex || "").trim();
    if (!noteKeyHex || !encryptionKeyHex) {
        throw new Error("Could not derive ZK public keys");
    }

    try {
        const prepData = await zkPrepareRegister({
            childAddress,
            encryptionKeyHex,
            noteKeyHex,
        });
        const signature = await signZkChallengeWithPasskey(prepData?.signaturePayload, credentialId);
        const submitData = await zkSubmitRegister({
            childAddress: String(prepData?.childAddress || childAddress),
            userId,
            encryptionKeyHex,
            noteKeyHex,
            signatureHex: signature.signatureHex,
            authenticatorData: signature.authenticatorData,
            clientDataJSON: signature.clientDataJSON,
            prepareData: prepData,
        });

        if (!submitData?.success) {
            const submitError = submitData?.errorDetails || submitData?.status || submitData?.error || "Anonymous setup register failed";
            if (!isAlreadyRegisteredError(submitError)) {
                throw new Error(String(submitError));
            }
        }
    } catch (error) {
        const message = error?.response?.data?.error || error?.message || String(error || "");
        if (!isAlreadyRegisteredError(message)) {
            throw error;
        }
    }

    return childAddress;
};

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState("home");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [balance, setBalance] = useState("0.00");
    const [user, setUser] = useState(null);
    const [themeMode, setThemeMode] = useState("light");
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [sendPrefill, setSendPrefill] = useState(null);

    const persistUserSession = (nextUser) => {
        setUser(nextUser);
        sessionStorage.setItem('vaulton_user', JSON.stringify(nextUser));
    };

    useEffect(() => {
        const savedTheme = window.localStorage.getItem("vaulton_theme");
        if (savedTheme === "dark" || savedTheme === "light") {
            setThemeMode(savedTheme);
        }

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
            if (parsedUser.userId) {
                getUserInfo(parsedUser.userId)
                    .then((freshUserInfo) => {
                        const refreshedUser = {
                            userId: freshUserInfo.userId || parsedUser.userId,
                            smartAccountId: freshUserInfo.smartAccountId || parsedUser.smartAccountId || "",
                            passkeyPubkey: freshUserInfo.passkeyPubkey || parsedUser.passkeyPubkey || "",
                            name: freshUserInfo.name ?? "",
                            createdAt: freshUserInfo.createdAt || parsedUser.createdAt || "",
                        };
                        setUser(refreshedUser);
                        sessionStorage.setItem('vaulton_user', JSON.stringify(refreshedUser));
                        if (refreshedUser.smartAccountId && refreshedUser.smartAccountId !== parsedUser.smartAccountId) {
                            fetchBalance(refreshedUser.smartAccountId);
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to refresh user profile from API:", error);
                    });
            }
        }
        setIsAuthLoading(false);
        window.addEventListener("popstate", applyPrefillFromUrl);
        return () => {
            window.removeEventListener("popstate", applyPrefillFromUrl);
        };
    }, []);

    useEffect(() => {
        const isDark = themeMode === "dark";
        window.localStorage.setItem("vaulton_theme", isDark ? "dark" : "light");
        document.documentElement.classList.toggle("theme-dark", isDark);
        return () => {
            document.documentElement.classList.remove("theme-dark");
        };
    }, [themeMode]);

    const fetchBalance = async (childId) => {
        try {
            const data = await getUSDCBalance(childId);
            if (data?.balanceInUsdc != null) {
                setBalance(formatBalance2(data.balanceInUsdc));
            }
        } catch (error) {
            console.error("Failed to fetch balance:", error);
        }
    };

    useEffect(() => {
        const childId = user?.smartAccountId;
        if (!childId) return;

        const pollId = window.setInterval(() => {
            fetchBalance(childId);
        }, 5000);

        return () => {
            window.clearInterval(pollId);
        };
    }, [user?.smartAccountId]);

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

                            try {
                                console.log("REGISTER: Running automatic anonymous setup...");
                                await runAutomaticZkSetup({
                                    userId,
                                    credentialId: credential.id,
                                });
                                window.localStorage.setItem(`${ZK_SETUP_FLAG_PREFIX}${userId}`, "1");
                                console.log("REGISTER: Automatic anonymous setup completed.");
                            } catch (zkSetupError) {
                                window.localStorage.removeItem(`${ZK_SETUP_FLAG_PREFIX}${userId}`);
                                console.error("REGISTER: Automatic anonymous setup failed:", zkSetupError);
                            }
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
                    name: userInfo.name || "",
                    createdAt: userInfo.createdAt || "",
                };

                persistUserSession(newUser);

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
                    name: userInfo.name || "",
                    createdAt: userInfo.createdAt || "",
                };

                persistUserSession(loggedInUser);

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

    const handleUserUpdated = (partialUser) => {
        if (!user) return;
        const updatedUser = { ...user, ...partialUser };
        persistUserSession(updatedUser);
    };

    const toggleThemeMode = () => {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
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
            case "streaming":
                return <StreamingPartnershipHub onBack={() => setActiveTab("addons")} user={user} />;
            case "autopay":
                return <AutopayHub onBack={() => setActiveTab("home")} user={user} />;
            case "profile":
            case "settings":
                return <ProfileHub onBack={() => setActiveTab("home")} onLogout={handleLogout} user={user} onUserUpdated={handleUserUpdated} themeMode={themeMode} onToggleTheme={toggleThemeMode} />;
            default:
                return <DashboardHome onNavigate={setActiveTab} />;
        }
    };

    return (
        <div className={`${themeMode === "dark" ? "theme-dark" : ""} min-h-screen bg-[#F8F9FB] text-[#1A1A2E] flex flex-col md:flex-row`}>
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
                        userName={getUserInitials(user?.name)}
                    />
                )}

                <main className="flex-1 w-full px-4 md:px-10 py-6 max-w-7xl mx-auto pb-44 md:pb-6 pt-20 md:pt-0">
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

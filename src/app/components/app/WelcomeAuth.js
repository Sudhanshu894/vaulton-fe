"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const PASSKEY_OPTIONS = [
    {
        id: "device",
        label: "This device",
        sub: "Face/Touch ID or Windows Hello",
        badge: "Fastest",
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm4 6h6" />
        ),
    },
    {
        id: "security-key",
        label: "USB / NFC key",
        sub: "YubiKey, Titan, passkey card",
        badge: "Most portable",
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h8l2-3h6v6h-6l-2-3H4z" />
        ),
    },
    {
        id: "phone",
        label: "Phone as key",
        sub: "Use your phone via QR or Bluetooth",
        badge: "Great for desktop",
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2zm0 4h8" />
        ),
    },
];

export default function WelcomeAuth({ onLogin, onRegister, isLoading, passkeyPreference = "device", onPasskeyPreferenceChange = () => {} }) {
    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [installInfo, setInstallInfo] = useState("");

    useEffect(() => {
        const detectStandalone = () =>
            window.matchMedia?.("(display-mode: standalone)")?.matches ||
            window.navigator.standalone === true;

        setIsStandalone(detectStandalone());

        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredInstallPrompt(event);
            setIsStandalone(detectStandalone());
        };

        const handleAppInstalled = () => {
            setIsStandalone(true);
            setDeferredInstallPrompt(null);
            setInstallInfo("");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const handleInstallApp = async () => {
        if (isInstalling) return;
        if (!deferredInstallPrompt) {
            const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
            setInstallInfo(
                isIos
                    ? "On iPhone/iPad: Share → Add to Home Screen."
                    : "Use your browser menu and choose Install App."
            );
            return;
        }

        setIsInstalling(true);
        setInstallInfo("");
        try {
            await deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            setDeferredInstallPrompt(null);
        } catch (error) {
            console.error("PWA install prompt failed:", error);
        } finally {
            setIsInstalling(false);
        }
    };

    const showInstallButton = !isStandalone;

    const handleRegisterClick = () => {
        onRegister(passkeyPreference);
    };

    const renderPasskeyOptions = () => (
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PASSKEY_OPTIONS.map((option) => {
                const isActive = passkeyPreference === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onPasskeyPreferenceChange(option.id)}
                        className={`relative flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all text-left ${isActive ? "border-[#FFB800] bg-[#FFFAF0] shadow-sm" : "border-gray-100 hover:border-[#FFB800]/40 bg-white"}`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 text-[#1A1A2E] flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {option.icon}
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{option.badge}</span>
                        </div>
                        <p className="text-sm font-black text-[#1A1A2E] leading-tight">{option.label}</p>
                        <p className="text-[11px] font-bold text-gray-400 leading-snug">{option.sub}</p>
                        {isActive && (
                            <span className="absolute inset-x-4 bottom-3 h-0.5 bg-[#FFB800]"></span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="h-full flex flex-col items-center justify-center space-y-12 py-12 animate-fade-in text-center">
            <motion.div
                className="relative"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="absolute inset-0 bg-[#FFB800] rounded-full blur-3xl opacity-10 animate-pulse"></div>
                <Image src="/logo.png" alt="Vaulton" width={180} height={60} className="relative z-10 w-48 h-auto" />
            </motion.div>

            <div className="space-y-4">
                <h3 className="text-4xl font-black text-[#1A1A2E] tracking-tighter">Your Private Vault.</h3>
                <p className="text-gray-400 font-bold max-w-xs mx-auto text-lg leading-relaxed">
                    Keyless, passkey-secured, and automated.
                </p>
            </div>

            <div className="w-full space-y-3 text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Choose how to save your wallet pass</p>
                {renderPasskeyOptions()}
            </div>

            <div className="w-full space-y-4">
                <button
                    onClick={onLogin}
                    disabled={isLoading}
                    className="w-full py-5 bg-[#1A1A2E] text-white rounded-[2rem] font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Authenticating..." : "Sign in with Biometrics"}
                </button>
                <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-gray-100"></div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Smart Account?</span>
                    <div className="flex-1 h-px bg-gray-100"></div>
                </div>
                <button
                    onClick={handleRegisterClick}
                    disabled={isLoading}
                    className="w-full py-5 bg-white border-2 border-gray-100 text-[#1A1A2E] rounded-[2rem] font-black text-sm hover:border-[#FFB800] hover:text-[#FFB800] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Creating Account..." : "Create One"}
                </button>

                {showInstallButton && (
                    <>
                        <button
                            type="button"
                            onClick={handleInstallApp}
                            disabled={isLoading || isInstalling}
                            className="w-full py-4 bg-[#1A1A2E] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isInstalling ? "Preparing..." : "Download App"}
                        </button>
                        {installInfo && (
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{installInfo}</p>
                        )}
                    </>
                )}
            </div>

            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8">
                Secured by WebAuthn • Stellar Protected
            </p>
        </div>
    );
}

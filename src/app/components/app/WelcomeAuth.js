"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function WelcomeAuth({ onLogin, onRegister, isLoading }) {
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
                    onClick={onRegister}
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

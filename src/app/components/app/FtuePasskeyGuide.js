"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PASSKEY_CHOICES = [
    {
        id: "device",
        title: "Device biometrics",
        desc: "Face/Touch ID, Windows Hello. Best for speed on this device.",
        accent: "from-[#FFB800]/90 via-[#FFDA55]/70 to-white",
    },
    {
        id: "security-key",
        title: "Hardware key",
        desc: "USB/NFC keys like YubiKey or Titan. Works across devices.",
        accent: "from-indigo-500/90 via-indigo-400/70 to-white",
    },
    {
        id: "phone",
        title: "Phone as key",
        desc: "Use your phone via QR or Bluetooth when on desktop.",
        accent: "from-emerald-500/90 via-emerald-400/70 to-white",
    },
];

const STEPS = [
    {
        id: "overview",
        title: "Save your wallet pass as a passkey",
        kicker: "One-time setup",
        body: "Pick where to anchor your passkey. You can add more later from Settings > Security.",
    },
    {
        id: "mobile",
        title: "Quickstart on mobile",
        kicker: "iOS & Android",
        body: "Use the built-in biometric prompt. Add a hardware key as backup if your phone is lost.",
        bullets: [
            "Tap Create or Sign in → approve with Face/Touch ID",
            "If you chose phone as key, it stays discoverable across new browsers",
            "Add another passkey from Profile > Security later",
        ],
    },
    {
        id: "desktop",
        title: "Quickstart on desktop",
        kicker: "Mac, Windows, Linux",
        body: "Choose biometrics, plug a security key, or pair your phone as a roaming passkey.",
        bullets: [
            "Select the passkey type card above before you hit Create",
            "For security keys: insert or tap NFC when prompted",
            "For phone: scan the QR or approve the Bluetooth prompt",
        ],
    },
];

export default function FtuePasskeyGuide({ open, onClose, onSelectPreference, currentPreference }) {
    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        if (open) {
            setStepIndex(0);
        }
    }, [open]);

    const totalSteps = STEPS.length;
    const activeStep = useMemo(() => STEPS[stepIndex] || STEPS[0], [stepIndex]);

    if (!open) return null;

    const goNext = () => {
        if (stepIndex < totalSteps - 1) {
            setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
        } else {
            onClose?.();
        }
    };

    const goPrev = () => setStepIndex((prev) => Math.max(prev - 1, 0));

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="ftue-overlay"
                    className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        key={activeStep.id}
                        className="w-full max-w-4xl rounded-[28px] bg-white shadow-2xl overflow-hidden border border-white/30 relative"
                        initial={{ y: 30, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 220, damping: 28 }}
                    >
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute -left-24 -top-24 w-64 h-64 bg-[#FFB800]/20 rounded-full blur-3xl" />
                            <div className="absolute -right-10 -bottom-16 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl" />
                        </div>

                        <div className="relative p-6 md:p-10 space-y-6">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-[#1A1A2E] text-white">FTUE</span>
                                    <p className="text-xs font-bold text-gray-500">Mobile + Desktop walkthrough</p>
                                </div>
                                <button
                                    onClick={() => onClose?.()}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-[#1A1A2E] flex items-center justify-center"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-start gap-6">
                                <div className="md:w-1/2 space-y-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">{activeStep.kicker}</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-[#1A1A2E] leading-tight">{activeStep.title}</h2>
                                    <p className="text-gray-500 font-bold leading-relaxed">{activeStep.body}</p>

                                    <div className="flex items-center gap-2 pt-2">
                                        {STEPS.map((item, idx) => (
                                            <span
                                                key={item.id}
                                                className={`h-2 rounded-full transition-all ${idx === stepIndex ? "bg-[#FFB800] w-6" : "bg-gray-200 w-2"}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 pt-4">
                                        <button
                                            onClick={goPrev}
                                            disabled={stepIndex === 0}
                                            className="px-4 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-50"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={goNext}
                                            className="px-5 py-2 rounded-full bg-[#1A1A2E] text-white text-sm font-black hover:scale-[1.01] active:scale-95 transition-transform"
                                        >
                                            {stepIndex === totalSteps - 1 ? "Got it" : "Next"}
                                        </button>
                                    </div>
                                </div>

                                <div className="md:w-1/2 space-y-4">
                                    <div className="grid md:grid-cols-1 gap-3">
                                        {PASSKEY_CHOICES.map((choice) => {
                                            const active = currentPreference === choice.id;
                                            return (
                                                <button
                                                    key={choice.id}
                                                    type="button"
                                                    onClick={() => onSelectPreference?.(choice.id)}
                                                    className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${active ? "border-[#FFB800] shadow-lg" : "border-gray-100 hover:border-[#FFB800]/50"}`}
                                                >
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${choice.accent} opacity-20`} />
                                                    <div className="relative space-y-1">
                                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Passkey option</p>
                                                        <p className="text-lg font-black text-[#1A1A2E]">{choice.title}</p>
                                                        <p className="text-sm font-bold text-gray-500 leading-snug">{choice.desc}</p>
                                                        {active && <span className="inline-flex mt-1 px-3 py-1 rounded-full bg-[#FFB800]/20 text-[#1A1A2E] text-[11px] font-black uppercase tracking-widest">Selected</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {activeStep.bullets && (
                                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                                            {activeStep.bullets.map((bullet, idx) => (
                                                <motion.div
                                                    key={bullet}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="flex items-start gap-3"
                                                >
                                                    <div className="mt-1 w-2 h-2 rounded-full bg-[#FFB800]"></div>
                                                    <p className="text-sm font-bold text-[#1A1A2E]/80 leading-snug">{bullet}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

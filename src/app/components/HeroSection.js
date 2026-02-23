"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import FloatingCard from "./FloatingCard";
import Particles from "./Particles";

const features = [
    {
        title: "Secured Keyless Wallet",
        description: "No seed phrases, just total security.",
        visual: "/features/keyless.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
        )
    },
    {
        title: "Biometric Authentication",
        description: "Your face or fingerprint is your key.",
        visual: "/features/biometric.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0112 3c1.268 0 2.49.234 3.62.661m1.156 5.05a10.05 10.05 0 011.66 2.043m-9.043 9.14a10.05 10.05 0 01-1.66-2.043m9.043-9.14A10.003 10.003 0 0112 21c-1.268 0-2.49-.234-3.62-.661m-1.156-5.05a10.05 10.05 0 01-1.66-2.043" />
            </svg>
        )
    },
    {
        title: "Secure Transactions",
        description: "Peace of mind with every payment.",
        visual: "/features/secure.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        )
    },
    {
        title: "Gasless Experience",
        description: "Zero fees for users, automated cover.",
        visual: "/features/gasless.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    }
];

export default function HeroSection() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(0);

    // Mouse movement parallax effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
    const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

    const rotateX = useTransform(springY, [-500, 500], [5, -5]);
    const rotateY = useTransform(springX, [-500, 500], [-5, 5]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            mouseX.set(e.clientX - centerX);
            mouseY.set(e.clientY - centerY);
        };

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [mouseX, mouseY]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    return (
        <main className="relative flex items-center justify-center min-h-screen lg:h-screen w-full overflow-y-auto lg:overflow-hidden bg-[#FAFAFA] pt-24 lg:pt-0 pb-12 lg:pb-0">
            {/* Interactive Background */}
            <Particles />

            {/* Cursor Glow Effect */}
            <motion.div
                className="pointer-events-none fixed inset-0 z-10 opacity-30"
                style={{
                    background: useTransform(
                        [springX, springY],
                        ([x, y]) => `radial-gradient(600px circle at ${x + (typeof window !== 'undefined' ? window.innerWidth / 2 : 0)}px ${y + (typeof window !== 'undefined' ? window.innerHeight / 2 : 0)}px, rgba(255, 184, 0, 0.15), transparent 80%)`
                    )
                }}
            />

            <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 relative z-20">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

                    {/* Left Content: Value Propositions */}
                    <div className="flex flex-col items-start gap-4 lg:gap-6 relative">
                        {/* Decorative background flare for feature cards */}
                        <div className="absolute -left-20 top-1/2 w-40 h-40 bg-[#FFB800]/5 rounded-full blur-3xl -z-10"></div>

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-4"
                        >
                            <span className="px-4 py-1.5 rounded-full bg-white shadow-sm border border-gray-100 text-[#1A1A2E] text-[7px] lg:text-[9px] font-black tracking-[0.2em] uppercase">
                                Next-Gen Authentication • Stellar Powered
                            </span>
                            <h1 className="text-5xl mt-2 md:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] text-[#1A1A2E]">
                                VAULT<span className="text-[#FFB800]">ON</span><span className="text-[0.4em] align-top text-gray-300">.</span>
                            </h1>
                            <p className="text-base md:text-lg lg:text-xl text-gray-400 font-medium max-w-md leading-tight">
                                The flagship keyless wallet for a <span className="text-[#1A1A2E]">seedless future.</span>
                            </p>
                        </motion.div>

                        <div className="grid gap-4 w-full max-w-md mt-2 relative">
                            {/* Decorative dots grid behind cards */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>

                            {features.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, x: -25 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6, delay: 0.3 + (index * 0.1) }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    className={`group relative cursor-pointer p-4 lg:p-5 rounded-[2rem] transition-all duration-700 ease-out ${hoveredIndex === index
                                        ? "bg-[#1A1A2E] shadow-[0_20px_40px_-10px_rgba(26,26,46,0.25)] -translate-y-1 scale-[1.02]"
                                        : "bg-white/40 hover:bg-white/80 border border-gray-100/50 backdrop-blur-sm shadow-sm"
                                        }`}
                                >
                                    {/* Prestige Index Marker */}
                                    <div className={`absolute right-8 top-1/2 -translate-y-1/2 font-black italic text-5xl select-none transition-all duration-700 ${hoveredIndex === index ? "opacity-10 text-white translate-x-0" : "opacity-[0.02] text-black translate-x-4"
                                        }`}>
                                        0{index + 1}
                                    </div>

                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className={`w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-2xl transition-all duration-700 transform ${hoveredIndex === index
                                            ? "bg-gradient-to-br from-[#FFB800] to-[#E6A600] text-[#1A1A2E] rotate-6 scale-110 shadow-[0_10px_20px_rgba(255,184,0,0.3)]"
                                            : "bg-gray-50 text-gray-400 group-hover:bg-[#1A1A2E] group-hover:text-white"
                                            }`}>
                                            <div className="scale-100">{feature.icon}</div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`text-base lg:text-lg font-black tracking-tight transition-colors duration-500 ${hoveredIndex === index ? "text-white" : "text-[#1A1A2E]"
                                                }`}>
                                                {feature.title}
                                            </h3>
                                            <p className={`text-[11px] lg:text-xs font-medium transition-colors duration-500 ${hoveredIndex === index ? "text-gray-400" : "text-gray-500"
                                                }`}>
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Active Glow Bar */}
                                    {hoveredIndex === index && (
                                        <motion.div
                                            layoutId="activeGlow"
                                            className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#FFB800] rounded-r-full shadow-[2px_0_10px_rgba(255,184,0,0.5)]"
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Right Content: Interactive Visual */}
                    <div className="relative flex items-center justify-center h-[100px] lg:h-[600px] w-full mt-10 lg:mt-0">
                        <div className="hidden lg:block w-full">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={hoveredIndex}
                                    initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                    exit={{ opacity: 0, scale: 1.1, rotateY: 10 }}
                                    transition={{ duration: 0.5, ease: "circOut" }}
                                    style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                                    className="relative flex items-center justify-center perspective-1000 w-full"
                                >
                                    {/* Glowing Background Ring */}
                                    <div className={`absolute w-[120%] h-[120%] rounded-full blur-[100px] animate-pulse transition-colors duration-700 ${hoveredIndex === 0 ? "bg-[#FFB800]/10" :
                                        hoveredIndex === 1 ? "bg-amber-500/10" :
                                            hoveredIndex === 2 ? "bg-amber-600/10" :
                                                "bg-indigo-500/10"
                                        }`}></div>

                                    {/* Feature Visual */}
                                    <motion.div
                                        animate={{ y: [0, -20, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                        className="relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.15)] w-full flex justify-center"
                                    >
                                        <Image
                                            src={features[hoveredIndex].visual}
                                            alt={features[hoveredIndex].title}
                                            width={500}
                                            height={500}
                                            className="w-[280px] sm:w-[350px] lg:w-[450px] h-auto rounded-[2rem] object-contain"
                                            priority
                                        />
                                    </motion.div>

                                    {/* Absolute Floating Elements */}
                                    <motion.div
                                        style={{ translateZ: 100 }}
                                        className="absolute top-10 -right-4 lg:-right-10 animate-float z-20 hidden md:block"
                                    >
                                        <FloatingCard className="p-3 bg-white/90 backdrop-blur shadow-2xl border border-white/50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-[#FFB800] rounded-full flex items-center justify-center text-white">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="pr-4">
                                                    <p className="text-[10px] text-gray-500 uppercase font-black">Status</p>
                                                    <p className="font-bold text-[#1A1A2E]">Active</p>
                                                </div>
                                            </div>
                                        </FloatingCard>
                                    </motion.div>

                                    {/* Bottom Left: Floating Testimonial */}
                                    <motion.div
                                        style={{ translateZ: 80 }}
                                        className="absolute -bottom-8 -left-4 lg:-left-12 animate-float-delayed z-20 max-w-[150px] lg:max-w-[200px]"
                                    >
                                        <FloatingCard className="p-3 lg:p-4 bg-white/90 backdrop-blur shadow-2xl border border-white/50 rounded-2xl">
                                            <p className="text-[10px] lg:text-xs text-gray-600 leading-tight italic">
                                                "Transaction Secured. Biometric authentication active."
                                            </p>
                                            <div className="mt-2 flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <svg key={i} className="w-2 h-2 lg:w-3 lg:h-3 text-[#FFB800]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                ))}
                                            </div>
                                        </FloatingCard>
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* PWA Download Button - Shifted under visual */}
                        <div className="absolute -bottom-8 lg:-bottom-16 w-full flex justify-center">
                            <AnimatePresence>
                                {deferredPrompt && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        onClick={handleInstallClick}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group relative flex items-center gap-3 bg-[#1A1A2E] text-white px-8 py-4 lg:px-10 lg:py-4 rounded-2xl font-bold text-base shadow-xl overflow-hidden hover:shadow-2xl transition-all z-30 cursor-pointer"
                                    >
                                        <span className="relative z-10 flex items-center gap-3">
                                            <svg className="w-5 h-5 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download Vaulton PWA
                                        </span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#FFB800] to-[#E6A800] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}

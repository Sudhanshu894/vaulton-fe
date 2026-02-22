"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import FloatingCard from "./FloatingCard";
import Particles from "./Particles";

const features = [
    {
        title: "Keyless Security",
        description: "No seed phrases, just biometrics.",
        visual: "/features/keyless.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
        )
    },
    {
        title: "Biometric Access",
        description: "Your face is your private key.",
        visual: "/features/biometric.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0112 3c1.268 0 2.49.234 3.62.661m1.156 5.05a10.05 10.05 0 01-1.66 2.043m-9.043 9.14a10.05 10.05 0 01-1.66-2.043m9.043-9.14A10.003 10.003 0 0112 21c-1.268 0-2.49-.234-3.62-.661m-1.156-5.05a10.05 10.05 0 01-1.66-2.043" />
            </svg>
        )
    },
    {
        title: "Gasless Protocol",
        description: "Zero fees, powered by Stellar paymasters.",
        visual: "/features/gasless.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    },
    {
        title: "Immutable Autopay",
        description: "Reliable scheduled blockchain payments.",
        visual: "/features/secure.png",
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    }
];

const DownloadButton = ({ deferredPrompt, handleInstallClick }) => (
    <AnimatePresence>
        {deferredPrompt && (
            <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={handleInstallClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex items-center gap-3 bg-[#1A1A2E] text-white px-8 py-4 lg:px-10 lg:py-5 rounded-2xl font-bold text-sm lg:text-base shadow-xl overflow-hidden hover:shadow-2xl transition-all z-30 cursor-pointer"
            >
                <span className="relative z-10 flex items-center gap-3">
                    <svg className="w-5 h-5 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Vaulton PWA
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFB800] to-[#E6A800] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </motion.button>
        )}
    </AnimatePresence>
);

export default function HeroSection() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(0);

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
        <main className="relative flex items-center justify-center min-h-screen lg:h-screen w-full overflow-y-auto lg:overflow-hidden bg-[#FAFAFA] pt-28 lg:pt-24 pb-12 lg:pb-0">
            <Particles />
            <motion.div
                className="pointer-events-none fixed inset-0 z-10 opacity-30"
                style={{
                    background: useTransform(
                        [springX, springY],
                        ([x, y]) => `radial-gradient(600px circle at ${x + (typeof window !== 'undefined' ? window.innerWidth / 2 : 0)}px ${y + (typeof window !== 'undefined' ? window.innerHeight / 2 : 0)}px, rgba(255, 184, 0, 0.15), transparent 80%)`
                    )
                }}
            />

            <div className="w-full max-w-7xl mx-auto px-6 relative z-20">
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <div className="flex flex-col items-start gap-8 lg:gap-10 relative w-full">
                        <div className="absolute -left-20 top-1/2 w-40 h-40 bg-[#FFB800]/5 rounded-full blur-3xl -z-10"></div>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-4 lg:space-y-6"
                        >
                            <span className="inline-block px-4 py-1.5 rounded-full bg-white shadow-sm border border-gray-100 text-[#1A1A2E] text-[9px] sm:text-[10px] lg:text-[11px] font-black tracking-[0.2em] uppercase whitespace-nowrap">
                                Next-Gen Authentication • Stellar Powered
                            </span>
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] text-[#1A1A2E]">
                                VAULT<span className="text-[#FFB800]">ON</span><span className="text-[0.4em] align-top text-gray-300">.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-400 font-medium max-w-md leading-tight">
                                The flagship keyless wallet for a <span className="text-[#1A1A2E]">seedless future.</span>
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full relative">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
                            {features.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.3 + (index * 0.1) }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onClick={() => setHoveredIndex(index)}
                                    className={`group relative cursor-pointer p-6 rounded-[2.5rem] transition-all duration-700 ease-out overflow-hidden flex flex-col justify-between min-h-[160px] ${index === 0 ? "sm:col-span-2" : "col-span-1"
                                        } ${hoveredIndex === index
                                            ? "bg-[#1A1A2E] shadow-[0_30px_60px_-15px_rgba(26,26,46,0.3)] -translate-y-1"
                                            : "bg-white/70 hover:bg-white/90 border border-gray-100 backdrop-blur-md shadow-sm"
                                        }`}
                                >
                                    <div className={`absolute -right-2 -bottom-2 font-black italic text-6xl select-none transition-all duration-700 pointer-events-none ${hoveredIndex === index ? "opacity-10 text-white" : "opacity-[0.03] text-black"}`}>
                                        0{index + 1}
                                    </div>
                                    <div className={`w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-2xl transition-all duration-700 mb-4 ${hoveredIndex === index ? "bg-gradient-to-br from-[#FFB800] to-[#E6A600] text-[#1A1A2E] rotate-6 scale-110 shadow-lg" : "bg-gray-50 text-gray-400 group-hover:bg-[#1A1A2E] group-hover:text-white"}`}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className={`text-sm lg:text-base font-black tracking-tight mb-1 transition-colors duration-500 ${hoveredIndex === index ? "text-white" : "text-[#1A1A2E]"}`}>{feature.title}</h3>
                                        <p className={`text-[10px] lg:text-xs font-medium leading-tight transition-colors duration-500 ${hoveredIndex === index ? "text-gray-400" : "text-gray-500"}`}>{feature.description}</p>
                                    </div>
                                    {hoveredIndex === index && (
                                        <motion.div layoutId="activeGlow" className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFB800]" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        <div className="lg:hidden w-full flex justify-center mt-4">
                            <DownloadButton deferredPrompt={deferredPrompt} handleInstallClick={handleInstallClick} />
                        </div>
                    </div>

                    <div className="hidden lg:flex relative flex-col items-center justify-center h-[600px] w-full">
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
                                <div className={`absolute w-[100%] h-[100%] rounded-full blur-[100px] animate-pulse transition-colors duration-700 ${hoveredIndex === 0 ? "bg-[#FFB800]/10" : hoveredIndex === 1 ? "bg-amber-500/10" : hoveredIndex === 2 ? "bg-amber-600/10" : "bg-indigo-500/10"}`}></div>
                                <motion.div
                                    animate={{ y: [0, -15, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10 drop-shadow-2xl w-full flex justify-center"
                                >
                                    <Image src={features[hoveredIndex].visual} alt={features[hoveredIndex].title} width={500} height={500} className="w-[420px] h-auto rounded-[2.5rem] object-contain shadow-2xl" priority />
                                </motion.div>
                                <motion.div style={{ translateZ: 100 }} className="absolute top-10 -right-10 animate-float z-20">
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
                                <motion.div style={{ translateZ: 80 }} className="absolute -bottom-8 -left-12 animate-float-delayed z-20 max-w-[200px]">
                                    <FloatingCard className="p-3 lg:p-4 bg-white/90 backdrop-blur shadow-2xl border border-white/50 rounded-2xl">
                                        <p className="text-xs text-gray-600 leading-tight italic">"Transaction Secured. Biometric authentication active."</p>
                                        <div className="mt-2 flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <svg key={i} className="w-3 h-3 text-[#FFB800]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                            ))}
                                        </div>
                                    </FloatingCard>
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                        <div className="mt-16 w-full flex justify-center">
                            <DownloadButton deferredPrompt={deferredPrompt} handleInstallClick={handleInstallClick} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

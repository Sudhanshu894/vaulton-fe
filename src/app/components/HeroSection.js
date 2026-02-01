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
        <main className="relative pb-20 pt-28 md:pt-30 md:pb-20 px-6 lg:px-12 flex items-center justify-center min-h-screen w-full overflow-x-hidden bg-[#FAFAFA]">
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

            <div className="w-full max-w-7xl mx-auto relative z-20">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

                    {/* Left Content: Value Propositions */}
                    <div className="flex flex-col items-start gap-6 lg:gap-10">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8 md:space-y-10"
                        >
                            <span className="px-4 py-2 rounded-full bg-[#1A1A2E]/5 text-[#1A1A2E] text-[10px] lg:text-sm font-bold tracking-widest uppercase border border-[#1A1A2E]/10">
                                Better Security • Better Experience
                            </span>
                            <h1 className="text-5xl md:text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4B5563] via-[#E5E7EB] via-70% to-[#FFB800] leading-[0.9] tracking-tighter">
                                VAULTON.
                            </h1>
                            <p className="text-lg md:text-xl lg:text-2xl text-gray-600 font-light max-w-lg leading-relaxed">
                                The ultimate keyless wallet for a world without passwords.
                            </p>
                        </motion.div>

                        <div className="grid gap-3 lg:gap-4 w-full max-w-md">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
                                    whileHover={{ x: 10 }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    className={`flex cursor-pointer items-center gap-4 p-3 lg:p-4 rounded-2xl shadow-sm border transition-all duration-300 ${hoveredIndex === index
                                        ? "bg-white border-[#FFB800]/20 shadow-md ring-1 ring-[#FFB800]/10"
                                        : "bg-white/50 border-gray-100 hover:bg-white"
                                        }`}
                                >
                                    <div className={`w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors duration-300 ${hoveredIndex === index ? "bg-[#FFB800] text-white" : "bg-[#F8F8F8] text-[#1A1A2E]"
                                        }`}>
                                        {feature.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-sm lg:text-base transition-colors ${hoveredIndex === index ? "text-[#FFB800]" : "text-[#1A1A2E]"}`}>
                                            {feature.title}
                                        </h3>
                                        <p className="text-[10px] lg:text-xs text-gray-500">{feature.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* PWA Download Button */}
                        <motion.button
                            onClick={handleInstallClick}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative flex items-center gap-3 bg-[#1A1A2E] text-white px-8 py-4 lg:px-10 lg:py-5 rounded-2xl font-bold text-base lg:text-lg shadow-xl overflow-hidden hover:shadow-2xl transition-all"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <svg className="w-5 h-5 lg:w-6 lg:h-6 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Vaulton App
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#FFB800] to-[#E6A800] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                        </motion.button>
                    </div>

                    {/* Right Content: Interactive Visual */}
                    <div className="relative flex items-center justify-center h-[400px] lg:h-[600px] w-full mt-10 lg:mt-0">
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
                                        "bg-amber-600/10"
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

                </div>
            </div>
        </main>
    );
}

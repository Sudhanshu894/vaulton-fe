"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { name: "Features", href: "/#features" },
        { name: "Team", href: "/#team" },
        { name: "Release Notes", href: "/release-notes" },
        { name: "FAQ", href: "/faq" },
        { name: "Support", href: "/support" },
    ];

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleLinkClick = (href) => {
        setIsMenuOpen(false);
        router.push(href);
    };
    return (
        <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
            {/* Click outside overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        onClick={() => setIsMenuOpen(false)}
                        className="fixed inset-[-50vh_-50vw] w-[200vw] h-[200vh] pointer-events-auto bg-transparent z-[-1]"
                    />
                )}
            </AnimatePresence>

            <div className="w-full max-w-7xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[2rem] md:rounded-full px-6 lg:px-12 pointer-events-auto overflow-hidden md:overflow-visible relative">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleLinkClick("/")}>
                        <Image
                            src="/logo.png"
                            alt="Vaulton Logo"
                            width={140}
                            height={45}
                            className="h-24 md:h-32 lg:h-32 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300"
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

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleMenu}
                            className="text-[#1A1A2E] p-2 focus:outline-none"
                            aria-label="Toggle Menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="md:hidden overflow-hidden"
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
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}

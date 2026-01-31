"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { name: "Transactions", href: "/#transactions" },
        { name: "Autopay", href: "/#autopay" },
        { name: "FAQ", href: "/faq" },
        { name: "About", href: "/about" },
        { name: "Support", href: "/support" },
    ];

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleLinkClick = (href) => {
        setIsMenuOpen(false);
        router.push(href);
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
                                className="relative text-gray-600 hover:text-[#1A1A2E] font-medium transition-colors duration-300 group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1A1A2E] group-hover:w-full transition-all duration-300"></span>
                            </button>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4 text-[#1A1A2E] font-medium">
                        <button className="relative cursor-pointer transition-all duration-300 group overflow-hidden">
                            <span className="relative z-10 text-[#1A1A2E] group-hover:text-[#4A4A6E] transition-colors duration-300">Smart Account?</span>
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#1A1A2E] to-[#4A4A6E] transform origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"></span>
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#4A4A6E] to-[#1A1A2E] transform origin-right scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
                        </button>
                        <button className="relative px-5 py-2 cursor-pointer font-semibold rounded-full overflow-hidden group bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5">
                            <span className="relative z-10">Create one!</span>
                            <span className="absolute inset-0 bg-gradient-to-r from-[#3A3A5E] to-[#1A1A2E] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        </button>
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
                                        className="text-left text-lg text-gray-600 hover:text-[#1A1A2E] font-medium transition-colors duration-300"
                                    >
                                        {link.name}
                                    </button>
                                ))}
                                <div className="flex flex-col gap-4 pt-4 border-t border-gray-50">
                                    <button className="text-left text-[#1A1A2E] font-medium">Smart Account?</button>
                                    <button className="w-full py-3 bg-gradient-to-r from-[#1A1A2E] to-[#2A2A4E] text-white rounded-xl font-semibold shadow-md active:scale-95 transition-transform">
                                        Create one!
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}

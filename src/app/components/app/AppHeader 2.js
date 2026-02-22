"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function AppHeader({ onMenuClick, onProfileClick, userName }) {
    return (
        <header className="fixed md:sticky top-0 left-0 right-0 z-50 bg-[#F8F9FB]/80 backdrop-blur-md border-b border-gray-100/50 px-6 py-4 flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-[#1A1A2E] hover:bg-gray-100 rounded-xl transition-colors md:hidden"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Vaulton" width={32} height={32} className="object-contain" />
                    <span className="text-xl font-black text-[#1A1A2E] tracking-tight">Vaulton</span>
                </div>
            </div>

            <div className="flex items-center gap-3">


                <button
                    onClick={onProfileClick}
                    className="w-10 h-10 bg-[#1A1A2E] text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm hover:scale-105 transition-transform"
                >
                    {userName}
                </button>
            </div>
        </header>
    );
}

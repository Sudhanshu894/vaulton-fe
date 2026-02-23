"use client";

import { motion } from "framer-motion";

const tabs = [
    {
        id: "home", label: "Home", icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        )
    },
    {
        id: "send", label: "Send", icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
        )
    },
    {
        id: "receive", label: "Receive", icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
        )
    },
    {
        id: "addons", label: "Add-ons", icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
            </svg>
        )
    },
];

export default function AppBottomBar({ activeTab, setActiveTab }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-around z-40 max-w-lg mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[2.5rem]">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex flex-col items-center gap-1 py-2 px-4 relative group"
                >
                    <div className={`transition-all duration-300 ${activeTab === tab.id ? "text-[#FFB800] scale-110" : "text-gray-400 group-hover:text-[#1A1A2E]"}`}>
                        {tab.icon}
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${activeTab === tab.id ? "text-[#FFB800]" : "text-gray-400 group-hover:text-[#1A1A2E]"}`}>
                        {tab.label}
                    </span>
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="bottomTab"
                            className="absolute -top-2 w-1 h-1 bg-[#FFB800] rounded-full"
                        />
                    )}
                </button>
            ))}
        </nav>
    );
}

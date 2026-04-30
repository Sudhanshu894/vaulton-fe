"use client";

import Image from "next/image";

const getHealthMeta = (health) => {
    const status = String(health?.status || "unknown");
    if (status === "healthy") {
        return {
            label: health?.label || "Backend online",
            tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
            dot: "bg-emerald-500",
        };
    }
    if (status === "degraded") {
        return {
            label: health?.label || "Backend degraded",
            tone: "bg-amber-50 text-amber-700 border-amber-100",
            dot: "bg-amber-500",
        };
    }
    if (status === "offline") {
        return {
            label: health?.label || "Backend offline",
            tone: "bg-red-50 text-red-700 border-red-100",
            dot: "bg-red-500",
        };
    }
    return {
        label: health?.label || "Checking backend...",
        tone: "bg-gray-50 text-gray-500 border-gray-100",
        dot: "bg-gray-400",
    };
};

export default function AppHeader({ onMenuClick, onProfileClick, userName, backendHealth }) {
    const healthMeta = getHealthMeta(backendHealth);

    return (
        <header className="fixed md:sticky top-4 md:top-0 left-0 right-0 z-50 px-4 md:px-0">
            <div className="mx-auto w-full max-w-7xl h-16 md:h-20 bg-white/75 md:bg-[#F8F9FB]/80 backdrop-blur-xl md:backdrop-blur-md rounded-[2rem] md:rounded-none border border-white/40 md:border-b md:border-gray-100/50 md:border-x-0 shadow-[0_8px_32px_rgba(0,0,0,0.05)] md:shadow-none px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <button
                        onClick={onMenuClick}
                        className="p-2 -ml-1 text-[#1A1A2E] hover:bg-gray-100 rounded-xl transition-colors md:hidden"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center relative h-10 md:h-14 w-[132px] md:w-[176px]">
                        <Image src="/logo.png" alt="Vaulton" fill className="object-contain" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${healthMeta.tone}`} title={healthMeta.label}>
                        <span className={`w-2 h-2 rounded-full ${healthMeta.dot}`} />
                        <span className="truncate max-w-[140px]">{healthMeta.label}</span>
                    </div>
                    <button
                        onClick={onProfileClick}
                        className="w-10 h-10 bg-[#1A1A2E] text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm hover:scale-105 transition-transform"
                        aria-label="Open profile"
                    >
                        {userName}
                    </button>
                </div>
            </div>
        </header>
    );
}

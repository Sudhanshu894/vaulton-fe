"use client";

import { motion } from "framer-motion";

const addonOptions = [
    {
        id: "anonymous",
        title: "Anonymous Payment",
        desc: "ZKP-based private transactions via Stealth addresses.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        status: "Active",
        color: "text-blue-500",
        bgColor: "bg-blue-50"
    },
    {
        id: "streaming",
        title: "Streaming Partnership",
        desc: "Real-time micro-payments for content creators.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        status: "Live",
        color: "text-emerald-500",
        bgColor: "bg-emerald-50"
    },
    {
        id: "ai-agent",
        title: "AI Agent",
        desc: "Talk to your vault. Execute complex swaps & transfers with natural language.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        status: "Coming Soon",
        color: "text-purple-500",
        bgColor: "bg-purple-50"
    },
    {
        id: "placeholder",
        title: "More arriving...",
        desc: "The Vaulton ecosystem is expanding to DeFi & Beyond.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
        ),
        status: "Roadmap",
        color: "text-gray-400",
        bgColor: "bg-gray-50"
    }
];

export default function AddonsScreen({ onSelectAddon }) {
    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <div className="flex items-center">
                <div>
                    <h3 className="text-3xl font-black text-[#1A1A2E]">Add-ons Hub</h3>
                    <p className="text-gray-400 font-bold text-sm">Supercharge your Smart Account</p>
                </div>
            </div>

            <div className="grid gap-4">
                {addonOptions.map((addon, index) => (
                    <motion.div
                        key={addon.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => {
                            if (addon.id === "anonymous") onSelectAddon("anonymous");
                            if (addon.id === "streaming") onSelectAddon("streaming");
                        }}
                        className={`group relative p-5 md:p-6 bg-white border border-gray-100 rounded-[2rem] md:rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-[#FFB800]/50 transition-all duration-500 cursor-pointer overflow-hidden ${addon.status === "Coming Soon" || addon.status === "Roadmap" ? "opacity-70" : ""}`}
                    >
                        <div className="flex items-start gap-4 md:gap-5">
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${addon.bgColor} ${addon.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                {addon.icon}
                            </div>
                            <div className="space-y-1 pr-10 md:pr-12">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base md:text-lg font-black text-[#1A1A2E]">{addon.title}</h4>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${addon.status === "Active" || addon.status === "Live"
                                        ? "bg-green-100 text-green-600"
                                        : "bg-gray-100 text-gray-400"
                                        }`}>
                                        {addon.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 font-bold leading-relaxed">{addon.desc}</p>
                            </div>
                        </div>

                        {/* Hover Arrow Icon - Explicitly positioned right */}
                        <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 pointer-events-none">
                            <svg className="w-6 h-6 text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                            </svg>
                        </div>

                        {/* Interactive glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#FFB800]/0 via-[#FFB800]/5 to-[#FFB800]/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

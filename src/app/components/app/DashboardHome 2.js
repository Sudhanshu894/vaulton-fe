"use client";

import { motion } from "framer-motion";

export default function DashboardHome({ onNavigate, user, balance, refreshBalance }) {
    return (
        <div className="space-y-8 md:space-y-12 animate-fade-in pb-24">
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Balance Card - Takes 2 columns on desktop */}
                <section className="lg:col-span-2 relative overflow-hidden bg-[#1A1A2E] text-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col justify-center min-h-[300px] md:min-h-[350px]">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB800]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <p className="text-gray-400 text-sm md:text-base font-bold tracking-tight">Total Balance</p>
                            <button
                                onClick={refreshBalance}
                                className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors active:scale-95"
                            >
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>

                        <div>
                            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-none break-all truncate max-w-full">${balance}</h2>
                            <div className="flex items-center gap-3 mt-4 group cursor-pointer w-fit max-w-full" onClick={() => user?.smartAccountId && navigator.clipboard.writeText(user.smartAccountId)}>
                                <p className="text-gray-400 text-sm font-mono truncate">{user?.smartAccountId ? `${user.smartAccountId.slice(0, 8)}...${user.smartAccountId.slice(-8)}` : 'No smart account deployed'}</p>
                                {user?.smartAccountId && (
                                    <svg className="w-5 h-5 text-gray-500 shrink-0 group-hover:text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-6 pt-4">
                            <div className="bg-white/5 p-4 md:p-6 rounded-3xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-300 min-w-0 overflow-hidden">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">USDC</p>
                                <p className="text-lg md:text-2xl font-black truncate">${balance}</p>
                                <p className="text-gray-500 text-[10px] font-bold truncate">{balance} USDC</p>
                            </div>
                            <div className="bg-white/5 p-4 md:p-6 rounded-3xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-300 min-w-0">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Network</p>
                                <p className="text-lg md:text-2xl font-black">Stellar</p>
                                <p className="text-gray-500 text-[10px] font-bold">Standard</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Actions - 1 column on desktop */}
                <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center gap-4 md:gap-6">
                    <h3 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest text-center lg:text-left">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {[
                            { id: 'send', label: 'Send', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', color: 'bg-blue-500' },
                            { id: 'receive', label: 'Receive', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01', color: 'bg-emerald-500' },
                            { id: 'autopay', label: 'Autopay', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'bg-purple-500' },
                            { id: 'anonymous', label: 'Anonymous Pay', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', color: 'bg-gray-800' }
                        ].map((action) => (
                            <button
                                key={action.id}
                                onClick={() => onNavigate(action.id)}
                                className="flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-50 rounded-2xl md:rounded-3xl hover:bg-white hover:shadow-xl transition-all duration-300 group"
                            >
                                <div className={`w-10 h-10 md:w-12 md:h-12 ${action.color} text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                                    </svg>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-[#1A1A2E] tracking-tight">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Active Autopay Section */}
                <section className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">Active Autopay</h3>
                        </div>
                        <button className="text-xs font-black text-[#FFB800] uppercase tracking-widest hover:underline">View All</button>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                name: "CloudHost Pro", date: "Next: Mar 17", amount: "$150.00", icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                name: "Spotify", date: "Next: Mar 14", amount: "$29.99", icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                name: "Savings Transfer", date: "Next: Mar 1", amount: "$500.00", icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-purple-50 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                        </svg>
                                    </div>
                                )
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 md:p-5 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group cursor-pointer">
                                <div className="flex items-center gap-5">
                                    {item.icon}
                                    <div className="min-w-0">
                                        <p className="text-base font-black text-[#1A1A2E] truncate">{item.name}</p>
                                        <p className="text-xs text-gray-400 font-bold truncate">{item.date}</p>
                                    </div>
                                </div>
                                <p className="text-sm md:text-base font-black text-[#1A1A2E]">{item.amount}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-400">Monthly autopay total</p>
                        <p className="text-xl font-black text-[#1A1A2E]">$819.97</p>
                    </div>
                </section>

                {/* Recent Activity Section */}
                <section className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl md:text-2xl font-black text-[#1A1A2E]">Recent Activity</h3>
                        <button className="text-xs font-black text-[#FFB800] uppercase tracking-widest hover:underline">View All</button>
                    </div>

                    <div className="space-y-6">
                        {[
                            {
                                name: "Alex Rivera",
                                label: "Invoice #1042 payment",
                                amount: "+$2,500.00",
                                date: "Feb 18",
                                type: "incoming",
                                icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                name: "StreamFlix",
                                label: "Monthly subscription",
                                amount: "-$89.99",
                                date: "Feb 17",
                                type: "outgoing",
                                icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                name: "Maya Chen",
                                label: "Dinner split",
                                amount: "-$45.00",
                                date: "Feb 16",
                                type: "outgoing",
                                icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    </div>
                                )
                            },
                            {
                                name: "Acme Corp",
                                label: "Payroll - Feb 2026",
                                amount: "+$8,750.00",
                                date: "Feb 15",
                                type: "incoming",
                                icon: (
                                    <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                )
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 -mx-6 px-4 md:px-6 py-3 rounded-[1.5rem] md:rounded-[2rem] transition-all">
                                <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                    {item.icon}
                                    <div className="min-w-0">
                                        <p className="text-base md:text-lg font-black text-[#1A1A2E] truncate">{item.name}</p>
                                        <p className="text-xs md:text-sm font-bold text-gray-400 truncate">{item.label}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-base md:text-lg font-black ${item.type === 'incoming' ? 'text-emerald-500' : 'text-[#1A1A2E]'}`}>{item.amount}</p>
                                    <p className="text-[10px] md:text-xs font-bold text-gray-300 uppercase tracking-widest">{item.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

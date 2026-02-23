"use client";

import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";

export default function HomePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-[#1A1A2E]">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-16 space-y-16">
                <section className="grid lg:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">
                            Vaulton Payments
                        </p>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                            Web3 payments designed to feel familiar.
                        </h1>
                        <p className="text-base md:text-lg font-semibold text-gray-500 leading-relaxed max-w-xl">
                            Send, receive, schedule autopay, and share payment requests with a passkey-first wallet experience.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard")}
                                className="px-6 py-3 rounded-2xl bg-[#1A1A2E] text-white font-black shadow-lg hover:shadow-xl"
                            >
                                Open App
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const el = document.getElementById("features");
                                    el?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="px-6 py-3 rounded-2xl bg-white border border-gray-200 text-[#1A1A2E] font-black"
                            >
                                Explore Features
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,184,0,0.25),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(26,26,46,0.12),transparent_45%)] rounded-[2.5rem]" />
                        <div className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wallet Balance</p>
                                    <p className="text-3xl md:text-4xl font-black text-[#1A1A2E]">$0.00</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-[#FFB800]/20 text-[#1A1A2E] flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Autopay</p>
                                    <p className="text-sm font-black text-[#1A1A2E] mt-2">Scheduled USDC</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receive</p>
                                    <p className="text-sm font-black text-[#1A1A2E] mt-2">QR + links</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-[#1A1A2E] text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Passkey-first</p>
                                <p className="text-sm font-bold mt-2 text-white/90">
                                    Sign payments with biometrics without browser extensions.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="space-y-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Features</p>
                        <h2 className="text-2xl md:text-4xl font-black tracking-tight">Everything you need to move USDC</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            {
                                title: "Smart Send",
                                desc: "Previous recipients, QR scanning, and payment-request links with prefilled details.",
                            },
                            {
                                title: "Autopay",
                                desc: "Schedule one-time payments, cancel pending items, and manually execute when needed.",
                            },
                            {
                                title: "Receive",
                                desc: "Generate shareable links and QR requests for web2-friendly web3 payments.",
                            },
                        ].map((card) => (
                            <div key={card.title} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                                <p className="text-base font-black text-[#1A1A2E]">{card.title}</p>
                                <p className="text-sm font-semibold text-gray-500 mt-2 leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="team" className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Team</p>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
                        <p className="text-lg md:text-xl font-black text-[#1A1A2E]">Vaulton</p>
                        <p className="text-sm font-semibold text-gray-500 mt-2">
                            Building a passkey-native payment experience so web2 users can use web3 rails without friction.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}

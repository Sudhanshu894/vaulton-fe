"use client";

import { motion } from "framer-motion";

function FeatureCard({ title, desc, number, icon, className, titleClassName = "" }) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            whileHover={{ y: -4 }}
            className={`relative overflow-hidden rounded-[2rem] border border-gray-100 shadow-sm ${className}`}
        >
            <div className="absolute right-4 top-4 text-5xl md:text-6xl font-black text-black/10 select-none">{number}</div>
            <div className="p-6 md:p-7 h-full flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-white/90 border border-white/70 shadow-sm flex items-center justify-center text-[#1A1A2E]">
                    {icon}
                </div>
                <h4 className={`mt-5 text-2xl md:text-3xl font-black tracking-tight ${titleClassName}`}>{title}</h4>
                <p className="mt-2 text-sm md:text-base leading-relaxed text-gray-600 font-semibold">{desc}</p>
            </div>
        </motion.article>
    );
}

export default function FeaturesSection() {
    return (
        <section id="features" className="py-20 md:py-24 bg-[#FAFAFA] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#FFB80014_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12 md:mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#FFB800] font-black tracking-[0.18em] uppercase text-xs md:text-sm mb-3 block"
                    >
                        The Vaulton Edge
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1A1A2E] tracking-tight"
                    >
                        Features Built Like Products
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 auto-rows-[220px] md:auto-rows-[240px] gap-4 md:gap-5">
                    <FeatureCard
                        number="01"
                        title="Secured Keyless Wallet"
                        desc="No seed phrase, no manual key backups. Biometrics are your native access layer."
                        className="md:col-span-2 xl:col-span-2 xl:row-span-2 bg-[#1A1A2E] text-white border-[#1A1A2E]"
                        titleClassName="text-white"
                        icon={
                            <svg className="w-6 h-6 text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a5 5 0 00-9.75 1.5v2.25H4A2 2 0 002 12.75v5.5A2 2 0 004 20.25h10a2 2 0 002-2v-5.5A2 2 0 0014 10.75h-1.25V8.5A2.5 2.5 0 1115 11h2a4.5 4.5 0 00-2-4z" />
                            </svg>
                        }
                    />

                    <FeatureCard
                        number="02"
                        title="Biometric Authentication"
                        desc="Passkeys and device security modules keep signing frictionless and secure."
                        className="bg-white"
                        icon={
                            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 0114 0" />
                            </svg>
                        }
                    />

                    <FeatureCard
                        number="03"
                        title="Gasless Payments"
                        desc="Users don’t manage network fuel manually. Transfers feel like web2 payments."
                        className="bg-white"
                        icon={
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                            </svg>
                        }
                    />

                    <FeatureCard
                        number="04"
                        title="Smart Autopay"
                        desc="Schedule payments with passkey authorization and clear lifecycle states."
                        className="md:col-span-2 xl:col-span-1 bg-gradient-to-br from-[#FFF5DF] to-[#FFE9B8]"
                        icon={
                            <svg className="w-6 h-6 text-[#B7791F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.6m14.8 2A8 8 0 004.6 9M20 20v-5h-.6M5 13a8 8 0 0014.4 2" />
                            </svg>
                        }
                    />

                    <FeatureCard
                        number="05"
                        title="Streaming + Tips"
                        desc="Share tip links and overlays so creators can receive and surface SuperChats live."
                        className="md:col-span-2 xl:col-span-1 bg-white"
                        icon={
                            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.5-2.2a1 1 0 011.5.9v6.6a1 1 0 01-1.5.9L15 14m-9 4h6a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        }
                    />
                </div>
            </div>
        </section>
    );
}

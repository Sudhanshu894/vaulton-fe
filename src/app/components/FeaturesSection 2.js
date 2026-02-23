"use client";

import { motion } from "framer-motion";

export default function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-[#FAFAFA] relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#FFB80010_1px,transparent_1px)] [background-size:40px_40px] opacity-30"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20 lg:mb-32">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#FFB800] font-black tracking-[0.2em] uppercase text-sm mb-4 block"
                    >
                        The Vaulton Edge
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black text-[#1A1A2E] tracking-tight"
                    >
                        Main Features <span className="text-gray-300">&</span> USPs
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Card 1: Passkey */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -15, scale: 1.02 }}
                        className="group relative bg-[#1A1A2E] p-12 rounded-[4rem] overflow-hidden shadow-2xl transition-all duration-500"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full transition-all group-hover:bg-white/10"></div>
                        <div className="relative z-10">
                            <div className="mb-10 p-5 bg-white/10 w-fit rounded-3xl backdrop-blur-md border border-white/10 text-[#FFB800]">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h4 className="text-3xl font-black text-white mb-8 leading-tight">Biometric <br />Citadel</h4>
                            <p className="text-gray-400 font-medium leading-relaxed text-lg">
                                Your biometrics are the only key. Powered by hardware-level secure enclaves, we've eliminated seed phrase vulnerability forever.
                            </p>
                        </div>
                        <div className="absolute bottom-10 right-12 text-white/5 text-9xl font-black italic select-none">01</div>
                    </motion.div>

                    {/* Card 2: Gasless */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ y: -15, scale: 1.02 }}
                        className="group relative bg-white p-12 rounded-[4rem] border border-gray-100 shadow-xl transition-all duration-500"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full transition-all group-hover:bg-indigo-100/50"></div>
                        <div className="relative z-10">
                            <div className="mb-10 p-5 bg-indigo-50 w-fit rounded-3xl text-indigo-600 shadow-sm border border-indigo-100">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h4 className="text-3xl font-black text-[#1A1A2E] mb-8 leading-tight">The Gasless <br />Protocol</h4>
                            <p className="text-gray-600 font-medium leading-relaxed text-lg">
                                Forget XLM balances. Every transaction is fuel-free for the user, powered by our high-performance paymaster infrastructure.
                            </p>
                        </div>
                        <div className="absolute bottom-10 right-12 text-gray-50 text-9xl font-black italic select-none">02</div>
                    </motion.div>

                    {/* Card 3: Autopay */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ y: -15, scale: 1.02 }}
                        className="group relative bg-gradient-to-br from-[#FFB800] to-[#E6A600] p-12 rounded-[4rem] shadow-2xl transition-all duration-500"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
                        <div className="relative z-10">
                            <div className="mb-10 p-5 bg-white/20 w-fit rounded-3xl backdrop-blur-lg border border-white/20 text-[#1A1A2E]">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h4 className="text-3xl font-black text-[#1A1A2E] mb-8 leading-tight">Immutable <br />Autopay</h4>
                            <p className="text-[#1A1A2E]/80 font-bold leading-relaxed text-lg">
                                A protocol-level commitment. We cannot temper transactions once scheduled—ensuring absolute reliability and trust in every payment.
                            </p>
                        </div>
                        <div className="absolute bottom-10 right-12 text-white/20 text-9xl font-black italic select-none">03</div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const teamMembers = [
    {
        name: "Sudhanshu",
        role: "Full-stack Engineer",
        image: "/about/sudhanshu_full-stack.jpeg",
        contribution: "Sudhanshu leads the end-to-end development, ensuring seamless integration between the frontend and core platform logic."
    },
    {
        name: "Ankur",
        role: "Backend Engineer",
        image: "/about/ankur_backend.jpeg",
        contribution: "Ankur architects the robust server-side systems and APIs that power Vaulton's keyless authentication."
    },
    {
        name: "Rachit",
        role: "Blockchain Engineer",
        image: "/about/rachit_blockchain.jpeg",
        contribution: "Rachit specializes in smart contract security and web3 protocols to ensure transparent and secure transactions."
    }
];

export default function About() {
    return (
        <div className="min-h-screen pt-24 md:pt-32 pb-20 px-6 relative overflow-hidden bg-[#FAFAFA]">
            {/* Background Decorative Elements */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Product Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mb-24"
                >
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-[#FFB800] font-bold tracking-wider uppercase mb-4">About the Product</h2>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A1A2E] leading-tight mb-8">
                                Re-imagining the <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A1A2E] to-[#4A4A6E]">Web3 Experience</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-gray-600 font-light leading-relaxed mb-8">
                                Vaulton is the ultimate keyless wallet designed to bridge the gap between traditional ease-of-use and blockchain security. By leveraging Passkey technology, we eliminate the need for complex seed phrases, making crypto transactions as simple as a biometric scan.
                            </p>
                            {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                                <div className="p-4 border-l-4 border-[#FFB800] bg-white shadow-sm rounded-r-xl">
                                    <h4 className="font-bold text-[#1A1A2E]">Secure</h4>
                                    <p className="text-sm text-gray-500">Biometric-first authentication</p>
                                </div>
                                <div className="p-4 border-l-4 border-[#1A1A2E] bg-white shadow-sm rounded-r-xl">
                                    <h4 className="font-bold text-[#1A1A2E]">Gasless Transaction</h4>
                                    <p className="text-sm text-gray-500">Zero gas fees for any transactions on-chain</p>
                                </div>
                            </div> */}
                        </div>
                        <div className="relative mt-12 lg:mt-0">
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl border border-gray-100"
                            >
                                <Image
                                    src="/about/about_heroimage.png"
                                    alt="Vaulton Product Experience"
                                    width={600}
                                    height={600}
                                    className="w-full h-auto rounded-2xl"
                                />
                            </motion.div>
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FFB800]/10 rounded-full blur-2xl"></div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Features & USPs - Custom Premium Design */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mb-32 relative"
                >
                    {/* Decorative background blur */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="text-center mb-20">
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="text-[#FFB800] font-black tracking-[0.2em] uppercase text-sm mb-4 block"
                        >
                            The Vaulton Edge
                        </motion.span>
                        <h3 className="text-4xl md:text-6xl font-black text-[#1A1A2E] tracking-tight">
                            Main Features <span className="text-gray-300">&</span> USPs
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Card 1: Passkey */}
                        <motion.div
                            whileHover={{ y: -12 }}
                            className="group relative bg-[#1A1A2E] p-10 rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-900/20"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full transition-all group-hover:bg-white/10"></div>
                            <div className="relative z-10">
                                <div className="mb-8 p-4 bg-white/10 w-fit rounded-2xl backdrop-blur-md border border-white/10 text-[#FFB800]">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h4 className="text-2xl font-bold text-white mb-6">Biometric <br />Citadel</h4>
                                <p className="text-gray-400 font-light leading-relaxed">
                                    Your biometrics are the only key. Powered by hardware-level secure enclaves, we've eliminated seed phrase vulnerability forever.
                                </p>
                            </div>
                            <div className="absolute bottom-6 right-10 text-white/5 text-8:xl font-black italic select-none">01</div>
                        </motion.div>

                        {/* Card 2: Gasless */}
                        <motion.div
                            whileHover={{ y: -12 }}
                            className="group relative bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full transition-all group-hover:bg-indigo-100/50"></div>
                            <div className="relative z-10">
                                <div className="mb-8 p-4 bg-indigo-50 w-fit rounded-2xl text-indigo-600">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h4 className="text-2xl font-bold text-[#1A1A2E] mb-6">The Gasless <br />Protocol</h4>
                                <p className="text-gray-600 font-light leading-relaxed">
                                    Forget XLM balances. Every transaction is fuel-free for the user, powered by our high-performance paymaster infrastructure.
                                </p>
                            </div>
                            <div className="absolute bottom-6 right-10 text-gray-50 text-8xl font-black italic select-none">02</div>
                        </motion.div>

                        {/* Card 3: Autopay */}
                        <motion.div
                            whileHover={{ y: -12 }}
                            className="group relative bg-gradient-to-br from-[#FFB800] to-[#E6A600] p-10 rounded-[3rem] shadow-2xl shadow-[#FFB800]/20"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
                            <div className="relative z-10">
                                <div className="mb-8 p-4 bg-white/20 w-fit rounded-2xl backdrop-blur-lg border border-white/20 text-[#1A1A2E]">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h4 className="text-2xl font-bold text-[#1A1A2E] mb-6">Immutable <br />Autopay</h4>
                                <p className="text-[#1A1A2E]/80 font-medium leading-relaxed">
                                    A protocol-level commitment. We cannot temper transactions once scheduled—ensuring absolute reliability and trust in every payment.
                                </p>
                            </div>
                            <div className="absolute bottom-6 right-10 text-white/20 text-8xl font-black italic select-none">03</div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Team Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="pt-10"
                >
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-[#FFB800] font-bold tracking-wider uppercase mb-4 text-sm sm:text-base">Our Visionaries</h2>
                        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A2E]">The Team Behind Vaulton</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {teamMembers.map((member, index) => (
                            <motion.div
                                key={member.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                                whileHover={{ y: -10 }}
                                className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border border-gray-100 group transition-all duration-300"
                            >
                                <div className="relative w-full aspect-square mb-6 sm:mb-8 overflow-hidden rounded-2xl">
                                    <Image
                                        src={member.image}
                                        alt={member.name}
                                        fill
                                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                <div className="text-center pb-4 border-b border-gray-100 mb-4">
                                    <h4 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">{member.name}</h4>
                                    <p className="text-[#FFB800] font-semibold text-sm sm:text-base">{member.role}</p>
                                </div>
                                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed text-center italic">
                                    "{member.contribution}"
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

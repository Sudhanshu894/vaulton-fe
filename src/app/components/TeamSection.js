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

export default function TeamSection() {
    return (
        <section id="team" className="py-24 bg-white relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-50 rounded-full blur-[100px] opacity-50 -z-10"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-[100px] opacity-50 -z-10"></div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 lg:mb-24">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#FFB800] font-black tracking-[0.2em] uppercase text-sm mb-4 block"
                    >
                        Our Visionaries
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black text-[#1A1A2E] tracking-tight"
                    >
                        The Team Behind <span className="text-[#FFB800]">Vaulton</span>
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            whileHover={{ y: -10 }}
                            className="bg-[#FAFAFA] rounded-[3rem] p-8 lg:p-10 border border-gray-100 group transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200/50"
                        >
                            <div className="relative w-full aspect-square mb-10 overflow-hidden rounded-[2rem]">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                                    <p className="text-white text-sm font-medium leading-relaxed italic">
                                        "{member.contribution}"
                                    </p>
                                </div>
                            </div>
                            <div className="text-center">
                                <h4 className="text-2xl lg:text-3xl font-black text-[#1A1A2E] mb-2">{member.name}</h4>
                                <span className="px-4 py-1.5 rounded-full bg-white text-[#FFB800] text-sm font-bold shadow-sm border border-gray-100">
                                    {member.role}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

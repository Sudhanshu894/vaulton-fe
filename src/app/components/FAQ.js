"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const faqs = [
    {
        question: "What is Vaulton?",
        answer: "Vaulton is a crypto wallet that uses Face ID or fingerprint instead of passwords. No need to remember seed phrases or type long passwords - just unlock with your face or finger like you unlock your phone. It's the easiest way to manage your crypto."
    },
    {
        question: "How is Vaulton different from Freighter or Albedo?",
        answer: "Freighter and Albedo require you to remember a 12-24 word seed phrase and type passwords. Vaulton uses passkeys - just your biometric (face/fingerprint). No passwords, no seed phrases to write down. It's completely passwordless and much simpler to use."
    },
    {
        question: "What if I lose my phone?",
        answer: "You can register passkeys on multiple devices (phone, laptop, tablet). If you lose one device, you still have access from your other devices. You can also add a hardware security key as backup. It's like having spare keys to your house."
    },
    {
        question: "Is Vaulton safe?",
        answer: "Very safe! Your passkey is locked behind your biometric and never leaves your device. Even if someone steals your phone, they can't access your wallet without your face or fingerprint. No seed phrases means nothing to steal or hack."
    }
];

export default function FAQ() {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleAccordion = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen pt-24 md:pt-32 pb-20 px-6 relative overflow-hidden bg-[#FAFAFA]">
            {/* Background Decorative Elements */}
            <div className="absolute top-20 right-10 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-20 left-10 w-64 h-64 bg-yellow-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-[#FFB800] font-bold tracking-wider uppercase mb-4 text-sm sm:text-base">Got Questions?</h2>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A1A2E] leading-tight">
                        Frequently Asked <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB800] to-[#E6A800]">Questions</span>
                    </h1>
                </motion.div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                        >
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none group cursor-pointer"
                            >
                                <span className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${activeIndex === index ? "text-[#FFB800]" : "text-[#1A1A2E] group-hover:text-[#FFB800]"}`}>
                                    {faq.question}
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${activeIndex === index ? "bg-[#FFB800] text-white rotate-180" : "bg-gray-100 text-gray-500 group-hover:bg-[#FFB800]/10"}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>
                            <AnimatePresence>
                                {activeIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

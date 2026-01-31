"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Support() {
    const [activeTab, setActiveTab] = useState("query");
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    // Form states
    const [queryForm, setQueryForm] = useState({
        title: "",
        description: "",
        walletAddress: "",
    });

    const [feedbackForm, setFeedbackForm] = useState({
        name: "",
        email: "",
        feedback: "",
    });

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleQuerySubmit = (e) => {
        e.preventDefault();
        console.log("Query submitted:", queryForm);
        // Add your submission logic here
        alert("Query submitted successfully!");
        setQueryForm({ title: "", description: "", walletAddress: "" });
    };

    const handleFeedbackSubmit = (e) => {
        e.preventDefault();
        console.log("Feedback submitted:", feedbackForm);
        // Add your submission logic here
        alert("Feedback shared successfully!");
        setFeedbackForm({ name: "", email: "", feedback: "" });
    };

    return (
        <div className="min-h-screen pt-24 md:pt-32 pb-10 px-6 relative overflow-hidden flex flex-col justify-start">
            {/* Animated Background Elements */}
            <motion.div
                className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-[#FFB800]/10 to-transparent rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#1A1A2E]/10 to-transparent rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A2E] mb-2">
                        Support Center
                    </h1>
                    <p className="text-base text-gray-600">
                        We're here to help. Reach out to us anytime.
                    </p>
                </motion.div>

                {/* Tab Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex justify-center mb-8"
                >
                    <div className="bg-white rounded-full p-1.5 shadow-lg inline-flex gap-2">
                        <motion.button
                            onClick={() => setActiveTab("query")}
                            className={`px-8 py-2.5 rounded-full font-semibold transition-all ${activeTab === "query"
                                ? "bg-[#1A1A2E] text-white"
                                : "text-gray-600 hover:text-[#1A1A2E]"
                                }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Raise Query
                        </motion.button>
                        <motion.button
                            onClick={() => setActiveTab("feedback")}
                            className={`px-8 py-2.5 rounded-full font-semibold transition-all ${activeTab === "feedback"
                                ? "bg-[#1A1A2E] text-white"
                                : "text-gray-600 hover:text-[#1A1A2E]"
                                }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Share Feedback
                        </motion.button>
                    </div>
                </motion.div>

                {/* Form Container with Cursor Interaction */}
                <motion.div
                    className="relative"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    {/* Cursor Follower Effect */}
                    <AnimatePresence>
                        {isHovering && (
                            <motion.div
                                className="absolute w-8 h-8 rounded-full bg-[#FFB800]/20 pointer-events-none blur-xl"
                                style={{
                                    left: mousePosition.x - 16,
                                    top: mousePosition.y - 16,
                                }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.2 }}
                            />
                        )}
                    </AnimatePresence>

                    <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 backdrop-blur-sm border border-gray-100">
                        <AnimatePresence mode="wait">
                            {activeTab === "query" ? (
                                <motion.form
                                    key="query"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.5 }}
                                    onSubmit={handleQuerySubmit}
                                    className="space-y-4"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                                            Query Title
                                        </label>
                                        <motion.input
                                            type="text"
                                            required
                                            value={queryForm.title}
                                            onChange={(e) =>
                                                setQueryForm({ ...queryForm, title: e.target.value })
                                            }
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white"
                                            placeholder="Brief title for your query"
                                            whileFocus={{ scale: 1.01 }}
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                                            Description
                                        </label>
                                        <motion.textarea
                                            required
                                            value={queryForm.description}
                                            onChange={(e) =>
                                                setQueryForm({
                                                    ...queryForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows="3"
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white resize-none"
                                            placeholder="Describe your query in detail..."
                                            whileFocus={{ scale: 1.01 }}
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                                            Wallet Address
                                        </label>
                                        <motion.input
                                            type="text"
                                            required
                                            value={queryForm.walletAddress}
                                            onChange={(e) =>
                                                setQueryForm({
                                                    ...queryForm,
                                                    walletAddress: e.target.value,
                                                })
                                            }
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white font-mono text-sm"
                                            placeholder="0x..."
                                            whileFocus={{ scale: 1.01 }}
                                        />
                                    </motion.div>

                                    <motion.button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-[#1A1A2E] to-[#2A2A3E] text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl"
                                        whileHover={{
                                            scale: 1.02,
                                            boxShadow: "0 20px 40px rgba(26, 26, 46, 0.3)",
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        Submit Query
                                    </motion.button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="feedback"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.5 }}
                                    onSubmit={handleFeedbackSubmit}
                                    className="space-y-4"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                                            Your Name
                                        </label>
                                        <motion.input
                                            type="text"
                                            required
                                            value={feedbackForm.name}
                                            onChange={(e) =>
                                                setFeedbackForm({
                                                    ...feedbackForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white"
                                            placeholder="Enter your name"
                                            whileFocus={{ scale: 1.01 }}
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                                            Email Address
                                        </label>
                                        <motion.input
                                            type="email"
                                            required
                                            value={feedbackForm.email}
                                            onChange={(e) =>
                                                setFeedbackForm({
                                                    ...feedbackForm,
                                                    email: e.target.value,
                                                })
                                            }
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white"
                                            placeholder="your.email@example.com"
                                            whileFocus={{ scale: 1.01 }}
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <label className="block text-sm font-semibold text-[#1A1A2E] mb-1.5">
                                            Your Feedback
                                        </label>
                                        <motion.textarea
                                            required
                                            value={feedbackForm.feedback}
                                            onChange={(e) =>
                                                setFeedbackForm({
                                                    ...feedbackForm,
                                                    feedback: e.target.value,
                                                })
                                            }
                                            rows="3"
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white resize-none"
                                            placeholder="Share your thoughts with us..."
                                            whileFocus={{ scale: 1.01 }}
                                        />
                                    </motion.div>

                                    <motion.button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-[#FFB800] to-[#FFA000] text-[#1A1A2E] py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl"
                                        whileHover={{
                                            scale: 1.02,
                                            boxShadow: "0 20px 40px rgba(255, 184, 0, 0.4)",
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        Share Feedback
                                    </motion.button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Floating Decorative Elements */}
                <motion.div
                    className="absolute -top-10 -right-10 w-20 h-20 bg-[#FFB800] rounded-full opacity-20 blur-2xl"
                    animate={{
                        y: [0, -20, 0],
                        x: [0, 10, 0],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#1A1A2E] rounded-full opacity-10 blur-2xl"
                    animate={{
                        y: [0, 20, 0],
                        x: [0, -10, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>
        </div>
    );
}

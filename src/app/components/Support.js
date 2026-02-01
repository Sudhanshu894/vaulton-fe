"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupportTicket, getSupportTickets } from "../../services/backendservices";

export default function Support() {
    const [activeTab, setActiveTab] = useState("query");
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [user, setUser] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [queryForm, setQueryForm] = useState({
        title: "",
        description: "",
        walletAddress: "",
    });

    const [feedbackForm, setFeedbackForm] = useState({
        title: "", // Mapped from 'name' visually
        walletAddress: "", // Mapped from 'email' visually, but now address
        description: "", // Mapped from 'feedback' visually
    });

    useEffect(() => {
        const savedUser = localStorage.getItem('vaulton_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            if (parsedUser.smartAccountId) {
                setQueryForm(prev => ({ ...prev, walletAddress: parsedUser.smartAccountId }));
                setFeedbackForm(prev => ({ ...prev, walletAddress: parsedUser.smartAccountId }));
                // fetchTickets calls are handled by the page/user dependency effect below
            }
        }
    }, []);

    useEffect(() => {
        if (user?.smartAccountId) {
            fetchTickets(user.smartAccountId, page);
        }
    }, [page, user]);

    const fetchTickets = async (address, pageNum) => {
        setIsLoading(true);
        try {
            const data = await getSupportTickets(address, pageNum);
            setTickets(data.tickets);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error("Failed to fetch tickets", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleQuerySubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createSupportTicket({
                ...queryForm,
                type: 'query'
            });
            alert("Query submitted successfully!");
            setQueryForm(prev => ({ ...prev, title: "", description: "" }));
            // Refresh tickets
            if (user?.smartAccountId) fetchTickets(user.smartAccountId, 1);
        } catch (error) {
            console.error(error);
            alert("Failed to submit query.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createSupportTicket({
                title: feedbackForm.title,
                description: feedbackForm.description,
                walletAddress: feedbackForm.walletAddress,
                type: 'feedback'
            });
            alert("Feedback shared successfully!");
            setFeedbackForm(prev => ({ ...prev, title: "", description: "" }));
        } catch (error) {
            console.error(error);
            alert("Failed to submit feedback.");
        } finally {
            setIsSubmitting(false);
        }
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

            <div className="max-w-7xl mx-auto relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* Left Column: Forms */}
                <div>
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center lg:text-left mb-8"
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
                        className="flex justify-center lg:justify-start mb-8"
                    >
                        <div className="bg-white rounded-full p-1.5 shadow-lg inline-flex gap-2">
                            <motion.button
                                onClick={() => setActiveTab("query")}
                                className={`px-8 py-2.5 rounded-full font-semibold transition-all cursor-pointer ${activeTab === "query"
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
                                className={`px-8 py-2.5 rounded-full font-semibold transition-all cursor-pointer ${activeTab === "feedback"
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
                                                readOnly={!!user?.smartAccountId}
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
                                            disabled={isSubmitting}
                                            className="w-full bg-gradient-to-r from-[#1A1A2E] to-[#2A2A3E] text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer"
                                            whileHover={{
                                                scale: 1.02,
                                                boxShadow: "0 20px 40px rgba(26, 26, 46, 0.3)",
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Query'}
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
                                                value={feedbackForm.title}
                                                onChange={(e) =>
                                                    setFeedbackForm({
                                                        ...feedbackForm,
                                                        title: e.target.value,
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
                                                Enter your email
                                            </label>
                                            <motion.input
                                                type="text"
                                                required
                                                value={feedbackForm.email}
                                                onChange={(e) =>
                                                    setFeedbackForm({
                                                        ...feedbackForm,
                                                        email: e.target.value,
                                                    })
                                                }
                                                className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#FFB800] focus:outline-none transition-all bg-gray-50 focus:bg-white font-mono text-sm"
                                                placeholder="Email Address"
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
                                                value={feedbackForm.description}
                                                onChange={(e) =>
                                                    setFeedbackForm({
                                                        ...feedbackForm,
                                                        description: e.target.value,
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
                                            disabled={isSubmitting}
                                            className="w-full bg-gradient-to-r from-[#FFB800] to-[#FFA000] text-[#1A1A2E] py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer"
                                            whileHover={{
                                                scale: 1.02,
                                                boxShadow: "0 20px 40px rgba(255, 184, 0, 0.4)",
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Share Feedback'}
                                        </motion.button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Opened Tickets */}
                <div className="flex flex-col h-full">
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 h-full flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-[#1A1A2E]">Opened Tickets</h2>
                            <button
                                onClick={() => user?.smartAccountId && fetchTickets(user.smartAccountId, page)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#1A1A2E] cursor-pointer"
                                disabled={isLoading}
                                title="Refresh Tickets"
                            >
                                <motion.svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    animate={isLoading ? { rotate: 720 } : { rotate: 0 }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </motion.svg>
                            </button>
                        </div>

                        {!user?.smartAccountId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <p>Please login to view your tickets</p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                Loading...
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p>No open tickets found.</p>
                                <p className="text-sm mt-2">Submit a query to get started.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {tickets.map((ticket) => (
                                    <div key={ticket._id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-[#1A1A2E] line-clamp-1">{ticket.title}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                {ticket.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                            <span className="font-mono">#{ticket._id.slice(-6)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-[#1A1A2E] disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-400">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-[#1A1A2E] disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

export default function ReleaseNotesPage() {
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        const savedNotes = localStorage.getItem("vaulton_release_notes");
        if (savedNotes) {
            setNotes(JSON.parse(savedNotes));
        } else {
            // Default notes if empty
            const defaultNotes = [
                {
                    id: 1,
                    version: "v1.0.0",
                    date: "2026-02-21",
                    title: "Initial Launch",
                    content: "The first version of Vaulton is now live! Keyless authentication, gasless transactions, and biometric security are all ready for use.",
                    type: "Major"
                }
            ];
            setNotes(defaultNotes);
            localStorage.setItem("vaulton_release_notes", JSON.stringify(defaultNotes));
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <Navbar />
            <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] mb-4">Release Notes</h1>
                    <p className="text-gray-500 text-lg">Stay updated with the latest features and improvements in Vaulton.</p>
                </motion.div>

                <div className="space-y-8">
                    {notes.map((note, index) => (
                        <motion.div
                            key={note.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${note.type === 'Major' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {note.type}
                                </span>
                                <span className="text-gray-400 font-medium">{note.date}</span>
                                <span className="text-[#FFB800] font-black text-lg">{note.version}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-[#1A1A2E] mb-4">{note.title}</h3>
                            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {note.content}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    );
}

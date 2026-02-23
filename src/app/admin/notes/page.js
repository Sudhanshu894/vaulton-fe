"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";

export default function AdminNotesPage() {
    const [title, setTitle] = useState("");
    const [version, setVersion] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("Minor");
    const [notes, setNotes] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const savedNotes = localStorage.getItem("vaulton_release_notes");
        if (savedNotes) {
            setNotes(JSON.parse(savedNotes));
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const newNote = {
            id: Date.now(),
            title,
            version,
            content,
            type,
            date: new Date().toISOString().split('T')[0]
        };
        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        localStorage.setItem("vaulton_release_notes", JSON.stringify(updatedNotes));

        // Reset form
        setTitle("");
        setVersion("");
        setContent("");
        setMessage("Release note added successfully!");
        setTimeout(() => setMessage(""), 3000);
    };

    const deleteNote = (id) => {
        const updatedNotes = notes.filter(note => note.id !== id);
        setNotes(updatedNotes);
        localStorage.setItem("vaulton_release_notes", JSON.stringify(updatedNotes));
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <Navbar />
            <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">Admin: Add Release Notes</h1>
                    <p className="text-gray-500">Manage the updates shown to users.</p>
                </motion.div>

                {message && (
                    <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-xl font-medium">
                        {message}
                    </div>
                )}

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-12">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-[#1A1A2E] mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                                    placeholder="Feature update..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#1A1A2E] mb-2">Version</label>
                                <input
                                    type="text"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                                    placeholder="v1.0.1"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#1A1A2E] mb-2">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                            >
                                <option value="Minor">Minor Update</option>
                                <option value="Major">Major Launch</option>
                                <option value="Patch">Patch/Fix</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#1A1A2E] mb-2">Release Content</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800] min-h-[150px]"
                                placeholder="Describe the changes..."
                                required
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-[#1A1A2E] text-white rounded-xl font-bold hover:bg-[#2A2A4E] transition-all"
                        >
                            Publish Release Note
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6">Existing Notes</h2>
                    {notes.map((note) => (
                        <div key={note.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                            <div>
                                <span className="font-bold text-[#1A1A2E] mr-2">{note.version}</span>
                                <span className="text-gray-500">{note.title}</span>
                            </div>
                            <button
                                onClick={() => deleteNote(note.id)}
                                className="text-red-500 hover:text-red-700 font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

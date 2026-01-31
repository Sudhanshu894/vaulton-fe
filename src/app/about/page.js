"use client";

import Navbar from "../components/Navbar";
import About from "../components/About";
import Animations from "../components/Animations";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] overflow-hidden">
            <Navbar />
            <About />
            <Animations />
        </div>
    );
}

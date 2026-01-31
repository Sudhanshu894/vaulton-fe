"use client";

import Navbar from "../components/Navbar";
import Support from "../components/Support";
import Animations from "../components/Animations";

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-[#F8F8F8] overflow-hidden">
            <Navbar />
            <Support />
            <Animations />
        </div>
    );
}

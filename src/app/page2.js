"use client";

import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import Animations from "./components/Animations";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] overflow-hidden">
      <Navbar />
      <HeroSection />
      <Animations />
    </div>
  );
}

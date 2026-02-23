import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import TeamSection from "./components/TeamSection";
import Animations from "./components/Animations";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const type = resolvedSearchParams?.type;

  if (type !== "landing") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F8F9FB] text-[#1A1A2E] overflow-x-hidden">
      <Animations />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <TeamSection />

      {/* Footer minimal */}
      {/* <footer className="py-12 px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFB800] flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo.png" alt="" className="brightness-0 object-contain w-full h-full" />
            </div>
            <span className="text-xl font-black text-[#1A1A2E] tracking-tight">Vaulton</span>
          </div>
          <p className="text-gray-400 text-sm font-bold">© 2026 Vaulton. All rights reserved.</p>
          <div className="flex gap-6 text-sm font-bold text-gray-400">
            <a href="#" className="hover:text-[#FFB800]">Privacy</a>
            <a href="#" className="hover:text-[#FFB800]">Terms</a>
            <a href="#" className="hover:text-[#FFB800]">Twitter</a>
          </div>
        </div>
      </footer> */}
    </main>
  );
}

"use client";

import Image from "next/image";

export default function FloatingCard({ children, className = "", animationClass = "" }) {
    return (
        <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow ${animationClass} ${className}`}>
            {children}
        </div>
    );
}

"use client";

export default function Animations() {
    return (
        <style jsx global>{`
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-20px);
        }
      }

      @keyframes float-delayed {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-15px);
        }
      }

      .animate-float {
        animation: float 3s ease-in-out infinite;
      }

      .animate-float-delayed {
        animation: float-delayed 3s ease-in-out infinite;
        animation-delay: 0.5s;
      }
    `}</style>
    );
}

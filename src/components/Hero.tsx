"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  onEnter?: () => void;
}

export default function Hero({ onEnter }: HeroProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className={`relative h-screen w-full flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/zenvic.png"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/hero section/video_2026-04-14_22-15-41.mp4" type="video/mp4" />
        {/* Fallback can be added here if a mobile image is provided */}
      </video>

      {/* Readable Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />

      {/* Content */}
      <div className="relative z-20 text-center px-6 max-w-5xl translate-y-[-10%] sm:translate-y-0">
        <h1 className="text-[12vw] sm:text-[100px] font-bebas leading-[0.85] text-white tracking-tighter mb-8 flex flex-col">
          <span>THE FUTURE OF</span>
          <span className="relative">
            <span className="absolute inset-0 bg-gradient-to-r from-[#c8ff00] to-[#0af0ff] bg-clip-text text-transparent opacity-80">WEB3 MESSAGING</span>
            <span className="relative" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.2)", color: "transparent" }}>WEB3 MESSAGING</span>
          </span>
        </h1>
        
        <p className="font-bebas text-sm sm:text-xl text-[#f0ede8]/70 max-w-2xl mx-auto leading-relaxed mb-12 uppercase tracking-[6px]">
          SECURE MESSAGING // INSTANT PAYMENTS // BLOCKCHAIN PRIVACY
          <br />
          POWERED BY STARKNET
        </p>

        <div className="flex justify-center">
          <button 
            onClick={onEnter}
            className="px-12 py-5 bg-[#c8ff00] text-black font-bebas text-2xl tracking-[4px] shadow-[0_0_30px_rgba(200,255,0,0.3)] hover:shadow-[0_0_50px_rgba(200,255,0,0.5)] hover:-translate-y-1 transition-all flex items-center gap-4 group active:scale-95 border-b-4 border-black/20"
          >
            LAUNCH APP <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce opacity-40">
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent to-white" />
      </div>
    </section>
  );
}

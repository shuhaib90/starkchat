"use client";

import React, { useEffect, useState } from "react";

export function SignalLoader() {
  const [dots, setDots] = useState<boolean[]>(new Array(9).fill(false));
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Independent flicker logic
    dots.forEach((_, i) => {
      const delay = Math.random() * 600;
      setTimeout(() => {
        setDots((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay);
    });

    // Final finish delay
    const timer = setTimeout(() => {
      setIsDone(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (isDone) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-[#06070a] flex flex-col items-center justify-center transition-all duration-300 pointer-events-none">
      {/* Scan line */}
      <div className="absolute inset-x-0 h-[100vh] pointer-events-none overflow-hidden z-[10001]">
        <div className="w-full h-[2px] bg-[#c8ff00]/10 shadow-[0_0_15px_#c8ff00] animate-scan" />
      </div>

      <div className="relative flex flex-col items-center gap-12">
        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-3 p-8 border border-[#1a1d28] bg-[#0e1016]">
          {dots.map((active, i) => (
            <div 
              key={i}
              className={`w-4 h-4 transition-all duration-300 border border-[#1a1d28] ${
                active ? "bg-[#c8ff00] shadow-[0_0_10px_#c8ff00]" : "bg-[#1a1d28]"
              }`}
              style={{
                transitionDelay: `${Math.random() * 200}ms`
              }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="font-['DM_Mono'] text-[11px] tracking-[4px] text-[#c8ff00] flex items-center gap-1 uppercase">
            Establishing Signal
            <span className="animate-pulse">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}

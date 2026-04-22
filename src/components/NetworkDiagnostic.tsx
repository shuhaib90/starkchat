"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Wifi, WifiOff, X, Cpu } from "lucide-react";

interface NetworkDiagnosticProps {
  message: string;
  type: "warning" | "error" | "info";
  onClose: () => void;
}

export function NetworkDiagnostic({ message, type, onClose }: NetworkDiagnosticProps) {

  const getStyle = () => {
    switch (type) {
      case "error": return { icon: <WifiOff className="w-5 h-5" />, color: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10" };
      case "warning": return { icon: <AlertTriangle className="w-5 h-5" />, color: "text-[#ffd24d]", border: "border-[#ffd24d]/30", bg: "bg-[#ffd24d]/10" };
      default: return { icon: <Wifi className="w-5 h-5" />, color: "text-[#0af0ff]", border: "border-[#0af0ff]/30", bg: "bg-[#0af0ff]/10" };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed top-24 right-6 z-[200] w-full max-w-sm animate-in slide-in-from-right duration-500">
      <div className={`relative overflow-hidden border-2 shadow-2xl backdrop-blur-2xl rounded-lg ${style.bg} ${style.border}`}>
        

        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-md bg-white/5 border border-white/10 ${style.color}`}>
              {style.icon}
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bebas text-lg tracking-[3px] text-white">SYSTEM_DIAGNOSTIC</h4>
                <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="font-['DM_Mono'] text-[10px] leading-relaxed text-white/60 uppercase tracking-widest pt-1">
                {message}
              </p>

              <div className="flex items-center gap-3 pt-4">
                <div className="flex items-center gap-2 text-[8px] font-['DM_Mono'] text-white/20 uppercase">
                  <Cpu className="w-3 h-3" />
                  STARKNET_MAINNET
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scanning line effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan" />
      </div>
    </div>
  );
}

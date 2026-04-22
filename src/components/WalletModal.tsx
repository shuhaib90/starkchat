"use client";

import React, { useEffect, useState } from "react";
import { X, Shield, Wallet, Star } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (walletId: string) => void;
  isConnecting: boolean;
}

export function WalletModal({ isOpen, onClose, onSelect, isConnecting }: WalletModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const wallets = [
    {
      id: "argentX",
      name: "Ready Wallet (formerly Argent)",
      recommended: true,
      icon: (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
          <Star className="w-5 h-5 text-[#c8ff00] fill-[#c8ff00]" />
        </div>
      )
    },
    {
      id: "braavos",
      name: "Braavos",
      recommended: false,
      icon: (
        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/30 text-orange-500">
           <Shield className="w-5 h-5" />
        </div>
      )
    },
    {
      id: "okxwallet",
      name: "OKX Wallet",
      recommended: true,
      icon: (
        <div className="w-8 h-8 rounded-none bg-white flex items-center justify-center">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-1.5 h-1.5 bg-black" />
            <div className="w-1.5 h-1.5 bg-black" />
            <div className="w-1.5 h-1.5 bg-black" />
            <div className="w-1.5 h-1.5 bg-black" />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#06070a]/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#0e1016] border-2 border-white/10 shadow-[20px_20px_0px_#06070a] rounded-xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-[4px] font-bold mb-1">CONNECT_TO</p>
              <h2 className="text-3xl font-bebas tracking-tighter text-white">
                STARKHUB <span className="text-[#c8ff00]">//</span> UNIFIED
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-white/20 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Wallet List */}
        <div className="p-4 space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => onSelect(wallet.id)}
              disabled={isConnecting}
              className="group relative w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-[#c8ff00]/40 transition-all duration-300 rounded-lg hover:shadow-[0_0_20px_rgba(200,255,0,0.05)] disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  {wallet.icon}
                  {wallet.recommended && (
                     <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#c8ff00] rounded-full animate-pulse" />
                  )}
                </div>
                <div className="text-left">
                  <span className="block font-bebas text-lg text-white/80 group-hover:text-[#c8ff00] transition-colors tracking-widest uppercase">
                    {wallet.name}
                  </span>
                </div>
              </div>

              {wallet.recommended && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#c8ff00]/10 border border-[#c8ff00]/30 rounded-sm">
                   <Star className="w-2.5 h-2.5 text-[#c8ff00] fill-[#c8ff00]" />
                   <span className="text-[8px] font-unbounded text-[#c8ff00] font-bold tracking-widest uppercase">RECOMMENDED</span>
                </div>
              )}
              
              {/* Hover effect highlight */}
              <div className="absolute inset-0 bg-[#c8ff00]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
            <p className="text-[9px] text-white/20 font-mono uppercase tracking-[2px]">
              Ready Wallet & OKX are optimized for Starknet Mainnet Handshakes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

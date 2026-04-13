"use client";

import React from "react";
import { useWallet } from "./StarkzapProvider";
import { Wallet, LogOut, Loader2, Cpu } from "lucide-react";
import { AvatarPicker } from "./AvatarPicker";

export function ConnectWalletButton() {
  const { address, connectWallet, disconnectWallet, isConnecting } = useWallet();

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (address) {
    return (
      <div className="flex items-center gap-4">
        <AvatarPicker size={10} />
        <div className="hidden sm:flex flex-col items-end">
          <span className="font-unbounded text-[8px] text-[#c8ff00] uppercase tracking-widest">CONNECTED</span>
          <span className="font-mono-strict text-[10px] text-white/40">{shortenAddress(address)}</span>
        </div>
        <button
          onClick={disconnectWallet}
          className="group flex items-center justify-center w-10 h-10 bg-[#0e1016] border-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 rounded-md shadow-[4px_4px_0px_rgba(239,68,68,0.1)] active:scale-90"
          title="Disconnect Signal"
        >
          <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="group relative flex items-center gap-3 bg-[#0e1016] border-2 border-[#c8ff00] text-[#c8ff00] hover:bg-[#c8ff00] hover:text-black font-bebas text-lg tracking-[2px] py-2 px-6 shadow-[6px_6px_0px_#06070a] hover:shadow-[0px_0px_20px_rgba(200,255,0,0.3)] transition-all duration-300 disabled:opacity-50 active:translate-x-1 active:translate-y-1 active:shadow-none"
    >
      {isConnecting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Cpu className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
      )}
      <span>{isConnecting ? "CONNECTING..." : "CONNECT WALLET"}</span>
      
      {/* Brutalist corner accents */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#c8ff00]" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#c8ff00]" />
    </button>
  );
}

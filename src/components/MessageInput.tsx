"use client";

import React, { useState } from "react";
import { Send, DollarSign, Lock, HandCoins, Terminal } from "lucide-react";

interface MessageInputProps {
  receiverAddress: string;
  onOpenSendMoney: () => void;
  onOpenRequestMoney: () => void;
  onOpenLockMessage: () => void;
  onSendText: (content: string) => void;
}

export function MessageInput({ 
  receiverAddress, 
  onOpenSendMoney, 
  onOpenRequestMoney, 
  onOpenLockMessage,
  onSendText 
}: MessageInputProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSendText(content);
      setContent("");
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="px-2 py-0.5 bg-[#c8ff00]/10 border border-[#c8ff00]/30 rounded-full">
          <span className="font-unbounded text-[7px] text-[#c8ff00] uppercase tracking-widest">SECURE</span>
        </div>
        <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
          <span className="font-['DM_Mono'] text-[8px] text-white/20 uppercase tracking-[2px]">PEER: {receiverAddress.slice(0, 10)}...{receiverAddress.slice(-6)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative flex items-center bg-white/[0.03] border border-white/10 focus-within:border-[#c8ff00]/30 rounded-xl transition-all overflow-hidden">
          <div className="flex items-center justify-center pl-4 pr-2 text-[#c8ff00]/40 font-mono text-sm">
            <span className="animate-pulse">&gt;</span>
          </div>
          
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent py-4 text-[#f0ede8] font-['DM_Mono'] text-sm placeholder:text-white/10 focus:outline-none"
          />
          
          <button
            type="submit"
            disabled={!content.trim()}
            className="px-6 py-4 bg-[#c8ff00] text-black hover:bg-[#d8ff40] transition-all disabled:opacity-20 font-bebas text-lg tracking-[3px]"
          >
            SEND
          </button>
        </div>

        {/* Action Buttons Area */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenSendMoney}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 font-bebas text-xs tracking-[2px] rounded-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <DollarSign className="w-3.5 h-3.5" /> TRANSFER
          </button>
          
          <button
            type="button"
            onClick={onOpenRequestMoney}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-indigo-400 font-bebas text-xs tracking-[2px] rounded-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <HandCoins className="w-3.5 h-3.5" /> REQUEST
          </button>
          
          <button
            type="button"
            onClick={onOpenLockMessage}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-magenta/10 hover:border-magenta/30 text-magenta font-bebas text-xs tracking-[2px] rounded-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" /> LOCK
          </button>
        </div>
      </form>
    </div>
  );
}

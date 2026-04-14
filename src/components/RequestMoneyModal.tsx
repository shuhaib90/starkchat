"use client";

import React, { useState } from "react";
import { useWallet } from "./StarkzapProvider";
import { X, HandCoins, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeAddress } from "@/lib/address";

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverAddress: string;
}

export function RequestMoneyModal({ isOpen, onClose, receiverAddress }: RequestMoneyModalProps) {
  const { address, showDiagnostic } = useWallet();
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<"STRK" | "ETH">("STRK");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    if (!receiverAddress.startsWith("0x") || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Invalid address or amount");
      return;
    }

    try {
      setIsSending(true);

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_address: normalizeAddress(address),
          receiver_address: normalizeAddress(receiverAddress),
          type: "request",
          content: amount, 
          amount: Number(amount),
          token: token,
          status: "pending"
        });

      if (error) {
        console.error("[StarkChat] Request Insert Error:", error);
        throw error;
      }

      onClose();
      setAmount("");
    } catch (err: any) {
      console.error("Request failed", err);
      // @ts-ignore
      showDiagnostic(`Request failed: ${err.message || "Network Error"}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06070a]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0e1016] border-2 border-white/10 w-full max-w-md shadow-[16px_16px_0px_#06070a] rounded-lg overflow-hidden transform transition-all animate-anti-gravity">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-white/5 bg-white/[0.02]">
          <h2 className="text-2xl font-bebas tracking-[2px] text-white flex items-center gap-3">
            <HandCoins className="w-6 h-6 text-[#0af0ff]" />
            REQUEST_TRANSMISSION
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 text-white/40 hover:text-white transition-all rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleRequest} className="p-8 space-y-6">
          {/* Token Selector */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Asset_Selection</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border-2 border-white/5 rounded-sm">
              <button
                type="button"
                onClick={() => setToken("STRK")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  token === "STRK" ? "bg-[#ffd24d] text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                STRK
              </button>
              <button
                type="button"
                onClick={() => setToken("ETH")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  token === "ETH" ? "bg-[#0af0ff] text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                ETH
              </button>
            </div>
          </div>

          {/* Peer ID Display */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Target_Peer</label>
            <div className="bg-black/40 border-2 border-white/5 px-4 py-3 text-[#0af0ff] font-mono-strict text-xs truncate rounded-sm">
              {receiverAddress}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Requested_Amount</label>
            <div className="relative flex items-center bg-black/40 border-2 border-white/5 focus-within:border-[#0af0ff]/40 transition-all rounded-sm overflow-hidden">
              <input
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent pl-4 pr-20 py-4 text-[#f0ede8] font-bebas text-3xl focus:outline-none placeholder:text-white/10"
                required
              />
              <div className={`absolute right-0 h-full px-4 flex items-center bg-white/5 border-l border-white/5 font-bebas tracking-widest ${token === 'STRK' ? 'text-[#ffd24d]' : 'text-[#0af0ff]'}`}>
                {token}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full relative py-4 bg-[#0af0ff] text-black font-bebas text-xl tracking-[4px] hover:bg-[#5ff6ff] transition-all group active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 overflow-hidden"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> DISPATCHING_SIGNAL...
              </>
            ) : (
              <>
                SEND_REQUEST <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
            
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity" />
          </button>
        </form>
      </div>
    </div>
  );
}

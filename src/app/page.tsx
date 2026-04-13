"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { Zap, MessageSquare, ArrowRight, Terminal } from "lucide-react";
import { useWallet } from "@/components/StarkzapProvider";
import { RecentChats } from "@/components/RecentChats";
import { LandingPage } from "@/components/LandingPage";

export default function Home() {
  const [targetAddress, setTargetAddress] = useState("");
  const [showLanding, setShowLanding] = useState(false);
  const router = useRouter();
  const { address } = useWallet();

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetAddress.trim() && targetAddress.startsWith("0x")) {
      router.push(`/chat/${targetAddress.trim()}`);
    }
  };

  // If address is lost (disconnected), ensure we show landing
  const isDashboardView = !!address && !showLanding;

  return (
    <main className="min-h-screen w-full flex flex-col p-4 sm:p-6 lg:p-8 relative bg-[#06070a]">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      
      {/* Navbar Overlay - Brutalist Style */}
      <header className="flex justify-between items-center w-full max-w-6xl mx-auto h-20 bg-[#0e1016]/80 backdrop-blur-xl border-2 border-white/10 shadow-[8px_8px_0px_#06070a] rounded-lg px-6 sm:px-8 mb-12 z-50 shrink-0">
        <button 
          onClick={() => setShowLanding(!showLanding)}
          className="flex items-center gap-4 hover:opacity-80 transition-all active:scale-95"
        >
          <div className="p-2.5 bg-[#c8ff00] rounded-md shadow-[4px_4px_0px_#06070a] border border-black/10">
            <Zap className="w-6 h-6 text-black fill-black" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bebas tracking-tighter text-white leading-none">
              StarkChat
            </h1>
            <p className="text-[9px] font-unbounded text-[#c8ff00] tracking-[2px] uppercase mt-1">Node_Signal.01</p>
          </div>
        </button>
        
        <ConnectWalletButton />
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto z-40">
        {isDashboardView ? (
          <div className="max-w-3xl mx-auto flex flex-col items-center pt-10 pb-20 animate-anti-gravity">
            <div className="w-20 h-20 bg-[#c8ff00]/5 rounded-lg flex items-center justify-center mb-10 border-2 border-dashed border-[#c8ff00]/20 relative">
              <MessageSquare className="w-10 h-10 text-[#c8ff00]" />
              <div className="absolute -top-2 -right-2 bg-[#c8ff00] text-black font-unbounded text-[8px] px-1.5 py-0.5 rounded-sm">LIVE</div>
            </div>
            
            <h2 className="text-5xl font-bebas tracking-tighter text-white mb-4 text-center">DECENTRALIZED_INBOX</h2>
            <p className="font-['DM_Mono'] text-[#f0ede8]/40 text-center mb-12 max-w-md uppercase tracking-tighter text-xs">
              Establish a secure peer-to-peer transmission channel. 
              Enter a verified Starknet address to begin.
            </p>

            <form onSubmit={handleStartChat} className="w-full relative group mb-16 overflow-visible">
              <div className="relative flex items-center bg-[#0e1016] border-2 border-white/10 group-focus-within:border-[#c8ff00]/50 transition-all shadow-[8px_8px_0px_#06070a]">
                <div className="flex items-center justify-center px-6 h-16 bg-white/5 border-r border-white/10 text-[#c8ff00] font-mono-strict">
                  <Terminal className="w-5 h-5 mr-3" />
                  <span className="animate-pulse">&gt;</span>
                </div>
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="ADDRESS_HEX (0x...)"
                  className="flex-1 bg-transparent px-6 h-16 text-white text-lg placeholder:text-white/10 focus:outline-none font-mono-strict"
                  required
                />
                <button
                  type="submit"
                  disabled={!targetAddress.startsWith("0x")}
                  className="h-16 px-10 flex items-center justify-center bg-[#c8ff00] hover:bg-[#d8ff40] text-black font-bebas text-xl tracking-widest transition-all disabled:opacity-20 active:scale-95"
                >
                  START_SIGNAL <ArrowRight className="w-5 h-5 ml-3" />
                </button>
              </div>
            </form>
            
            <RecentChats />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <LandingPage onEnter={() => setShowLanding(false)} />
            {address && (
              <button 
                onClick={() => setShowLanding(false)}
                className="mt-12 px-10 py-5 bg-[#c8ff00] text-black font-bebas text-2xl tracking-[4px] shadow-[8px_8px_0px_#06070a] hover:shadow-[12px_12px_0px_#06070a] hover:-translate-x-1 hover:-translate-y-1 transition-all flex items-center gap-4 group active:scale-95 mb-20"
              >
                RETURN_TO_INBOX <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

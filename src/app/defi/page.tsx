"use client";

import React, { useState, useEffect, Suspense } from "react";
import { SimpleEarn } from "@/components/defi/SimpleEarn";
import { StakingHub } from "@/components/defi/Staking";
import { SwapHub } from "@/components/defi/SwapHub";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/components/StarkzapProvider";
import { ArrowLeft, Coins, Landmark, ArrowRightLeft, ShieldOff, AlertCircle, ArrowRight } from "lucide-react";

function DefiContent() {
  const { address, connectWallet } = useWallet();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"lending" | "staking" | "swap">("lending");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "lending" || tab === "staking" || tab === "swap") {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  if (!address) {
    return (
      <div className="min-h-screen bg-[#06070a] text-white font-mono selection:bg-[#c8ff00] selection:text-black flex flex-col relative overflow-hidden">
        {/* Navigation */}
        <nav className="relative z-10 border-b-2 border-white/5 bg-[#06070a]/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/" className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
                 <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </Link>
              <div className="h-8 w-[2px] bg-white/10" />
              <h1 className="font-bebas text-3xl tracking-[3px]">DEFI_HUB</h1>
            </div>
          </div>
        </nav>

        {/* Locked State Body */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
          
          <div className="relative z-10 flex flex-col items-center text-center max-w-xl animate-anti-gravity">
            <div className="w-24 h-24 bg-red-500/5 border-2 border-dashed border-red-500/20 rounded-lg flex items-center justify-center mb-10 relative">
               <ShieldOff className="w-12 h-12 text-red-500" />
               <div className="absolute -top-3 -right-3 bg-red-500 text-white font-bebas text-[10px] px-3 py-1 rounded-sm tracking-widest shadow-2xl">PROTOCOL_LOCKED</div>
            </div>
            
            <h2 className="text-6xl font-bebas tracking-tighter text-white mb-6">ENCRYPTION_ACTIVE</h2>
            
            <div className="bg-red-500/10 border-l-4 border-red-500 p-6 mb-12 text-left backdrop-blur-md">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bebas text-xl text-red-500 tracking-wider mb-2">AUTH_REQUIRED</h4>
                  <p className="font-['DM_Mono'] text-white/60 text-sm tracking-tight leading-relaxed uppercase">
                    Cross-protocol access requires an active neural link with your Starknet mainnet wallet. 
                    Establish a connection to verify owner identity.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={connectWallet}
              className="w-full h-20 bg-[#c8ff00] hover:bg-[#d8ff40] text-black font-bebas text-3xl tracking-[6px] shadow-[10px_10px_0px_#06070a] hover:shadow-[16px_16px_0px_#06070a] hover:-translate-x-1 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-6 group"
            >
               ESTABLISH_NEURAL_LINK <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </button>
            
            <p className="mt-8 font-bebas text-xs text-white/20 tracking-[6px] uppercase">
              Secure Mainnet Gateway // SHA-256_ACTIVE
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-white font-mono selection:bg-[#c8ff00] selection:text-black pb-24 relative">
      {/* Ambient Grid overlay */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
         <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
      </div>

      <nav className="relative z-10 border-b-2 border-white/5 bg-[#06070a]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
               <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="h-8 w-[2px] bg-white/10" />
            <h1 className="font-bebas text-3xl tracking-[3px]">DEFI_HUB</h1>
          </div>
          
          <div className="flex bg-[#0e1016] border border-white/10 p-1 rounded-sm">
            <button 
              onClick={() => setActiveTab("lending")}
              className={`px-6 py-1.5 font-bebas text-lg tracking-widest transition-all flex items-center gap-2 ${activeTab === 'lending' ? 'bg-[#c8ff00] text-black shadow-[4px_4px_0px_rgba(200,255,0,0.2)]' : 'text-white/40 hover:text-white'}`}
            >
              <Landmark className="w-4 h-4" />
              LENDING
            </button>
            <button 
              onClick={() => setActiveTab("staking")}
              className={`px-6 py-1.5 font-bebas text-lg tracking-widest transition-all flex items-center gap-2 ${activeTab === 'staking' ? 'bg-[#c8ff00] text-black shadow-[4px_4px_0px_rgba(200,255,0,0.2)]' : 'text-white/40 hover:text-white'}`}
            >
              <Coins className="w-4 h-4" />
              STAKING
            </button>
            <button 
              onClick={() => setActiveTab("swap")}
              className={`px-6 py-1.5 font-bebas text-lg tracking-widest transition-all flex items-center gap-2 ${activeTab === 'swap' ? 'bg-[#c8ff00] text-black shadow-[4px_4px_0px_rgba(200,255,0,0.2)]' : 'text-white/40 hover:text-white'}`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              SWAP
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 pt-12">
        {activeTab === "lending" && <SimpleEarn />}
        {activeTab === "staking" && <StakingHub />}
        {activeTab === "swap" && <SwapHub />}
      </main>
    </div>
  );
}

export default function DefiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <div className="text-[#c8ff00] font-bebas text-4xl animate-pulse tracking-[4px]">LOADING_CORE_SYSTEM...</div>
      </div>
    }>
      <DefiContent />
    </Suspense>
  );
}

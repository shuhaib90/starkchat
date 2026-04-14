"use client";

import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { ChatWindow } from "@/components/ChatWindow";
import { UserAvatar } from "@/components/UserAvatar";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { normalizeAddress } from "@/lib/address";

export default function ChatRoom() {
  const params = useParams();
  const receiverAddress = normalizeAddress(params.address as string);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <main className="h-screen w-full flex flex-col relative bg-[#06070a] overflow-hidden">
      {/* Immersive Glassy Header */}
      <header className="absolute top-0 left-0 right-0 h-16 bg-[#06070a]/40 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 z-50 flex justify-between items-center transition-all">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-all text-white/40 hover:text-[#c8ff00]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <UserAvatar 
              address={receiverAddress} 
              size={10} 
              className="w-10 h-10 rounded-full border-2 border-[#c8ff00]/20 shadow-[0_0_20px_rgba(200,255,0,0.15)] ring-1 ring-white/10" 
            />
            <div>
              <h1 className="text-lg font-bebas tracking-[2px] text-white">
                {receiverAddress ? `${receiverAddress.slice(0, 10)}...${receiverAddress.slice(-6)}` : "LOADING..."}
              </h1>
              <p className="text-[8px] font-unbounded text-[#0af0ff] tracking-[2px] uppercase opacity-40">Private Chat</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 scale-90 sm:scale-100">
          <button 
            onClick={handleRefresh}
            className="group flex items-center gap-2 hover:bg-white/5 px-3 py-1.5 rounded-full border border-white/5 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 group-hover:text-[#c8ff00] transition-colors ${isRefreshing ? 'animate-spin text-[#c8ff00]' : ''}`} />
            <span className="hidden sm:inline text-[9px] font-['DM_Mono'] text-white/20 group-hover:text-white/60 tracking-widest uppercase transition-colors">
              RE-SYNC
            </span>
          </button>
          <ConnectWalletButton />
        </div>
      </header>

      {/* Fullscreen Chat App Area */}
      <div className="flex-1 w-full min-h-0 z-40 relative">
        {receiverAddress ? (
          <ChatWindow key={refreshKey} receiverAddress={receiverAddress} />
        ) : null}
      </div>

      {/* Background detail */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#c8ff00]/[0.02] blur-[80px] rounded-full -z-10 pointer-events-none transform-gpu" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ff2dff]/[0.02] blur-[80px] rounded-full -z-10 pointer-events-none transform-gpu" />
    </main>
  );
}

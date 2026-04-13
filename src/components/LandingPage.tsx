"use client";

import React from "react";
import { 
  MessageSquare, 
  DollarSign, 
  Lock, 
  Bell, 
  ShieldCheck, 
  Zap,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { useTilt } from "@/hooks/useTilt";

function FeatureCard({ feature, index }: { feature: any; index: number }) {
  const { style, onMouseMove, onMouseLeave } = useTilt(4);
  
  return (
    <div 
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ 
        ...style,
        animationDelay: `${0.4 + index * 0.08}s` 
      }}
      className="animate-anti-gravity group relative p-8 bg-white/[0.03] border-2 border-white/10 hover:border-[#c8ff00]/40 transition-all duration-300 backdrop-blur-xl shadow-[4px_4px_0px_#0e1016] hover:shadow-[12px_12px_0px_#c8ff00] rounded-lg"
    >
      <div 
        className="w-12 h-12 rounded-lg bg-black/40 border-2 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:rotate-6 shadow-inner"
        style={{ borderColor: feature.borderColor || 'rgba(255,255,255,0.1)' }}
      >
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 font-bebas tracking-wider">{feature.title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm font-['DM_Mono']">
        {feature.description}
      </p>
      
      {/* Status tag */}
      <div className="absolute top-4 right-4 px-2 py-0.5 bg-[#0e1016] border border-white/10 text-[9px] font-unbounded text-[#c8ff00]/60 uppercase tracking-widest">
        LIVE
      </div>
    </div>
  );
}

export function LandingPage({ onEnter }: { onEnter?: () => void }) {
  const features = [
    {
      icon: <MessageSquare className="w-5 h-5 text-[#0af0ff]" />,
      borderColor: 'rgba(10, 240, 255, 0.3)',
      title: "DIRECT MESSAGING",
      description: "Wallet-to-wallet private chats. Secure, fast, and fully decentralized messaging for the Starknet ecosystem."
    },
    {
      icon: <DollarSign className="w-5 h-5 text-[#c8ff00]" />,
      borderColor: 'rgba(200, 255, 0, 0.3)',
      title: "INSTANT PAYMENTS",
      description: "Send STRK and ETH directly within your chat bubbles. No need for complex address copying or tab switching."
    },
    {
      icon: <Lock className="w-5 h-5 text-magenta" />,
      borderColor: 'rgba(255, 45, 255, 0.3)',
      title: "PAY TO UNLOCK",
      description: "Monetize your premium content. Send encrypted messages that can only be revealed after a payment is made."
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-[#ffd24d]" />,
      borderColor: 'rgba(255, 210, 77, 0.3)',
      title: "PAYMENT REQUESTS",
      description: "Streamlined Web3 invoicing. Request specific token amounts and get paid with a single tap from the receiver."
    },
    {
      icon: <Bell className="w-5 h-5 text-[#ff2dff]" />,
      borderColor: 'rgba(255, 45, 255, 0.3)',
      title: "NODE NOTIFIER",
      description: "Never miss a deal. Real-time browser and in-app notifications keep you updated on new messages and payments."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#0af0ff]" />,
      borderColor: 'rgba(10, 240, 255, 0.3)',
      title: "IDENTITY VAULT",
      description: "Your wallet is your profile. Personalized avatars and verified on-chain addresses ensure trust in every chat."
    }
  ];

  return (
    <div className="w-full flex flex-col pt-20 pb-20 px-4 max-w-7xl mx-auto overflow-visible">
      
      {/* Hero Section */}
      <header className="mb-32 relative text-left">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-[#c8ff00]/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        
        <div className="animate-anti-gravity inline-flex items-center gap-3 px-3 py-1.5 bg-[#0e1016] border border-[#c8ff00]/40 rounded-sm mb-10">
          <Zap className="w-3.5 h-3.5 fill-[#c8ff00] text-[#c8ff00]" />
          <span className="font-bebas text-[10px] uppercase text-[#c8ff00] tracking-widest leading-none">Powered by Starknet & Starkzap</span>
        </div>
        
        <h1 className="animate-anti-gravity [animation-delay:0.1s] text-[12vw] sm:text-[100px] font-bebas leading-[0.85] text-white tracking-tighter mb-8 flex flex-col">
          <span>THE FUTURE OF</span>
          <span className="relative">
            <span className="absolute inset-0 bg-gradient-to-r from-[#c8ff00] to-[#0af0ff] bg-clip-text text-transparent opacity-80">WEB3 MESSAGING</span>
            <span className="relative" style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.2)", color: "transparent" }}>WEB3 MESSAGING</span>
          </span>
        </h1>
        
        <p className="animate-anti-gravity [animation-delay:0.2s] font-bebas text-sm sm:text-xl text-[#f0ede8]/40 max-w-4xl leading-relaxed mb-12 uppercase tracking-[6px]">
          SEND MESSAGES // TRANSFER STRK // UNLOCK ENCRYPTED MESSAGES USING YOUR STARKNET WALLET
        </p>

        {/* Braavos Disclaimer */}
        <div className="animate-anti-gravity animate-error [animation-delay:0.25s] border-l-4 border-red-500 bg-red-500/10 p-4 mb-12 max-w-2xl backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <ShieldCheck className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="font-bebas text-lg text-red-500 tracking-wider">SYSTEM NOTICE: BRAAVOS WALLET ISSUE</h4>
              <p className="font-bebas text-sm text-white/60 tracking-widest leading-relaxed">
                BRAAVOS WALLET TRANSFERS ARE CURRENTLY EXPERIENCING ISSUES ON MAINNET. OUR TEAM IS ACTIVELY WORKING ON A FIX. PLEASE USE ARGENT X OR OKX WALLET FOR TRANSFERS IN THE MEANTIME.
              </p>
            </div>
          </div>
        </div>
        
        <div className="animate-anti-gravity [animation-delay:0.3s] flex flex-wrap items-center gap-6">
          <button 
            onClick={onEnter}
            className="px-12 py-5 bg-[#c8ff00] text-black font-bebas text-2xl tracking-[4px] shadow-[8px_8px_0px_#06070a] hover:shadow-[12px_12px_0px_#06070a] hover:-translate-x-1 hover:-translate-y-1 transition-all flex items-center gap-4 group active:scale-95"
          >
            START CHAT <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-visible">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} feature={feature} index={idx} />
        ))}
      </section>

      {/* Brutalist Footer / Socials */}
      <section className="mt-40 border-t-2 border-white/5 pt-12 flex flex-col sm:flex-row justify-between items-center gap-12 opacity-50 transition-all duration-700">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
          <div className="p-2 bg-white/5 border border-white/10 group-hover:bg-[#c8ff00]/10 group-hover:border-[#c8ff00]/40 transition-all">
            <svg className="w-6 h-6 text-white group-hover:text-[#c8ff00] fill-current" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          </div>
          <span className="font-bebas text-3xl tracking-tighter text-white group-hover:text-[#c8ff00] transition-colors">GITHUB_REPO</span>
        </a>
        
        <a href="https://x.com/zenvic00" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
          <div className="p-2 bg-white/5 border border-white/10 group-hover:bg-[#0af0ff]/10 group-hover:border-[#0af0ff]/40 transition-all">
            <svg className="w-6 h-6 text-white group-hover:text-[#0af0ff] fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </div>
          <span className="font-bebas text-3xl tracking-tighter text-white group-hover:text-[#0af0ff] transition-colors">X_SIGNAL</span>
        </a>

        <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
          <div className="p-2 bg-white/5 border border-white/10 group-hover:bg-[#ff2dff]/10 group-hover:border-[#ff2dff]/40 transition-all">
            <svg className="w-6 h-6 text-white group-hover:text-[#ff2dff] fill-current" viewBox="0 0 24 24"><path d="M11.944 0C5.346 0 0 5.346 0 11.944s5.346 11.944 11.944 11.944 11.944-5.346 11.944-11.944S18.542 0 11.944 0zm5.281 8.356c-.194 2.112-1.031 6.844-1.456 9.15-.181.975-.537 1.3-.887 1.331-.769.075-1.35-.506-2.094-1.006-1.162-.775-1.812-1.256-2.937-1.994-1.3-.85-1.144-1.312.281-2.738.375-.375 6.887-6.312 7.012-6.844.019-.081.038-.306-.112-.419-.15-.112-.362-.075-.519-.044-.225.044-3.844 2.456-10.844 7.2-.612.431-1.169.644-1.675.631-.556-.013-1.631-.313-2.425-.569-.975-.319-1.325-.487-1.256-.912.038-.225.338-.456.912-.688 3.538-1.538 5.888-2.556 7.062-3.056 3.35-1.425 4.05-1.669 4.5-.188.019.231.025.469.025.719z"/></svg>
          </div>
          <span className="font-bebas text-3xl tracking-tighter text-white group-hover:text-[#ff2dff] transition-colors">TELEGRAM_VOID</span>
        </a>
      </section>
    </div>
  );
}

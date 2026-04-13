"use client";

import React, { useState } from "react";
import { useWallet } from "./StarkzapProvider";
import { 
  Check, 
  Share2, 
  MessageCircle, 
  Send as TelegramIcon,
  X,
  Copy,
  X as CloseIcon
} from "lucide-react";

interface ShareProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareProfile({ isOpen, onClose }: ShareProfileProps) {
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!address || !isOpen) return null;

  const profileUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/chat/${address}` 
    : "";

  const shareText = `Connect with me on StarkChat: ${profileUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareX = () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent("Connect with me on StarkChat")}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#06070a]/90 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />
      
      <div className="w-full max-w-lg bg-[#0e1016] border-2 border-[#c8ff00]/20 p-8 rounded-lg relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors z-20"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-2 text-center items-center">
            <div className="w-16 h-16 bg-[#c8ff00]/10 border-2 border-[#c8ff00]/20 rounded-full flex items-center justify-center mb-2">
              <Share2 className="w-8 h-8 text-[#c8ff00]" />
            </div>
            <h2 className="font-bebas text-4xl tracking-[4px] text-white">SHARE PROFILE</h2>
            <p className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[2px] leading-relaxed">
              Let others start a secure chat with your wallet.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Copy Row */}
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-black/40 border border-white/10 rounded-sm font-mono text-[10px] text-white/40 truncate flex items-center">
                {profileUrl.replace('https://', '')}
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-4 py-3 font-bebas text-sm tracking-[2px] transition-all duration-300 border-2 ${
                  copied 
                    ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                    : "bg-white/5 border-white/10 text-white hover:bg-[#c8ff00] hover:text-black hover:border-[#c8ff00]"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" /> LINK COPIED!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> COPY PROFILE LINK
                  </>
                )}
              </button>
            </div>

            {/* Socials Row */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={shareWhatsApp}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-400 transition-all group"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-bebas text-[10px] tracking-widest opacity-40 group-hover:opacity-100">WHATSAPP</span>
              </button>
              <button
                onClick={shareX}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white transition-all group"
              >
                <div className="w-5 h-5 flex items-center justify-center font-bold text-lg">𝕏</div>
                <span className="font-bebas text-[10px] tracking-widest opacity-40 group-hover:opacity-100">TWITTER_X</span>
              </button>
              <button
                onClick={shareTelegram}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white hover:bg-sky-500/10 hover:border-sky-500 hover:text-sky-400 transition-all group"
              >
                <TelegramIcon className="w-5 h-5" />
                <span className="font-bebas text-[10px] tracking-widest opacity-40 group-hover:opacity-100">TELEGRAM</span>
              </button>
            </div>
          </div>
        </div>

        {/* Brutalist accents */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#c8ff00]/40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#c8ff00]/40 pointer-events-none" />
      </div>
    </div>
  );
}

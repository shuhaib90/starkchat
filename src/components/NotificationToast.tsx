"use client";

import React, { useEffect } from "react";
import { X, Bell, MessageCircle } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

interface NotificationToastProps {
  sender?: string;
  content: string;
  onClose: () => void;
  onClick: () => void;
}

export function NotificationToast({ sender, content, onClose, onClick }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[9999] w-80 sm:w-96 animate-in slide-in-from-right-10 fade-in duration-300">
      <div 
        onClick={onClick}
        className="group relative cursor-pointer bg-[#1C1C21]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl hover:bg-[#25252D]/90 transition-all"
      >
        <div className="flex gap-4">
          <UserAvatar address={sender} size={12} className="w-12 h-12 rounded-xl flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform" />
          
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">New Message</span>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <h4 className="text-sm font-semibold text-white truncate">
              {sender ? `${sender.slice(0, 6)}...${sender.slice(-4)}` : "Unknown Sender"}
            </h4>
            <p className="text-sm text-gray-400 truncate line-clamp-1 mt-0.5">
              {content}
            </p>
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-3 right-3 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Bottom progress bar */}
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500/50 w-full animate-toast-progress origin-left" />
        </div>
      </div>
    </div>
  );
}

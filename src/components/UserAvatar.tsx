"use client";

import React from "react";
import { User, ShieldCheck } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface UserAvatarProps {
  address?: string;
  size?: number; // Tailwind class dimensions
  className?: string; // Optional wrappers
}

export function UserAvatar({ address, size = 10, className = "" }: UserAvatarProps) {
  const { avatarUrl } = useProfile(address);
  const sizeClass = `w-${size} h-${size}`;

  if (!address) {
    return (
      <div className={`${sizeClass} rounded-lg bg-[#0e1016] border-2 border-white/5 flex items-center justify-center flex-shrink-0 relative ${className}`}>
        <User className="w-1/2 h-1/2 text-white/20" />
      </div>
    );
  }

  const renderContent = () => {
    if (avatarUrl) {
      return <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />;
    }
    return <User className="w-1/2 h-1/2 text-[#c8ff00]" />;
  };

  return (
    <div className={`${sizeClass} rounded-lg bg-[#0e1016] border-2 border-white/10 flex items-center justify-center flex-shrink-0 relative overflow-visible shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${className}`}>
      <div className="w-full h-full rounded-md overflow-hidden flex items-center justify-center bg-white/[0.02]">
        {renderContent()}
      </div>
      
      {/* Brutalist "Verified" bit */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c8ff00] flex items-center justify-center border border-black shadow-sm">
        <ShieldCheck className="w-2 h-2 text-black" />
      </div>
    </div>
  );
}

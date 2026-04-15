"use client";

import React from "react";
import { UserAvatar } from "./UserAvatar";
import { normalizeAddress } from "@/lib/address";
import { useWallet } from "./StarkzapProvider";
import { Trash2 } from "lucide-react";

interface MessageBubbleProps {
  message: {
    id: string;
    sender_address: string;
    content: string;
    created_at: string;
    type?: string;
  };
  onDelete?: (id: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ message, onDelete }: MessageBubbleProps) {
  const { address } = useWallet();
  const isMe = normalizeAddress(address || "") === normalizeAddress(message.sender_address);
  
  const time = React.useMemo(() => {
    return new Date(message.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [message.created_at]);

  const isVoice = message.type === 'voice';
  const isImage = message.type === 'image';

  return (
    <div className={`flex w-full mb-3 ${isMe ? "justify-end" : "justify-start"} transform-gpu`}>
      <div className={`flex max-w-[85%] sm:max-w-[70%] gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        <div className="flex-shrink-0 mt-auto mb-1">
          <UserAvatar address={message.sender_address} size={8} className="w-8 h-8 rounded-full border border-white/10 shadow-lg" />
        </div>
        
        <div className={`flex flex-col group ${isMe ? "items-end" : "items-start"} min-w-0`}>
          <div 
            className={`relative shadow-lg overflow-hidden ${
              isImage ? "p-1 bg-white/[0.08] hover:bg-white/[0.12] transition-colors" : "p-4 px-5"
            } ${
              isMe 
                ? "bg-[#c8ff00] text-black rounded-[20px_20px_4px_20px]" 
                : "bg-white/[0.04] text-[#f0ede8] rounded-[20px_20px_20px_4px] border border-white/5"
            }`}
          >
            {isVoice ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="font-bebas tracking-widest text-xs opacity-50 uppercase">Voice Memo</span>
                <audio controls src={message.content} className="w-full h-8 outline-none" />
              </div>
            ) : isImage ? (
              <div className="relative group/img cursor-zoom-in max-w-[400px]">
                <img 
                  src={message.content} 
                  alt="Chat media" 
                  className="rounded-[16px_16px_2px_16px] w-full h-auto max-h-[500px] object-cover"
                  loading="lazy"
                  onClick={() => window.open(message.content, '_blank')}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="font-bebas text-xs tracking-widest text-white bg-black/60 px-3 py-1 rounded-full">VIEW_ORIGINAL</span>
                </div>
              </div>
            ) : (
              <p className="text-base leading-relaxed font-['DM_Mono'] whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="font-['DM_Mono'] text-[9px] text-white/20 uppercase tracking-[2px]">{time}</span>
            {onDelete && (
              <button 
                onClick={() => onDelete(message.id)}
                className="p-1 hover:text-red-500 transition-all text-white/10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

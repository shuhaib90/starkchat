"use client";

import React from "react";
import { UserAvatar } from "./UserAvatar";
import { useWallet } from "./StarkzapProvider";
import { Trash2 } from "lucide-react";

interface MessageBubbleProps {
  message: {
    id: string;
    sender_address: string;
    content: string;
    created_at: string;
  };
  onDelete?: (id: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ message, onDelete }: MessageBubbleProps) {
  const { address } = useWallet();
  const isMe = address?.toLowerCase() === message.sender_address.toLowerCase();
  
  const time = React.useMemo(() => {
    return new Date(message.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [message.created_at]);

  return (
    <div className={`flex w-full mb-3 ${isMe ? "justify-end" : "justify-start"} transform-gpu`}>
      <div className={`flex max-w-[85%] sm:max-w-[70%] gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        <div className="flex-shrink-0 mt-auto mb-1">
          <UserAvatar address={message.sender_address} size={8} className="w-8 h-8 rounded-full border border-white/10 shadow-lg" />
        </div>
        
        <div className={`flex flex-col group ${isMe ? "items-end" : "items-start"} min-w-0`}>
          <div 
            className={`relative p-4 px-5 shadow-lg ${
              isMe 
                ? "bg-[#c8ff00] text-black rounded-[20px_20px_4px_20px]" 
                : "bg-white/[0.04] text-[#f0ede8] rounded-[20px_20px_20px_4px] border border-white/5"
            }`}
          >
            <p className="text-base leading-relaxed font-['DM_Mono'] whitespace-pre-wrap break-words">
              {message.content}
            </p>
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

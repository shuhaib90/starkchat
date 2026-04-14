"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWallet } from "./StarkzapProvider";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Loader2, 
  DollarSign, 
  HandCoins, 
  Lock, 
  Terminal, 
  Trash2,
  Share2
} from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { ShareProfile } from "./ShareProfile";
import { normalizeAddress } from "@/lib/address";

export interface ChatPreview {
  peerAddress: string;
  content: string;
  type: string;
  timestamp: string;
  isRead: boolean;
}

export function RecentChats() {
  const { address } = useWallet();
  const router = useRouter();
  const [previews, setPreviews] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    if (!address) {
      setPreviews([]);
      setIsLoading(false);
      return;
    }

    const fetchPreviews = async () => {
      setIsLoading(true);
      const me = normalizeAddress(address);

      // Fetch top 500 messages involving this user
      // Optimized to use eq instead of ilike after normalization
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_address.eq.${me},receiver_address.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (data && !error) {
        processMessagesIntoPreviews(data, me);
      }
      setIsLoading(false);
    };

    fetchPreviews();

    // Subscribe to realtime updates for inbox
    const channel = supabase
      .channel(`inbox-${address}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new || payload.old;
          if (!msg || !msg.sender_address || !msg.receiver_address) return;

          const s = normalizeAddress(msg.sender_address);
          const r = normalizeAddress(msg.receiver_address);
          const me = normalizeAddress(address);

          // If the newly inserted message involves the current user, re-fetch
          if (s === me || r === me) {
             fetchPreviews(); 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [address]);

  const handleDeleteChat = async (peerAddress: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!address) return;
    const confirmed = window.confirm(`Are you sure you want to delete all messages with ${peerAddress}? This action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      const me = normalizeAddress(address);
      const peer = normalizeAddress(peerAddress);

      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_address.eq.${me},receiver_address.eq.${peer}),and(sender_address.eq.${peer},receiver_address.eq.${me})`);

      if (error) throw error;

      // Update local state for instant feedback
      setPreviews(prev => prev.filter(p => normalizeAddress(p.peerAddress) !== peer));
      console.log(`[StarkChat] Purged conversation with ${peerAddress}`);
    } catch (err) {
      console.error("[StarkChat] Deletion failed:", err);
      alert("Could not delete the conversation. Please try again.");
    }
  };

  const processMessagesIntoPreviews = (messages: any[], me: string) => {
    const map = new Map<string, ChatPreview>();

    // Messages are sorted descending (newest first). 
    for (const msg of messages) {
      if (!msg.sender_address || !msg.receiver_address) continue;

      const peer = normalizeAddress(s) === me ? msg.receiver_address : msg.sender_address;
      const peerKey = normalizeAddress(peer);

      if (!map.has(peerKey)) {
        map.set(peerKey, {
          peerAddress: peer,
          content: msg.content,
          type: msg.type,
          timestamp: msg.created_at,
          // It's unread ONLY if I am the receiver and is_read is false
          isRead: r === me ? msg.is_read : true 
        });
      }
    }

    const previewList = Array.from(map.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setPreviews(previewList);
  };

  if (!address) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-20 px-4">
      {/* Share Modal Triggered by Button below */}
      <ShareProfile isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h3 className="text-3xl font-bebas tracking-tighter text-white flex items-center gap-3">
            <Terminal className="w-6 h-6 text-[#c8ff00]" />
            RECENT CONVERSATIONS
          </h3>
          
          {/* Small Share Button */}
          <button 
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-unbounded text-[#c8ff00] hover:bg-[#c8ff00]/10 hover:border-[#c8ff00]/40 transition-all rounded-sm uppercase tracking-widest group"
          >
            <Share2 className="w-3 h-3 transition-transform group-hover:rotate-12" />
            Share Profile
          </button>
        </div>

        <div className="px-3 py-1 bg-[#c8ff00]/10 border border-[#c8ff00]/30 rounded-sm">
          <span className="font-unbounded text-[9px] text-[#c8ff00] uppercase tracking-widest">{previews.length} Channels</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="py-32 flex flex-col justify-center items-center gap-6">
            <Loader2 className="w-12 h-12 text-[#c8ff00] animate-spin" />
            <div className="font-bebas text-xl tracking-[4px] text-white/20">LOADING CHATS...</div>
          </div>
        ) : previews.length === 0 ? (
          <div className="py-20 border-2 border-dashed border-white/5 bg-white/[0.02] rounded-lg text-center font-['DM_Mono'] flex flex-col items-center justify-center gap-6 group hover:border-[#c8ff00]/20 transition-all duration-700">
            <div className="w-16 h-16 bg-white/5 rounded-md flex items-center justify-center border border-white/10 group-hover:bg-[#c8ff00]/5 transition-colors">
              <Terminal className="w-8 h-8 text-white/20 group-hover:text-[#c8ff00]/40 transition-colors" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bebas text-2xl text-white/40 tracking-widest">NO ACTIVE CHATS</h4>
              <p className="text-[10px] text-white/20 uppercase tracking-[2px]">You haven't started any conversations yet.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {previews.map((preview, idx) => {
              const time = new Date(preview.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <button
                  key={idx}
                  onClick={() => router.push(`/chat/${preview.peerAddress}`)}
                  className="group relative w-full text-left p-5 transition-all duration-300 bg-white/[0.03] border border-white/5 hover:border-[#c8ff00]/30 hover:bg-[#c8ff00]/[0.02] hover:-translate-y-1 rounded-sm flex items-center gap-5 shadow-[4px_4px_0px_#06070a] hover:shadow-[12px_12px_24px_rgba(200,255,0,0.06)]"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#c8ff00] transition-colors" />
                  
                  <div className="relative shrink-0">
                    <UserAvatar address={preview.peerAddress} size={14} className="w-14 h-14 rounded-lg border-2 border-white/10 group-hover:border-[#c8ff00]/40 transition-colors shadow-lg" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#06070a] border border-white/10 flex items-center justify-center shadow-lg">
                      <div className="w-2.5 h-2.5 bg-[#0af0ff] shadow-[0_0_8px_#0af0ff]" />
                      <div className="absolute inset-0 bg-[#0af0ff] animate-pulse opacity-40 scale-150" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <h4 className="font-mono-strict text-white group-hover:text-[#c8ff00] transition-colors flex items-center gap-2">
                        {preview.peerAddress.substring(0, 12)}...{preview.peerAddress.substring(preview.peerAddress.length - 8)}
                        {!preview.isRead && (
                          <div className="px-1.5 py-0.5 bg-[#c8ff00] text-[#06070a] font-unbounded text-[8px] tracking-tighter uppercase leading-none rounded-sm">
                            NEW_DATA
                          </div>
                        )}
                      </h4>
                      <span className="font-['DM_Mono'] text-[10px] text-[#0af0ff]/40 uppercase flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {time}
                      </span>
                    </div>
                    
                    <div className="font-['DM_Mono'] text-sm text-[#f0ede8]/40 truncate group-hover:text-[#f0ede8]/60 transition-colors pr-8">
                      {preview.type === "payment" && (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-widest text-[11px] uppercase">
                          <DollarSign className="w-3 h-3" />
                          TOKEN TRANSFER
                        </span>
                      )}
                      {preview.type === "request" && (
                        <span className="flex items-center gap-1.5 text-indigo-400 font-bold tracking-widest text-[11px] uppercase">
                          <HandCoins className="w-3 h-3" />
                          PAYMENT REQUEST
                        </span>
                      )}
                      {preview.type === "locked" && (
                        <span className="flex items-center gap-1.5 text-pink-500 font-bold tracking-widest text-[11px] uppercase animate-pulse">
                          <Lock className="w-3 h-3" />
                          LOCKED MESSAGE
                        </span>
                      )}
                      {preview.type === "text" && preview.content}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleDeleteChat(preview.peerAddress, e)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-white/20 transition-all rounded-md border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-4 group-hover:translate-x-0">
                      <ArrowRight className="w-6 h-6 text-[#c8ff00]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

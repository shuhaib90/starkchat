"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { MessageBubble } from "./MessageBubble";
import { PaymentMessageCard } from "./PaymentMessageCard";
import { SendMoneyModal } from "./SendMoneyModal";
import { RequestMoneyModal } from "./RequestMoneyModal";
import { SendLockedMessageModal } from "./SendLockedMessageModal";
import { RequestMessageCard } from "./RequestMessageCard";
import { LockedMessageCard } from "./LockedMessageCard";
import { MessageInput } from "./MessageInput";
import { Loader2, Terminal } from "lucide-react";
import { normalizeAddress } from "@/lib/address";

import { useWallet } from "./StarkzapProvider";

interface ChatWindowProps {
  receiverAddress: string;
}

export function ChatWindow({ receiverAddress }: ChatWindowProps) {
  const { address, showDiagnostic } = useWallet();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address) return; // Wait until current wallet is attached before fetching
    fetchInitialMessages();
    markMessagesAsRead();

    // Subscribe to realtime updates on 'messages' table
    const channel = supabase
      .channel(`messages-${address}-${receiverAddress}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          // Verify if this message belongs to the current 1:1 chat pair
          const msg = payload.new || payload.old;
          
          if (!msg || !msg.sender_address || !msg.receiver_address) return;

          const s = msg.sender_address.toLowerCase();
          const r = msg.receiver_address.toLowerCase();
          const me = address.toLowerCase();
          const them = receiverAddress.toLowerCase();

          const isRelevant = (s === me && r === them) || (s === them && r === me);

          if (!isRelevant) return;

          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new]);
            // Mark new incoming messages from them as read instantly
            if (s === them) {
              markMessagesAsRead();
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => 
              prev.map(m => m.id === payload.new.id ? payload.new : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [address, receiverAddress]);

  const markMessagesAsRead = async () => {
    if (!address) return;
    const me = address.toLowerCase();
    const them = receiverAddress.toLowerCase();

    // Update all unread messages from 'them' sent to 'me'
    await supabase
      .from('messages')
      .update({ is_read: true })
      .match({ 
        sender_address: them, 
        receiver_address: me,
        is_read: false 
      });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialMessages = async () => {
    if (!address) return;
    setIsLoading(true);
    const me = normalizeAddress(address);
    const them = normalizeAddress(receiverAddress);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_address.eq.${me},receiver_address.eq.${them}),and(sender_address.eq.${them},receiver_address.eq.${me})`)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data && !error) {
      setMessages(data);
    } else if (error) {
      console.error("Fetch messages error:", error);
      showDiagnostic(`Database connection error: ${error.message}. Ensure your credentials are set.`, "error");
    }
    setIsLoading(false);
  };
  
  const handleDeleteMessage = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      // Realtime listener handles the state update
    } catch (err) {
      console.error("[StarkChat] Message deletion failed:", err);
    }
  }, [supabase]);

  const handleSendText = async (content: string) => {
    if (!address) return;
    try {
      const { error } = await supabase.from("messages").insert([
        {
          sender_address: normalizeAddress(address),
          receiver_address: normalizeAddress(receiverAddress),
          content,
          type: "text",
          is_read: false
        },
      ]);
      
      if (error) {
        console.error("Error sending message:", error);
        showDiagnostic(`Signal failed to transmit: ${error.message}`, "error");
      }
    } catch (err: any) {
      console.error("Critical error sending message:", err);
      showDiagnostic(`Critical error: ${err.message || "Network Error"}`, "error");
    }
  };

  const renderedMessages = useMemo(() => {
    // Filter messages: Recipients should only see successful/accepted payments
    const filteredMessages = messages.filter(msg => {
      if (msg.type === 'payment') {
        const isReceiver = address?.toLowerCase() === msg.receiver_address.toLowerCase();
        if (isReceiver) {
          return msg.status === 'success' || msg.status === 'accepted';
        }
      }
      return true;
    });

    return filteredMessages.map((msg, idx) => {
      const currentDay = new Date(msg.created_at).toDateString();
      const prevDay = idx > 0 ? new Date(filteredMessages[idx-1].created_at).toDateString() : null;
      const isFirstInDay = currentDay !== prevDay;
      
      return (
        <React.Fragment key={msg.id}>
          {isFirstInDay && (
            <div className="flex items-center gap-4 my-10 opacity-10">
              <div className="h-px flex-1 bg-white" />
              <span className="font-unbounded text-[7px] tracking-[6px] uppercase text-white">
                {new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <div className="h-px flex-1 bg-white" />
            </div>
          )}
          <div className="w-full">
            {msg.type === "text" && <MessageBubble message={msg} onDelete={handleDeleteMessage} />}
            {msg.type === "payment" && <PaymentMessageCard message={msg} onDelete={handleDeleteMessage} />}
            {msg.type === "request" && <RequestMessageCard message={msg} onDelete={handleDeleteMessage} />}
            {msg.type === "locked" && <LockedMessageCard message={msg} onDelete={handleDeleteMessage} />}
          </div>
        </React.Fragment>
      );
    });
  }, [messages, address, receiverAddress, handleDeleteMessage]);

  return (
    <div className="flex flex-col h-full bg-transparent relative group">
      {/* Background Grid - subtle overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--ink-border) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Messages Area - Full Scrollable Height */}
      <div className="flex-1 overflow-y-auto custom-scrollbar z-10 w-full pt-24 pb-2">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-12">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#c8ff00]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col h-64 items-center justify-center text-center px-4 animate-in fade-in zoom-in duration-700">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
                <Terminal className="w-8 h-8 text-white/20" />
              </div>
              <h4 className="font-bebas text-2xl text-white tracking-[4px] mb-2 opacity-60">CHAT SECURE</h4>
              <p className="font-['DM_Mono'] text-[10px] text-white/20 max-w-xs leading-relaxed uppercase tracking-[2px]">
                This conversation is private and encrypted. Say hello!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full transform-gpu">
              {renderedMessages}
              <div ref={bottomRef} className="h-20" /> {/* Extra space for sticky input */}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="sticky bottom-0 z-30 w-full mt-auto">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 pb-8">
          <div className="bg-[#0e1016]/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <MessageInput 
              receiverAddress={receiverAddress} 
              onOpenSendMoney={() => setIsModalOpen(true)} 
              onOpenRequestMoney={() => setIsRequestModalOpen(true)}
              onOpenLockMessage={() => setIsLockModalOpen(true)}
              onSendText={handleSendText}
            />
          </div>
        </div>
      </div>

      <SendMoneyModal receiverAddress={receiverAddress} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <RequestMoneyModal receiverAddress={receiverAddress} isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
      <SendLockedMessageModal receiverAddress={receiverAddress} isOpen={isLockModalOpen} onClose={() => setIsLockModalOpen(false)} />
    </div>
  );
}

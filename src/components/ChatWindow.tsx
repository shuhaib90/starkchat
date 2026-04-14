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
import { Loader2, Terminal, RefreshCw } from "lucide-react";
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
  const [realtimeStatus, setRealtimeStatus] = useState<string>("CONNECTING...");
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Helper functions defined inside to access state/props
  const markMessagesAsRead = async () => {
    if (!address) return;
    const me = normalizeAddress(address);
    const them = normalizeAddress(receiverAddress);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .match({ 
        sender_address: them, 
        receiver_address: me,
        is_read: false 
      });
  };

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
      showDiagnostic(`Database connection error: ${error.message}`, "error");
    }
    setIsLoading(false);
  };

  // Main Effect: Handles Fetching + Subscriptions
  useEffect(() => {
    if (!address) return;
    
    fetchInitialMessages();
    const markMessagesAsRead = async () => {
      if (!address) return;
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_address', normalizeAddress(address))
          .eq('sender_address', normalizeAddress(receiverAddress))
          .eq('is_read', false);
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    };

    markMessagesAsRead();

    // [BLUEPRINT SYNC] Standard Realtime Subscription
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          const me = normalizeAddress(address);
          const them = normalizeAddress(receiverAddress);
          
          const s = normalizeAddress(newMsg.sender_address);
          const r = normalizeAddress(newMsg.receiver_address);

          // Standard filter: is this message for this active chat?
          const isRelevant = (s === me && r === them) || (s === them && r === me);
          
          if (isRelevant) {
            console.log("[Blueprint Sync] New message received:", newMsg.id);
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const sorted = [...prev, newMsg].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              return sorted;
            });
            if (s === them) markMessagesAsRead();
          }
        }
      )
      .subscribe((status, err) => {
        setRealtimeStatus(status.toUpperCase());
        setActiveChannelId('messages-realtime');
        if (err) {
          console.error("[Blueprint Sync] Error:", err.message);
          setRealtimeStatus(`ERROR: ${err.message}`);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [address, receiverAddress]);

  // Auto-scroll logic
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDeleteMessage = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("[StarkChat] Message deletion failed:", err);
    }
  }, []);

  const handleSendText = async (content: string) => {
    if (!address) return;
    
    const tempId = crypto.randomUUID();
    const me = normalizeAddress(address);
    const them = normalizeAddress(receiverAddress);
    
    const optimisticMsg = {
      id: tempId,
      sender_address: me,
      receiver_address: them,
      content,
      type: "text",
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase.from("messages").insert([
        {
          sender_address: me,
          receiver_address: them,
          content,
          type: "text",
          is_read: false
        },
      ]).select().single();
      
      if (error) throw error;
      if (data) {
        // [DUAL-SYNC] Success - Replace optimistic and broadcast to peer
        const cleanMsg = {
          ...data,
          sender_address: normalizeAddress(data.sender_address),
          receiver_address: normalizeAddress(data.receiver_address)
        };
        setMessages(prev => prev.map(m => m.id === tempId ? cleanMsg : m));
        
        const activeChannel = channelRef.current;
        if (activeChannel) {
          console.log("[Dual-Sync] Broadcasting new message...");
          activeChannel.send({ type: 'broadcast', event: 'new_message', payload: cleanMsg });
        }

        // [GLOBAL-PULSE] Also broadcast to the receiver's private user channel for inbox updates
        const userChannel = supabase.channel(`user:${them}`);
        userChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await userChannel.send({
              type: 'broadcast',
              event: 'inbox_update',
              payload: cleanMsg
            });
            supabase.removeChannel(userChannel); // Temporary channel for one-shot broadcast
          }
        });
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      showDiagnostic(`Signal failed: ${err.message}`, "error");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const renderedMessages = useMemo(() => {
    const filteredMessages = messages.filter(msg => {
      if (msg.type === 'payment') {
        const isReceiver = normalizeAddress(address || "") === normalizeAddress(msg.receiver_address);
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
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--ink-border) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
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
              <div ref={bottomRef} className="h-20" />
            </div>
          )}
        </div>
      </div>

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

"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useWallet } from "./StarkzapProvider";
import { usePathname, useRouter } from "next/navigation";
import { NotificationToast } from "./NotificationToast";
import { STARK_AGENT_ID } from "@/lib/agents/gemini";

export function RealtimeNotifier() {
  const { address } = useWallet();
  const pathname = usePathname();
  const router = useRouter();
  const [notification, setNotification] = useState<{ sender: string; content: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Permission request on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!address) return;

    const me = address.toLowerCase();

    const channel = supabase
      .channel(`global-notifications-${me}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_address=eq.${me}`
        },
        (payload: any) => {
          const msg = payload.new;
          if (!msg) return;

          // SILENCE_AGENT: Do not trigger notifications for messages sent by the AI Agent
          if (msg.sender_address === STARK_AGENT_ID) return;

          // Check if user is already in the specific chat room
          const isInCorrectChat = pathname === `/chat/${msg.sender_address}`;
          
          if (!isInCorrectChat) {
            const previewText = msg.type === "text" ? msg.content : `[Monetized/Payment Message]`;
            
            // 1. Show In-App Toast
            setNotification({ 
              sender: msg.sender_address, 
              content: previewText 
            });

            // 2. Play Sound (Optional demo)
            // if (audioRef.current) audioRef.current.play();

            // 3. Browser Notification
            if (Notification.permission === "granted" && document.hidden) {
              new Notification("New StarkChat Message", {
                body: `${msg.sender_address.slice(0, 6)}: ${previewText}`,
                icon: "/favicon.ico" // You can put a logo here
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [address, pathname]);

  if (!notification) return null;

  return (
    <NotificationToast 
      sender={notification.sender}
      content={notification.content}
      onClose={() => setNotification(null)}
      onClick={() => {
        router.push(`/chat/${notification.sender}`);
        setNotification(null);
      }}
    />
  );
}

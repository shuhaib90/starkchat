"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lock, Unlock, Loader2, Terminal, X, Trash2 } from "lucide-react";
import { decryptText } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { executeStarknetPayment } from "@/lib/starkzap";
import { UserAvatar } from "./UserAvatar";
import { useWallet } from "./StarkzapProvider";
import { normalizeAddress } from "@/lib/address";

interface LockedMessageCardProps {
  message: {
    id: string;
    sender_address: string;
    receiver_address: string;
    encrypted_content: string;
    unlock_price: number;
    token?: string;
    is_unlocked: boolean;
    status: string;
    created_at: string;
  };
  onDelete?: (id: string) => void;
}

export const LockedMessageCard = React.memo(function LockedMessageCard({ message, onDelete }: LockedMessageCardProps) {
  const { address, wallet, showDiagnostic, rotateRpc } = useWallet();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null);
  
  const isMe = normalizeAddress(address || "") === normalizeAddress(message.sender_address);
  const tokenSymbol = message.token || "STRK";
  const shouldShowContent = message.is_unlocked || unlockedContent;

  // Decrypt content on mount if already unlocked
  useEffect(() => {
    const autoDecrypt = async () => {
      if (message.is_unlocked && !unlockedContent) {
        try {
          const decrypted = await decryptText(message.encrypted_content);
          setUnlockedContent(decrypted);
        } catch (err) {
          console.error("Auto-decryption failed", err);
        }
      }
    };
    autoDecrypt();
  }, [message.is_unlocked, message.encrypted_content, unlockedContent]);

  const handleUnlock = async () => {
    if (isMe || shouldShowContent || isUnlocking || !wallet) return;
    
    setIsUnlocking(true);
    try {
      // 1. Pay via Starkzap (Real Transaction)
      const result = await executeStarknetPayment(
        wallet,
        message.sender_address, 
        message.unlock_price.toString(),
        tokenSymbol,
        rotateRpc
      );

      if (result.success) {
        console.log(`[StarkChat] Unlock Success: ${result.transactionHash}. Finalizing message: ${message.id}`);
        // 2. Update DB
        const { error: updateError } = await supabase
          .from("messages")
          .update({ 
            is_unlocked: true,
            status: "accepted",
            tx_hash: result.transactionHash
          })
          .eq("id", message.id);

        if (updateError) {
          console.error("[StarkChat] DB Update Error (LockedMessageCard):", JSON.stringify({
            message: updateError.message,
            code: updateError.code,
            details: updateError.details
          }, null, 2));
          showDiagnostic(`Transferred, but failed to unlock in chat: ${updateError.message}`, "warning");
        } else {
          console.log("[StarkChat] DB updated successfully for unlock");
          
          // 3. Decrypt immediately
          const decrypted = await decryptText(message.encrypted_content);
          setUnlockedContent(decrypted);

          // [DUAL-SYNC] Broadcast the unlock to the peer instantly
          const updatedMsg = { ...message, is_unlocked: true, status: "accepted", tx_hash: result.transactionHash };
          const me = normalizeAddress(address);
          // Receiver is always the one who unlocks, so peer is the sender
          const them = normalizeAddress(message.sender_address);
          const sharedTopic = [me, them].sort().join("-").slice(0, 100);
          const activeChannel = supabase.getChannels().find(c => c.topic === `realtime:chat:${sharedTopic}`);
          if (activeChannel) {
            activeChannel.send({ type: 'broadcast', event: 'message_update', payload: updatedMsg });
          }
        }
      } else {
        if (result.isRateLimit) {
          showDiagnostic("Braavos RPC node is busy. High traffic detected.", "warning");
        } else {
          showDiagnostic(result.error || "UNLOCK_FAILED", "error");
        }
      }
    } catch (err) {
      console.error("[StarkChat] Critical unlock failure:", err);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleReject = async () => {
    if (isMe || message.status === 'rejected') return;
    try {
      await supabase
        .from('messages')
        .update({ status: 'rejected' })
        .eq('id', message.id);
    } catch (err) {
      console.error("[StarkChat] Reject failed:", err);
    }
  };

  const time = useMemo(() => {
    return new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.created_at]);

  return (
    <div className={`flex w-full mb-8 ${isMe ? "justify-end" : "justify-start"} transform-gpu`}>
      <div className={`flex flex-col group w-full max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-center justify-between gap-3 mb-2 px-1 w-full">
          <div className="flex items-center gap-2">
            <span className="font-bebas text-[10px] text-magenta tracking-[3px] uppercase">
              {shouldShowContent 
                ? (isMe ? "AMOUNT RECEIVED" : "SIGNAL DECRYPTED") 
                : "LOCKED SIGNAL"
              }
            </span>
            <span className="font-['DM_Mono'] text-[9px] text-white/10 uppercase tracking-[2px]">
              {time}
            </span>
          </div>
          {onDelete && (
            <button 
              onClick={() => onDelete(message.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-white/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className={`relative w-full border-2 overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-500 ${
          shouldShowContent 
            ? "bg-emerald-500/5 border-emerald-500/20 rounded-[16px_4px_16px_16px]" 
            : "bg-magenta/5 border-magenta/20 rounded-[16px_4px_16px_16px]"
        }`}>
          
          {!shouldShowContent && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-magenta to-transparent animate-scan" />
            </div>
          )}

          <div className="relative z-10 p-4">
            {shouldShowContent ? (
              <div className="font-['DM_Mono'] text-[#f0ede8] leading-relaxed">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bebas tracking-widest text-base border-b border-emerald-500/20 pb-1 uppercase">
                  <Unlock className="w-4 h-4" /> DECRYPTED MESSAGE
                </div>
                <p className="text-sm">
                  {unlockedContent || "DECRYPTING..."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-1">
                <div className="w-12 h-12 bg-magenta/10 border-2 border-magenta/30 rounded-lg flex items-center justify-center mb-4 relative">
                  <Lock className="w-6 h-6 text-magenta" />
                  <div className="absolute inset-0 animate-pulse scale-150 bg-magenta/5 rounded-full blur-2xl" />
                </div>
                
                <h4 className="font-bebas text-lg text-white tracking-[3px] mb-1">LOCKED MESSAGE</h4>
                <p className="font-['DM_Mono'] text-[10px] text-white/40 mb-4 max-w-[180px] leading-relaxed uppercase">
                  Pay <span className="text-magenta font-bold">{message.unlock_price} {tokenSymbol}</span> to decrypt.
                </p>

                {message.status === 'rejected' ? (
                  <div className="w-full py-3 bg-red-500/10 border-2 border-dashed border-red-500/30 text-red-400 font-bebas text-lg tracking-[4px] text-center flex items-center justify-center gap-3">
                    <Terminal className="w-4 h-4 text-red-500" /> REJECTED
                  </div>
                ) : isMe ? (
                  <div className="w-full flex items-center justify-center py-3 bg-white/5 border-2 border-dashed border-white/10 text-white/30 font-bebas text-lg tracking-[4px]">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> WAITING FOR PEER
                  </div>
                ) : (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleReject}
                      disabled={isUnlocking}
                      className="flex-[0.35] py-3 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/40 hover:text-red-400 font-bebas text-lg tracking-[3px] transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> REJECT
                    </button>
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="flex-1 relative py-3 bg-[#c8ff00] text-black font-bebas text-lg tracking-[4px] hover:bg-[#d4ff33] transition-all group active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 overflow-hidden"
                    >
                      {isUnlocking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> PAYING...
                        </>
                      ) : (
                        <>
                          PAY {message.unlock_price} {tokenSymbol}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        </div>
      </div>
      
      {isMe && (
        <div className="flex-shrink-0 mt-auto mb-1 ml-3">
          <UserAvatar address={message.sender_address} size={8} className="w-8 h-8 rounded-full border border-magenta/20 shadow-[0_0_15px_rgba(255,45,255,0.1)]" />
        </div>
      )}
      {!isMe && (
        <div className="flex-shrink-0 mt-auto mb-1 mr-3 order-first">
          <UserAvatar address={message.sender_address} size={8} className="w-8 h-8 rounded-full border border-[#0af0ff]/20 shadow-[0_0_15px_rgba(10,240,255,0.1)]" />
        </div>
      )}
    </div>
  );
});

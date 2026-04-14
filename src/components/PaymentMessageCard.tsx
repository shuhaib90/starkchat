"use client";

import React, { useState } from "react";
import { HandCoins, CheckCircle, Loader2, DollarSign, ArrowUpRight, Zap, Terminal, Trash2 } from "lucide-react";
import { useWallet } from "./StarkzapProvider";
import { executeStarknetPayment } from "@/lib/starkzap";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "./UserAvatar";
import { normalizeAddress } from "@/lib/address";

interface PaymentMessageCardProps {
  message: {
    id: string;
    sender_address: string;
    content: string;
    type: "payment" | "request";
    token?: string;
    payload?: any;
    status?: "pending" | "success" | "failed" | "accepted";
    created_at: string;
  };
  onDelete?: (id: string) => void;
}

export const PaymentMessageCard = React.memo(function PaymentMessageCard({ message, onDelete }: PaymentMessageCardProps) {
  const { address, wallet, showDiagnostic, rotateRpc } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isMe = normalizeAddress(address || "") === normalizeAddress(message.sender_address);
  const isRequest = message.type === 'request';
  const isAcceptedRequest = isRequest && message.status === 'accepted';
  const isPendingRequest = isRequest && message.status === 'pending';
  
  const tokenSymbol = message.token || 'STRK';
  const accentColor = tokenSymbol === 'ETH' ? 'text-[#0af0ff]' : 'text-[#c8ff00]';
  const borderColor = tokenSymbol === 'ETH' ? 'border-[#0af0ff]/20' : 'border-[#c8ff00]/20';
  const bgColor = tokenSymbol === 'ETH' ? 'bg-[#0af0ff]/5' : 'bg-[#c8ff00]/5';
  const glowColor = tokenSymbol === 'ETH' ? 'bg-[#0af0ff]' : 'bg-[#c8ff00]';

  const handlePayRequest = async () => {
    if (!wallet || !isPendingRequest) return;
    try {
      setIsProcessing(true);
      const result = await executeStarknetPayment(
        wallet,
        message.sender_address,
        message.content,
        tokenSymbol,
        rotateRpc
      );

      if (result.success) {
        console.log(`[StarkChat] PayRequest Success: ${result.transactionHash}. Finalizing message: ${message.id}`);
        
        const { error: updateError } = await supabase
          .from('messages')
          .update({ 
            status: 'accepted',
            tx_hash: result.transactionHash
          })
          .eq('id', message.id);

        if (updateError) {
          console.error("[StarkChat] DB Update Error (PaymentMessageCard):", JSON.stringify({
            message: updateError.message,
            code: updateError.code,
            details: updateError.details
          }, null, 2));
          showDiagnostic(`Paid, but failed to update status: ${updateError.message}`, "warning");
        } else {
          console.log("[StarkChat] DB updated successfully to 'accepted'");
          // [DUAL-SYNC] Broadcast the update to the peer instantly
          const updatedMsg = { ...message, status: 'accepted', tx_hash: result.transactionHash };
          const me = normalizeAddress(address);
          const them = normalizeAddress(message.sender_address === me ? message.receiver_address : message.sender_address);
          const sharedTopic = [me, them].sort().join("-").slice(0, 100);
          const activeChannel = supabase.getChannels().find(c => c.topic === `realtime:chat:${sharedTopic}`);
          if (activeChannel) {
            activeChannel.send({ type: 'broadcast', event: 'message_update', payload: updatedMsg });
          }
        }
      } else {
        if (result.isRateLimit) {
          showDiagnostic("Starknet nodes are currently throttled. Attempting RPC rotation.", "warning");
        } else {
          showDiagnostic(result.error || "PAYMENT_FAILED", "error");
        }
      }
    } catch (e) {
      console.error("Payment failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex w-full mb-8 ${isMe ? "justify-end" : "justify-start"} transform-gpu`}>
      <div className={`flex flex-col group w-full max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-center justify-between w-full mb-2 px-1">
          <div className="flex items-center gap-3">
            <span className={`font-unbounded text-[9px] ${message.status === 'failed' ? 'text-red-500' : accentColor} tracking-[3px] uppercase`}>
              {message.type === 'payment' 
                ? (message.status === 'failed' 
                    ? "TRANSFER FAILED" 
                    : (message.status === 'success' || message.status === 'accepted') 
                      ? (isMe ? "TRANSFER COMPLETE" : "AMOUNT RECEIVED")
                      : "SENDING PAYMENT...")
                : (isAcceptedRequest ? (isMe ? "REQUEST PAID" : "AMOUNT RECEIVED") : "PAYMENT REQUEST")
              }
            </span>
            <span className="font-['DM_Mono'] text-[9px] text-white/10 uppercase tracking-[2px]">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        
        <div className="relative w-full group">
          <div className={`relative w-full border-2 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            isMe 
              ? "bg-[#0c0d12]/80 border-white/10 rounded-[16px_4px_16px_16px]" 
              : "bg-white/[0.04] border-white/10 rounded-[4px_16px_16px_16px]"
          }`}>
            
            {/* Pulsing glow background */}
            <div className={`absolute -inset-1 opacity-5 blur-xl -z-10 rounded-3xl ${glowColor}`} />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg border-2 ${bgColor} ${borderColor} ${accentColor}`}>
                  {message.type === 'payment' ? <Zap className="w-5 h-5" /> : <HandCoins className="w-5 h-5" />}
                </div>
                {isAcceptedRequest && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 rounded-sm">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="font-bebas text-[10px] text-emerald-400 tracking-widest">ACCEPTED</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className="font-['DM_Mono'] text-[8px] text-white/40 uppercase tracking-[2px] mb-0.5">AMOUNT</span>
                <div className={`font-bebas text-3xl tracking-tighter ${accentColor}`}>
                  {message.content} <span className="text-xl opacity-40">{tokenSymbol}</span>
                </div>
              </div>

              {isPendingRequest && !isMe && (
                <button
                  onClick={handlePayRequest}
                  disabled={isProcessing}
                  className={`w-full py-2.5 ${tokenSymbol === 'ETH' ? 'bg-[#0af0ff]' : 'bg-[#c8ff00]'} text-[#06070a] font-bebas text-base tracking-[3px] hover:opacity-80 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>PAY REQUEST <Zap className="w-4 h-4 fill-current" /></>
                  )}
                </button>
              )}

              <div className="flex items-center gap-2 font-['DM_Mono'] text-[9px] text-white/20 border-t border-white/5 pt-3 uppercase tracking-widest">
                <Terminal className="w-3 h-3" />
                VERIFIED
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

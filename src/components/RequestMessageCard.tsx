"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { HandCoins, CheckCircle2, XCircle, Loader2, Check, X, ArrowUpRight, Clock, Trash2 } from "lucide-react";
import { useWallet, STRK_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS } from "./StarkzapProvider";
// Removed cn import
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "./UserAvatar";
import { executeStarknetPayment } from "@/lib/starkzap";
import { normalizeAddress } from "@/lib/address";

interface RequestMessageCardProps {
  message: {
    id: string;
    sender_address: string;
    receiver_address: string;
    amount: number;
    token: string;
    status: string;
    created_at: string;
  };
  onDelete?: (id: string) => void;
}

export const RequestMessageCard = React.memo(function RequestMessageCard({ message, onDelete }: RequestMessageCardProps) {
  const { address, wallet, showDiagnostic, rotateRpc } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const isMine = normalizeAddress(address || "") === normalizeAddress(message.sender_address);
  const isPayer = normalizeAddress(address || "") === normalizeAddress(message.receiver_address);
  const tokenSymbol = message.token || "STRK";
  const tokenAddress = tokenSymbol === "ETH" ? ETH_TOKEN_ADDRESS : STRK_TOKEN_ADDRESS;

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleAccept = async () => {
    if (!wallet || !isPayer) return;
    try {
      setIsProcessing(true);
      // Execute transaction logic using common helper
      const result = await executeStarknetPayment(
        wallet,
        message.sender_address, // Send back to the requester
        message.amount.toString(),
        tokenSymbol,
        rotateRpc
      );

      if (result.success) {
        console.log(`[StarkChat] Request Acceptance Success: ${result.transactionHash}. Finalizing message: ${message.id}`);
        
        const { error: updateError } = await supabase
          .from('messages')
          .update({ 
            status: "accepted",
            tx_hash: result.transactionHash
          })
          .eq('id', message.id);

        if (updateError) {
          console.error("[StarkChat] DB Update Error (RequestMessageCard):", JSON.stringify({
            message: updateError.message,
            code: updateError.code,
            details: updateError.details
          }, null, 2));
          showDiagnostic(`Paid, but failed to update request status: ${updateError.message}`, "warning");
        } else {
          console.log("[StarkChat] Request message updated successfully to 'accepted'");
          // [DUAL-SYNC] Broadcast the update to the peer instantly
          const updatedMsg = { ...message, status: "accepted", tx_hash: result.transactionHash };
          const me = normalizeAddress(address);
          // Peer is always the sender (requester)
          const them = normalizeAddress(message.sender_address);
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
          showDiagnostic(result.error || "TRANSACTION_FAILED", "error");
        }
      }
    } catch (e: any) {
      console.error("Accept request failed:", e);
      alert(`Failed to process payment. Make sure you have enough ${tokenSymbol}.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!isPayer) return;
    try {
      setIsProcessing(true);
      await supabase
        .from('messages')
        .update({ status: "rejected" })
        .eq('id', message.id);
    } catch (e) {
      console.error("Reject request failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const accentColor = tokenSymbol === 'ETH' ? 'text-[#0af0ff]' : 'text-indigo-400';
  const borderColor = tokenSymbol === 'ETH' ? 'border-[#0af0ff]/30' : 'border-indigo-500/30';
  const bgColor = tokenSymbol === 'ETH' ? 'bg-[#0af0ff]/5' : 'bg-indigo-500/5';
  const shadowColor = tokenSymbol === 'ETH' ? 'shadow-[#0af0ff]/10' : 'shadow-indigo-500/10';

  return (
    <div className={`flex w-full mb-8 ${isMine ? "justify-end" : "justify-start"} transform-gpu`}>
      <div className={`flex flex-col group w-full max-w-[85%] sm:max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
        <div className="flex items-center justify-between w-full mb-2 px-1">
          <div className="flex items-center gap-3">
            <span className={`font-unbounded text-[9px] ${accentColor} tracking-[3px] uppercase`}>
              {message.status === 'accepted' 
                ? (isMine ? "AMOUNT RECEIVED" : "PAYMENT COMPLETE")
                : (isMine ? "SENT REQUEST" : "RECEIVED REQUEST")
              }
            </span>
            <span className="font-['DM_Mono'] text-[9px] text-white/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(message.created_at), "HH:mm")}
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
        
        <div
          className={`relative w-full p-4 border-2 shadow-2xl backdrop-blur-md transition-all duration-500 overflow-hidden ${
            isMine
              ? `${bgColor} ${borderColor} rounded-[16px_4px_16px_16px] ${shadowColor}`
              : "bg-white/[0.03] border-white/10 rounded-[4px_16px_16px_16px]"
          }`}
        >
          {/* Header Area */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 border rounded-lg shadow-inner ${tokenSymbol === 'ETH' ? 'bg-[#0af0ff]/20 border-[#0af0ff]/30 text-[#0af0ff]' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'}`}>
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bebas text-xl text-white tracking-widest">{message.amount} {tokenSymbol}</span>
                <span className={`text-[8px] uppercase tracking-[4px] ${tokenSymbol === 'ETH' ? 'text-[#0af0ff]/60' : 'text-indigo-400/60'} font-unbounded`}>AMOUNT</span>
              </div>
            </div>
            
            {message.status === "accepted" && <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-pulse" />}
            {message.status === "rejected" && <XCircle className="w-6 h-6 text-red-500/60" />}
          </div>

          <div className="font-['DM_Mono'] text-[10px] text-[#f0ede8]/40 mb-4 leading-relaxed uppercase">
            {isMine 
              ? `Waiting for recipient to pay.`
              : `Received payment request.`
            }
          </div>

          {message.status === "pending" && isPayer && (
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bebas text-lg tracking-[3px] transition-all active:scale-95 disabled:opacity-20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                PAY
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-[0.5] flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/40 hover:text-red-400 font-bebas text-lg tracking-[3px] transition-all active:scale-95 disabled:opacity-20"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                REJECT
              </button>
            </div>
          )}

          {message.status !== "pending" && (
            <div className={`text-center py-2 bg-white/5 border font-unbounded text-[8px] tracking-[4px] uppercase ${
              message.status === "accepted" ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"
            }`}>
              {message.status.toUpperCase()}
            </div>
          )}
          
          {isMine && message.status === "pending" && (
            <div className={`text-center py-2 ${bgColor} border ${borderColor} ${accentColor} font-unbounded text-[8px] tracking-[4px] uppercase animate-pulse`}>
              PENDING
            </div>
          )}

          {/* Background Detail */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        </div>
      </div>
      
      {isMine && (
        <div className="flex-shrink-0 mt-auto mb-1 ml-3">
          <UserAvatar address={message.sender_address} size={8} className="w-8 h-8 rounded-full border border-indigo-400/20 shadow-[0_0_15px_rgba(129,140,248,0.1)]" />
        </div>
      )}
    </div>
  );
});

"use client";

import React, { useState } from "react";
import { useWallet, STRK_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS } from "./StarkzapProvider";
import { X, DollarSign, Send, Loader2, ArrowUpRight, Coins, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { executeStarknetPayment } from "@/lib/starkzap";

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverAddress: string;
}

export function SendMoneyModal({ isOpen, onClose, receiverAddress }: SendMoneyModalProps) {
  const { wallet, address, connectorId, showDiagnostic, rotateRpc } = useWallet();
  const isBraavos = connectorId === "braavos";
  const [receiver, setReceiver] = useState(receiverAddress);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<"STRK" | "ETH">("STRK");
  const [isSending, setIsSending] = useState(false);

  // Update receiver if prop changes
  React.useEffect(() => {
    setReceiver(receiverAddress);
  }, [receiverAddress]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !address) return;
    
    if (!receiver.startsWith("0x") || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Invalid address or amount");
      return;
    }

    let messageId: string | null = null;
    const tokenAddress = token === "STRK" ? STRK_TOKEN_ADDRESS : ETH_TOKEN_ADDRESS;
    
    try {
      setIsSending(true);

      // Create pending message in Supabase
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_address: address,
          receiver_address: receiver,
          type: "payment",
          content: amount, 
          amount: Number(amount),
          token: token,
          status: "pending"
        })
        .select()
        .single();

      if (insertError) {
        showDiagnostic("Failed to prepare transaction signal.", "error");
        throw insertError;
      }
      messageId = message.id;

      // Execute transaction logic using common helper
      const result = await executeStarknetPayment(
        wallet,
        receiver,
        amount,
        token,
        rotateRpc
      );

      if (!result.success) {
        if (result.isRateLimit) {
          showDiagnostic("The Starknet public node is temporarily throttled. I've attempted to rotate the connection.", "warning");
        } else {
          showDiagnostic(result.error || "TRANSACTION_FAILED", "error");
        }
        
        // Mark as failed in DB
        await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        return;
      }

      // Successful transaction
      console.log(`[Starkzap] Transaction success: ${result.transactionHash}. Finalizing messageId: ${messageId}`);
      
      const { error: updateError } = await supabase
        .from('messages')
        .update({ 
          status: "accepted",
          tx_hash: result.transactionHash
        })
        .match({ id: messageId });

      if (updateError) {
        console.error("[Starkzap] DB Update Error Detail:", JSON.stringify({
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        }, null, 2));
        showDiagnostic(`Transferred, but chat status update failed: ${updateError.message}`, "warning");
      } else {
        console.log("[Starkzap] DB updated successfully to 'accepted'");
      }

      onClose();
      setAmount("");
    } catch (err: any) {
      console.error("Payment failed", err);
      if (messageId) {
        await supabase.from('messages').update({ status: 'failed' }).match({ id: messageId });
      }
      showDiagnostic(err?.message || "Payment process encountered an error", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06070a]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0e1016] border-2 border-white/10 w-full max-w-md shadow-[16px_16px_0px_#06070a] rounded-lg overflow-hidden transform transition-all animate-anti-gravity">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-white/5 bg-white/[0.02]">
          <h2 className="text-2xl font-bebas tracking-[2px] text-white flex items-center gap-3">
            <ArrowUpRight className="w-6 h-6 text-emerald-400 group-hover:rotate-45 transition-transform" />
            INITIATE_TRANSFER
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 text-white/40 hover:text-white transition-all rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-8 space-y-6">
          {/* Token Selector */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Asset_Selection</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border-2 border-white/5 rounded-sm">
              <button
                type="button"
                onClick={() => setToken("STRK")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  token === "STRK" ? "bg-[#ffd24d] text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                STRK
              </button>
              <button
                type="button"
                onClick={() => setToken("ETH")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  token === "ETH" ? "bg-[#0af0ff] text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                ETH
              </button>
            </div>
          </div>

          {/* Receiver Input */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Target_Address</label>
            <div className="relative flex items-center bg-black/40 border-2 border-white/5 focus-within:border-[#c8ff00]/40 transition-all rounded-sm">
              <div className="px-4 h-12 flex items-center border-r border-white/5 text-[#c8ff00] font-mono-strict text-xs">0x</div>
              <input
                type="text"
                placeholder="HEX_IDENTIFIER"
                value={receiver.replace('0x', '')}
                onChange={(e) => setReceiver('0x' + e.target.value)}
                className="w-full bg-transparent px-4 py-3 text-[#f0ede8] font-mono-strict text-sm focus:outline-none placeholder:text-white/10"
                required
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Token_Quantity</label>
            <div className="relative flex items-center bg-black/40 border-2 border-white/5 focus-within:border-[#c8ff00]/40 transition-all rounded-sm overflow-hidden">
              <input
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent pl-4 pr-20 py-4 text-[#f0ede8] font-bebas text-3xl focus:outline-none placeholder:text-white/10"
                required
              />
              <div className={`absolute right-0 h-full px-4 flex items-center bg-white/5 border-l border-white/5 font-bebas tracking-widest ${token === 'STRK' ? 'text-[#ffd24d]' : 'text-[#0af0ff]'}`}>
                {token}
              </div>
            </div>
          </div>

          {/* Braavos Wallet Warning */}
          {isBraavos && (
            <div className="bg-red-500/10 border-2 border-red-500/20 p-4 rounded-sm animate-in zoom-in animate-error duration-300">
              <div className="flex gap-4">
                <ShieldCheck className="w-5 h-5 text-red-500 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bebas text-sm text-red-500 tracking-wider">BRAAVOS_WALLET_DETECTED</h4>
                  <p className="font-['DM_Mono'] text-[10px] text-white/50 leading-relaxed uppercase">
                    BRAAVOS TRANSFERS ARE CURRENTLY EXPERIENCING MAINNET ISSUES. IF YOUR TRANSACTION FAILS, PLEASE USE ARGENT X/OKX. OUR TEAM IS INVESTIGATING.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending || !wallet}
            className="w-full relative py-4 bg-emerald-500 text-black font-bebas text-xl tracking-[4px] hover:bg-emerald-400 transition-all group active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 overflow-hidden"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> AUTHORIZING_VAULT...
              </>
            ) : (
              <>
                EXECUTE_PAYMENT <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
            
            {/* Brutalist glow overlay */}
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity" />
          </button>
          
          <p className="text-center font-['DM_Mono'] text-[9px] text-white/20 uppercase tracking-widest pt-2">
            SIG_REQUIRED: Ensure wallet balance exceeds amount + gas.
          </p>
        </form>
      </div>
    </div>
  );
}

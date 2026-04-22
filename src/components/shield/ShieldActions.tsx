"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Shield, 
  Ghost, 
  ArrowUpRight, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  ExternalLink
} from "lucide-react";
import { useWallet } from "@/components/StarkzapProvider";
import { TongoConfidential, Amount } from "starkzap";
import { pubKeyBase58ToAffine } from "@fatsolutions/tongo-sdk";
import { TongoAsset, TONGO_CONTRACTS } from "@/lib/shield";

interface ShieldActionsProps {
  type: "fund" | "transfer" | "withdraw";
  confidential: TongoConfidential;
  asset: TongoAsset;
  balance: Amount | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShieldActions({ type, confidential, asset, balance, onClose, onSuccess }: ShieldActionsProps) {
  const { wallet, address, showDiagnostic } = useWallet();
  const [amount, setAmount] = useState("");
  const [recipientId, setRecipientId] = useState(""); // For transfers {x, y} or Base58
  const [isExecuting, setIsExecuting] = useState(false);
  const [step, setStep] = useState<"input" | "proving" | "broadcasting" | "success">("input");
  const [txHash, setTxHash] = useState<string | null>(null);

  // RESOLVE_TOKEN_DECIMALS
  const decimals = asset === "USDC" ? 6 : 18;

  const handleMax = () => {
    if (balance === null) return;
    setAmount(balance.toUnit());
  };

  const handleAction = async () => {
    if (!wallet || !address || !amount) return;
    setIsExecuting(true);
    setStep("proving");

    try {
      showDiagnostic(`SHIELD_INIT: Generating ZK-proofs for ${type}...`, "info");
      
      // NEURAL_PRECISION_ALIGNMENT: Parse standard input and scale to protocol units via SDK
      const publicAmount = Amount.parse(amount, decimals, asset);
      const confRaw = await confidential.toConfidentialUnits(publicAmount);
      
      console.log(`[Shield] SCALING_SYNC: 
        Input: ${amount} ${asset}
        Public Raw: ${publicAmount.toBase().toString()}
        Confidential Raw: ${confRaw.toString()}
      `);

      // RE-WRAP: Wrap the correctly scaled confidential units in an Amount object for the SDK
      const confAmount = Amount.fromRaw(confRaw, decimals, asset);

      let tx;

      if (type === "fund") {
        const calls = await confidential.fund({
          amount: confAmount,
          sender: wallet.address
        });
        tx = await wallet.execute(calls);
      } else if (type === "transfer") {
        // NEURAL_IDENTITY_RESOLUTION: Robust multi-format resolver (JSON, Prefixed B58, or Raw B58)
        const targetId = recipientId.trim();
        let to;

        if (targetId.startsWith("{")) {
          try {
            to = JSON.parse(targetId);
          } catch {
            showDiagnostic("FORMAT_ERROR: Invalid JSON identity object.", "warning");
            setIsExecuting(false);
            setStep("input");
            return;
          }
        } else {
          try {
            // Handle Base58 (with or without 'b/' prefix)
            const rawB58 = targetId.startsWith("b/") ? targetId.slice(2) : targetId;
            to = pubKeyBase58ToAffine(rawB58);
          } catch (err: any) {
            showDiagnostic(`IDENTITY_ERROR: Could not resolve stealth address.`, "warning");
            setIsExecuting(false);
            setStep("input");
            return;
          }
        }

        const calls = await confidential.transfer({
          amount: confAmount,
          to,
          sender: wallet.address
        });
        tx = await wallet.execute(calls);
      } else {
        // Withdraw to public address (native scaling is handled via proof gen params)
        const calls = await confidential.withdraw({
          amount: confAmount,
          to: recipientId || wallet.address,
          sender: wallet.address
        });
        tx = await wallet.execute(calls);
      }

      setTxHash(tx.hash);
      setStep("broadcasting");
      await tx.wait();
      setStep("success");
      showDiagnostic(`SHIELD_COMPLETE: ${type.toUpperCase()} finalized on L2.`, "info");
      
      // Auto-close after success
      setTimeout(onSuccess, 3000);
    } catch (err: any) {
      console.error(`Shield ${type} failed`, err);
      showDiagnostic(`STARK_ERROR: ${err.message || 'Transaction failed.'}`, "error");
      setIsExecuting(false);
      setStep("input");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-[#06070a]/60">
      <div 
        className="absolute inset-0" 
        onClick={!isExecuting ? onClose : undefined} 
      />
      
      <div className="relative w-full max-w-lg bg-[#0e1016] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] animate-anti-gravity">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                {type === "fund" && <Shield className="w-5 h-5 text-[#c8ff00]" />}
                {type === "transfer" && <Ghost className="w-5 h-5 text-indigo-400" />}
                {type === "withdraw" && <ArrowUpRight className="w-5 h-5 text-cyan-400" />}
             </div>
             <h3 className="text-xl font-bebas tracking-widest uppercase">
                {type === "fund" ? "Shield Assets" : type === "transfer" ? "Ghost Transfer" : "Unshield Assets"}
             </h3>
          </div>
          {!isExecuting && (
            <button onClick={onClose} className="p-2 hover:bg-white/5 text-white/20 hover:text-white transition-all">
               <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
           {step === "input" && (
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <label className="block text-[10px] text-white/30 uppercase tracking-[3px]">Amount to {type}</label>
                    {balance !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/20 uppercase tracking-widest">Available:</span>
                        <span className="text-[10px] text-[#c8ff00] font-bold">
                          {balance.toUnit()} {asset}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative group">
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-16 bg-black/40 border border-white/10 rounded-xl px-6 pr-32 text-2xl font-bebas tracking-widest focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <button 
                        onClick={handleMax}
                        className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded text-[10px] text-indigo-400 font-bold hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-tighter"
                      >
                        MAX
                      </button>
                      <div className="h-6 w-[1px] bg-white/10" />
                      <div className="text-white/20 font-bebas tracking-widest text-xl uppercase">
                        {asset}
                      </div>
                    </div>
                  </div>
                </div>

                {type !== "fund" && (
                  <div>
                    <label className="block text-[10px] text-white/30 uppercase tracking-[3px] mb-3">
                      {type === "transfer" ? "Recipient Tongo ID ({x, y})" : "Public Target Address"}
                    </label>
                    <textarea 
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      placeholder={type === "transfer" ? '{"x": "0x...", "y": "0x..."}' : "0x0..."}
                      rows={type === "transfer" ? 3 : 1}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-xs font-mono focus:outline-none focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                )}

                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-4">
                   <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-white/40 uppercase leading-relaxed tracking-tight">
                     Neural operations generate local ZK-proofs. This protects your transaction amount and identity from public chain analysis.
                   </p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 h-16 rounded-xl font-bebas text-xl tracking-[4px] bg-white/5 border border-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleAction}
                    disabled={!amount || (type !== "fund" && !recipientId)}
                    className={`flex-[2] h-16 rounded-xl font-bebas text-xl tracking-[4px] transition-all flex items-center justify-center gap-4 ${
                      type === "fund" ? "bg-[#c8ff00] text-black" : 
                      type === "transfer" ? "bg-indigo-500 text-white" : 
                      "bg-cyan-500 text-white"
                    } disabled:opacity-30`}
                  >
                    Confirm {type.toUpperCase()}
                  </button>
                </div>
             </div>
           )}

           {step === "proving" && (
             <div className="py-12 flex flex-col items-center text-center">
                <div className="relative mb-8">
                   <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-indigo-400 animate-pulse" />
                   </div>
                </div>
                <h4 className="text-2xl font-bebas tracking-widest mb-2 uppercase">Generating_ZK_Proofs</h4>
                <p className="text-white/40 text-[10px] uppercase tracking-widest max-w-[280px]">
                   Encrypting transaction payload and obfuscating value mapping. Please keep browser tab active.
                </p>
             </div>
           )}

           {step === "broadcasting" && (
             <div className="py-12 flex flex-col items-center text-center">
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-8" />
                <h4 className="text-2xl font-bebas tracking-widest mb-2 uppercase">Broadcasting_to_L2</h4>
                <div className="flex items-center gap-4 text-xs font-mono text-white/20 bg-black/40 px-4 py-2 border border-white/5 rounded-lg mb-8 max-w-full">
                   <span className="truncate">{txHash}</span>
                   <ExternalLink className="w-3 h-3 hover:text-white cursor-pointer" />
                </div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">
                   Waiting for L2 consensus and state commitment...
                </p>
             </div>
           )}

           {step === "success" && (
             <div className="py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#c8ff00]/10 border border-[#c8ff00]/20 rounded-full flex items-center justify-center mb-8">
                   <CheckCircle2 className="w-10 h-10 text-[#c8ff00]" />
                </div>
                <h4 className="text-4xl font-bebas tracking-widest mb-4 uppercase">Neural_Signal_Finalized</h4>
                <p className="text-white/40 text-xs uppercase tracking-widest max-w-[320px]">
                   Transaction authenticated and shielded. Balance state will update in the neuro-dashboard.
                </p>
             </div>
           )}
        </div>

        {/* Footer info */}
        <div className="px-8 py-4 bg-white/[0.01] border-t border-white/5 flex items-center gap-3">
           <Info className="w-3 h-3 text-white/20" />
           <span className="text-[8px] text-white/20 uppercase tracking-[2px]">Tongo Confidential Provider v1.4.0</span>
        </div>
      </div>
    </div>
  );
}

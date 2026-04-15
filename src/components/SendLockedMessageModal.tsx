"use client";

import React, { useState } from "react";
import { useWallet } from "./StarkzapProvider";
import { Lock, X, Send, Loader2, ShieldCheck, Sparkles, Mic, Type, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { encryptText } from "@/lib/crypto";
import { normalizeAddress } from "@/lib/address";
import { VoiceRecorder } from "./VoiceRecorder";

import { ImageUpload } from "./ImageUpload";

interface SendLockedMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverAddress: string;
}

export function SendLockedMessageModal({ isOpen, onClose, receiverAddress }: SendLockedMessageModalProps) {
  const { address, showDiagnostic } = useWallet();
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"text" | "voice" | "image">("text");
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [token, setToken] = useState<"STRK" | "ETH">("STRK");
  const [isSending, setIsSending] = useState(false);

  // Reset state on open/close
  React.useEffect(() => {
    if (isOpen) {
      setContent("");
      setVoiceUrl(null);
      setImageUrl(null);
      setPrice("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = mode === "text" ? content.trim() : (mode === "voice" ? voiceUrl : imageUrl);
    if (!address || !finalContent) return;
    
    if (!receiverAddress.startsWith("0x") || isNaN(Number(price)) || Number(price) <= 0) {
      alert("Invalid address or price");
      return;
    }

    try {
      setIsSending(true);

      // 1. Encrypt Content Client-Side
      const encrypted = await encryptText(finalContent);

      // 2. Store in Supabase
        const { error } = await supabase
        .from('messages')
        .insert({
          sender_address: normalizeAddress(address),
          receiver_address: normalizeAddress(receiverAddress),
          type: "locked",
          encrypted_content: encrypted,
          unlock_price: Number(price),
          token: token,
          is_unlocked: false
        });

      if (error) throw error;

      onClose();
      setContent("");
      setPrice("");
    } catch (err: any) {
      console.error("Lock message failed", err);
      // @ts-ignore
      showDiagnostic(`Encryption upload failed: ${err.message || "Network Error"}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#06070a]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0e1016] border-2 border-magenta/20 w-full max-w-lg shadow-[20px_20px_0px_#06070a] rounded-lg overflow-hidden transform transition-all animate-anti-gravity">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-magenta/10 bg-magenta/5">
          <h2 className="text-2xl font-bebas tracking-[2px] text-white flex items-center gap-3">
            <Lock className="w-6 h-6 text-magenta" />
            ENCRYPTED_VAULT_DEPOSIT
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 text-white/40 hover:text-white transition-all rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-8 space-y-6">
          {/* Token Selector */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Monetization_Asset</label>
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

          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Message_Type</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 border-2 border-white/5 rounded-sm">
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  mode === "text" ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                <Type className="w-4 h-4" /> TEXT
              </button>
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  mode === "voice" ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                <Mic className="w-4 h-4" /> VOICE
              </button>
              <button
                type="button"
                onClick={() => setMode("image")}
                className={`flex items-center justify-center gap-2 py-2 font-bebas tracking-widest text-lg transition-all ${
                  mode === "image" ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                <ImageIcon className="w-4 h-4" /> IMAGE
              </button>
            </div>
          </div>

          {/* Content TextArea or Voice Recorder */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">
              {mode === "text" ? "Secret_Transmission_Data" : "Voice_Motive_Data"}
            </label>
            
            {mode === "text" ? (
              <div className="relative bg-black/40 border-2 border-white/5 focus-within:border-magenta/40 transition-all rounded-sm overflow-hidden">
                <textarea
                  placeholder="INPUT_RESTRICTED_DATA_STREAM..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-transparent p-5 text-[#f0ede8] font-['DM_Mono'] text-sm focus:outline-none placeholder:text-white/5 h-32 resize-none"
                  required
                />
                <div className="absolute bottom-2 right-2 text-[8px] font-unbounded text-white/10 uppercase tracking-widest">Client_Side_Encryption_Active</div>
              </div>
            ) : mode === "voice" ? (
              <div className="bg-black/40 border-2 border-white/5 p-6 rounded-sm flex flex-col items-center gap-4">
                {voiceUrl ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bebas text-[#0af0ff] tracking-widest">RECORDING_READY</span>
                      <button 
                        type="button"
                        onClick={() => setVoiceUrl(null)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-mono uppercase underline"
                      >
                        Delete & Retry
                      </button>
                    </div>
                    <audio controls src={voiceUrl} className="w-full h-10 outline-none" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <VoiceRecorder onSendVoice={setVoiceUrl} />
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest text-center">
                      RECORD_AUDIO_SIGNAL_FOR_VAULT
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-black/40 border-2 border-white/5 p-2 rounded-sm flex flex-col items-center gap-4 min-h-[160px] justify-center">
                {imageUrl ? (
                  <div className="w-full relative group rounded-sm overflow-hidden aspect-video bg-black/60 border border-white/5">
                    <img src={imageUrl} alt="Locked preview" className="w-full h-full object-contain" />
                    <button 
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white/40 hover:text-white rounded-full transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <span className="font-bebas text-xs text-white tracking-widest animate-pulse">VAULT_READY_SIGNAL</span>
                    </div>
                  </div>
                ) : (
                  <ImageUpload onSendImage={(url) => setImageUrl(url)} variant="modal" />
                )}
              </div>
            )}
          </div>

          {/* Price Input */}
          <div className="space-y-3">
            <label className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[3px]">Unlock_Price</label>
            <div className="relative flex items-center bg-black/40 border-2 border-white/5 focus-within:border-magenta/40 transition-all rounded-sm overflow-hidden">
              <input
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-transparent pl-4 pr-20 py-4 text-[#f0ede8] font-bebas text-3xl focus:outline-none placeholder:text-white/10"
                required
              />
              <div className={`absolute right-0 h-full px-4 flex items-center bg-white/5 border-l border-white/5 font-bebas tracking-widest ${token === 'STRK' ? 'text-[#ffd24d]' : 'text-[#0af0ff]'}`}>
                {token}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-unbounded text-magenta/60 uppercase tracking-tighter">
              <ShieldCheck className="w-3 h-3" /> Monetization_Shield: Recipients must resolve price to view.
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full relative py-5 bg-magenta text-black font-bebas text-2xl tracking-[4px] hover:bg-[#ff5fff] transition-all group active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_30px_rgba(255,45,255,0.1)]"
          >
            {isSending ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> SEALING_VAULT...
              </>
            ) : (
              <>
                DISPATCH_LOCKED_SIGNAL <Sparkles className="w-6 h-6 animate-pulse" />
              </>
            )}
            
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity" />
          </button>
        </form>
      </div>
    </div>
  );
}

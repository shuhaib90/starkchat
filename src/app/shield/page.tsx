"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useWallet } from "@/components/StarkzapProvider";
import { 
  Shield, 
  Lock, 
  ArrowLeft, 
  Zap, 
  EyeOff, 
  Fingerprint, 
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Info
} from "lucide-react";
import Link from "next/link";
import { SHIELD_UNLOCK_MESSAGE, deriveTongoKey } from "@/lib/shield";
import { ConfidentialDashboard } from "@/components/shield/ConfidentialDashboard";

function ShieldContent() {
  const { wallet, address, connectWallet, showDiagnostic } = useWallet();
  const [tongoKey, setTongoKey] = useState<string | null>(null);
  const [isDeriving, setIsDeriving] = useState(false);

  // PERSISTENCE_RECOVERY: Check if key exists in session for bridge-like feel
  useEffect(() => {
    const saved = sessionStorage.getItem(`tongo_key_${address}`);
    if (saved) setTongoKey(saved);
  }, [address]);

  const handleUnlock = async () => {
    if (!wallet || !address) return;
    setIsDeriving(true);
    try {
      showDiagnostic("STARK_SHIELD: Requesting identity signature...", "info");
      // Use the wallet's signMessage capability (Bridged in StarkzapProvider)
      const signature = await wallet.signMessage(SHIELD_UNLOCK_MESSAGE);
      
      // Signature is usually [r, s]
      const sigArray = Array.isArray(signature) ? signature : [signature.r, signature.s];
      const derived = deriveTongoKey(sigArray);
      
      setTongoKey(derived);
      sessionStorage.setItem(`tongo_key_${address}`, derived);
      showDiagnostic("NEURAL_LINK_ESTABLISHED: Confidential identity unlocked.", "info");
    } catch (err: any) {
      console.error("Shield unlock failed", err);
      showDiagnostic("SIG_DENIED: Physical authorization required for shield access.", "warning");
    } finally {
      setIsDeriving(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-[#06070a] text-white font-mono flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="w-20 h-20 bg-indigo-500/5 border-2 border-dashed border-indigo-500/20 rounded-full flex items-center justify-center mb-8">
             <Shield className="w-10 h-10 text-indigo-500 animate-pulse" />
          </div>
          <h2 className="text-5xl font-bebas tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">LOCKBOX_OFFLINE</h2>
          <p className="text-white/40 text-sm max-w-xs text-center mb-10 leading-relaxed uppercase tracking-tight">
            Connect your Starknet wallet to access the confidential Neuro-Shield layer.
          </p>
          <button 
            onClick={connectWallet}
            className="px-12 h-16 bg-[#0af0ff] text-black font-bebas text-xl tracking-[4px] hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-4"
          >
            ESTABLISH_UPLINK <ArrowRight className="w-5 h-5" />
          </button>
        </main>
      </div>
    );
  }

  if (!tongoKey) {
    return (
      <div className="min-h-screen bg-[#06070a] text-white font-mono flex flex-col relative overflow-hidden">
        <nav className="relative z-10 border-b border-white/5 bg-[#06070a]/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <Link href="/" className="text-white/20 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="h-6 w-[1px] bg-white/10" />
            <h1 className="font-bebas text-2xl tracking-[4px] text-indigo-400">SHIELD_PROTOCOL</h1>
          </div>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="max-w-md w-full">
            <div className="relative group mb-12">
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#0e1016] border border-white/5 p-8 rounded-2xl shadow-2xl">
                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Fingerprint className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-3xl font-bebas tracking-tight mb-4">UNLOCK_SHIELD_IDENTITY</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-8 uppercase tracking-tighter">
                  Confidential operations require a derived Neural Key. Sign a unique authorization message to decrypt your Tongo identity. No seed phrase required.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-[10px] text-indigo-400/60 uppercase tracking-widest">
                    <Zap className="w-3 h-3" /> ZK_PROOF_PARITY_ACTIVE
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-indigo-400/60 uppercase tracking-widest">
                    <EyeOff className="w-3 h-3" /> STEALTH_MODE_READY
                  </div>
                </div>

                <button 
                  onClick={handleUnlock}
                  disabled={isDeriving}
                  className="w-full h-16 bg-indigo-500 hover:bg-indigo-400 text-white font-bebas text-xl tracking-[4px] shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  {isDeriving ? "DERIVING_IDENTITY..." : "UNLOCK_SHIELD"} <Lock className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              <Info className="w-5 h-5 text-white/40 shrink-0" />
              <p className="text-[10px] text-white/40 uppercase leading-normal tracking-tight">
                Warning: Shield keys are session-specific. Your confidential transactions remain on-chain, but you must re-sign to access this view after closing your browser.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <ConfidentialDashboard tongoKey={tongoKey} onLock={() => setTongoKey(null)} />;
}

export default function ShieldPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#0af0ff] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#0af0ff] font-bebas text-2xl tracking-[4px]">SHIELD_INIT...</div>
        </div>
      </div>
    }>
      <ShieldContent />
    </Suspense>
  );
}

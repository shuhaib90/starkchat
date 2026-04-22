"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Shield, 
  Terminal, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Ghost, 
  RefreshCw, 
  Copy, 
  Lock,
  ExternalLink,
  ChevronRight,
  Fingerprint,
  Zap,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/components/StarkzapProvider";
import { TongoConfidential, Amount } from "starkzap";
import { RpcProvider, uint256 } from "starknet";
import { TONGO_CONTRACTS, TongoAsset } from "@/lib/shield";
import { ShieldActions } from "./ShieldActions";

interface ConfidentialDashboardProps {
  tongoKey: string;
  onLock: () => void;
}

export function ConfidentialDashboard({ tongoKey, onLock }: ConfidentialDashboardProps) {
  const { wallet, address, provider, showDiagnostic } = useWallet();
  const [activeModal, setActiveModal] = useState<"fund" | "transfer" | "withdraw" | null>(null);
  const [activeAsset, setActiveAsset] = useState<TongoAsset>("USDC");
  const [confidential, setConfidential] = useState<TongoConfidential | null>(null);
  const [state, setState] = useState<{ 
    balance: bigint; 
    pending: bigint; 
    nonce: bigint;
    publicBalance: Amount;
    publicPending: Amount;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [shieldProvider, setShieldProvider] = useState<RpcProvider | null>(null);

  // INITIALIZE_TONGO_PROTOCOL
  useEffect(() => {
    if (!wallet || !tongoKey || !provider) return;
    
    console.log(`[Shield] Initializing Tongo protocol for ${activeAsset} via dedicated RPC...`);
    
    // NEURAL_RPC_STABILIZATION: Force use of high-speed v0.10 Alchemy RPC for stable indexing
    const dedicatedProvider = new RpcProvider({ 
      nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || (provider as any).nodeUrl,
      // @ts-ignore - Some versions of starknet.js use specific version fields
      specVersion: "0.10.0"
    });

    const instance = new TongoConfidential({
      privateKey: tongoKey,
      contractAddress: TONGO_CONTRACTS[activeAsset] as any,
      provider: dedicatedProvider
    });
    
    setConfidential(instance);
    setShieldProvider(dedicatedProvider);
    fetchState(instance, dedicatedProvider, activeAsset);

    // NEURAL_SYNC_HEARTBEAT: Heartbeat poll every 15s to detect deposits/transfers automatically
    const pulse = setInterval(() => fetchState(instance, dedicatedProvider, activeAsset), 15000);
    return () => clearInterval(pulse);
  }, [wallet, tongoKey, activeAsset, provider]);

  const fetchState = async (instance: TongoConfidential, dedicatedProvider: RpcProvider, asset: TongoAsset) => {
    setIsSyncing(true);
    try {
      // NEURAL_SDK_SYNC: Using native Tongo-SDK decryption engine for state retrieval
      const sdkState = await instance.getState(); 
      
      // NEURAL_PRECISION_ALIGNMENT: Convert internal protocol units back to public ERC20 scale
      const [pubBalanceRaw, pubPendingRaw] = await Promise.all([
        instance.toPublicUnits(sdkState.balance),
        instance.toPublicUnits(sdkState.pending)
      ]);

      const tokenDecimals = asset === "USDC" ? 6 : 18;
      const displayBalance = Amount.fromRaw(pubBalanceRaw, tokenDecimals, asset);
      const displayPending = Amount.fromRaw(pubPendingRaw, tokenDecimals, asset);

      console.log(`[Shield] SDK_DECRYPTION_SUCCESS: 
        Asset: ${asset}
        Confidential Balance: ${sdkState.balance.toString()}
        Public Balance: ${displayBalance.toUnit()} ${asset}
        Nonce: ${sdkState.nonce.toString()}
      `);
      
      setState({ 
        balance: sdkState.balance, 
        pending: sdkState.pending, 
        nonce: sdkState.nonce,
        publicBalance: displayBalance,
        publicPending: displayPending
      });

      // SAFETY_CHECK: Precision sentinel for fractional balances
      if (sdkState.balance > 0n && sdkState.balance < 1000n) {
        console.warn(`[Shield] LOW_PRECISION_STATE: Balance for ${asset} is critically low (${sdkState.balance.toString()} units).`);
      }
    } catch (err) {
      console.error("Failed to fetch Tongo state", err);
      showDiagnostic(`SYNC_ERROR: Tethered identity update failed. Check RPC connection.`, "warning");
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showDiagnostic("IDENTITY_COPIED: Shield ID saved to clipboard.", "info");
  };

  const handleRollover = async () => {
    if (!confidential || !wallet || !state?.pending) return;
    try {
      showDiagnostic("ROLLOVER_INIT: Activating pending shielded balance...", "info");
      const calls = await confidential.rollover({ sender: wallet.address });
      const tx = await wallet.execute(calls);
      showDiagnostic("TX_BROADCAST: Rollover sequence dispatched.", "info");
      await tx.wait();
      showDiagnostic("SUCCESS: Balance rolled over and activated.", "info");
      if (shieldProvider) fetchState(confidential, shieldProvider, activeAsset);
    } catch (err: any) {
      showDiagnostic(`ROLLOVER_FAILED: ${err.message}`, "error");
    }
  };

  const handleRagequit = async () => {
    if (!confidential || !wallet || !state?.balance) return;
    try {
      showDiagnostic("RAGEQUIT_INIT: Terminating stealth activity and exiting...", "info");
      const calls = await confidential.ragequit({ to: wallet.address, sender: wallet.address });
      const tx = await wallet.execute(calls);
      showDiagnostic("TX_BROADCAST: Emergency exit sequence dispatched.", "info");
      await tx.wait();
      showDiagnostic("SHIELD_DROPPED: All funds successfully moved to public wallet.", "info");
      if (shieldProvider) fetchState(confidential, shieldProvider, activeAsset);
    } catch (err: any) {
      showDiagnostic(`RAGEQUIT_FAILED: ${err.message}`, "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-white font-mono flex flex-col relative overflow-hidden">
      {/* Action Modals */}
      {activeModal && confidential && (
        <ShieldActions 
          type={activeModal} 
          confidential={confidential} 
          asset={activeAsset}
          balance={state?.publicBalance || null}
          onClose={() => setActiveModal(null)} 
          onSuccess={() => {
            setActiveModal(null);
            if (shieldProvider) fetchState(confidential, shieldProvider, activeAsset);
          }}
        />
      )}

      {/* Ambient Cyberpunk Accents */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="relative z-10 border-b border-white/5 bg-[#06070a]/80 backdrop-blur-md px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-sm transition-all group/exit"
                title="Exit to Terminal"
              >
                <LogOut className="w-5 h-5 group-hover/exit:-translate-x-1 transition-transform" />
              </Link>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="relative group">
                 <div className="absolute -inset-2 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                 <Shield className="relative w-8 h-8 text-indigo-400" />
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10" />
            <div>
              <h1 className="font-bebas text-3xl tracking-[4px] leading-none mb-1 text-white">STARK_SHIELD_v1.0</h1>
              <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-[2px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
                NEURAL_LINK_ACTIVE // ENCRYPTION: SHA-512
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-[#0e1016] border border-white/10 p-1 rounded-sm gap-2">
              {(Object.keys(TONGO_CONTRACTS) as TongoAsset[]).map((asset) => (
                <button
                  key={asset}
                  onClick={() => setActiveAsset(asset)}
                  className={`px-4 py-1 text-[10px] font-bold tracking-[2px] transition-all ${activeAsset === asset ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-white/30 hover:text-white'}`}
                >
                  {asset}
                </button>
              ))}
            </div>
            <button 
              onClick={onLock}
              className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-sm"
              title="Lock Shield"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto w-full p-8 grid grid-cols-12 gap-8">
        
        {/* LEFT_COL: IDENTITY & BALANCE */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-[#0e1016] border border-white/5 p-8 rounded-3xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
              <Fingerprint className="w-24 h-24 text-white" />
            </div>
            
            <p className="text-[10px] text-indigo-400 font-bold tracking-[3px] uppercase mb-8">IDENTITY_SIGNATURE</p>
            <div className="mb-12">
               <p className="text-[10px] text-white/30 mb-2 uppercase tracking-widest">Confidential ID (Base58)</p>
               <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-xs text-white/80 break-all select-all">
                    {confidential?.address || "FETCHING..."}
                  </div>
                  <button 
                    onClick={() => confidential && copyToClipboard(confidential.address)}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all text-white/40 hover:text-indigo-400"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
               </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Active Balance</p>
                     <p className="text-4xl font-bebas tracking-tighter text-white">
                      {state?.publicBalance ? state.publicBalance.toUnit() : "0.000000"}
                      <span className="text-lg text-white/30 ml-2">{activeAsset}</span>
                   </p>
                   {state && (
                     <p className="text-[9px] text-white/20 font-mono mt-1 uppercase tracking-widest">
                       RAW_UNITS: {state.balance.toString()} [u256_ON_CHAIN]
                     </p>
                   )}
                </div>
                <button 
                  onClick={() => confidential && shieldProvider && fetchState(confidential, shieldProvider, activeAsset)}
                  className={`p-2 text-white/20 hover:text-white transition-all ${isSyncing ? 'animate-spin text-indigo-400' : ''}`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {state && state.pending > 0n && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-2xl animate-anti-gravity">
                   <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Pending Inflow</p>
                      <div className="px-2 py-0.5 bg-[#c8ff00] text-black text-[8px] font-bold tracking-widest rounded-sm">RECOVERY_READY</div>
                   </div>
                   <p className="text-2xl font-bebas text-white mb-6">
                      +{state.publicPending ? state.publicPending.toUnit() : "0.00"} {activeAsset}
                   </p>
                   <button 
                     onClick={handleRollover}
                     className="w-full h-12 bg-white/5 border border-white/10 text-white font-bebas text-sm tracking-[2px] hover:bg-indigo-500 hover:border-indigo-500 transition-all uppercase"
                   >
                     ACTIVATE_ASSETS
                   </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-black/20 border border-white/5 p-6 rounded-2xl">
             <div className="flex items-center gap-3 text-white/30 mb-4 px-2">
                <History className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest">IDENTITY_DETAILS</span>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-mono px-2 py-1.5 border-b border-white/5">
                   <span className="text-white/20 uppercase">Protocol:</span>
                   <span className="text-indigo-400">TONGO_SHIELD_V1</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono px-2 py-1.5 border-b border-white/5">
                   <span className="text-white/20 uppercase">Network:</span>
                   <span className="text-white/60">SN_MAINNET</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono px-2 py-1.5 overflow-hidden">
                   <span className="text-white/20 uppercase">Nonce:</span>
                   <span className="text-white/60">{state?.nonce?.toString() || "0"}</span>
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT_COL: ACTION CARDS */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8 content-start">
          
          <div 
            onClick={() => setActiveModal("fund")}
            className="bg-[#0e1016] border border-white/5 p-8 rounded-3xl hover:border-[#c8ff00]/30 transition-all group relative overflow-hidden h-[240px] flex flex-col cursor-pointer"
          >
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#c8ff00]/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-12 h-12 bg-[#c8ff00]/5 border border-[#c8ff00]/20 rounded-xl flex items-center justify-center mb-6">
                <ArrowDownLeft className="w-6 h-6 text-[#c8ff00]" />
             </div>
             <h3 className="text-2xl font-bebas tracking-tight text-white mb-3">SHIELD_ASSETS</h3>
             <p className="text-xs text-white/40 uppercase tracking-tight leading-relaxed mb-6">
                Deposit public Starknet tokens into your confidential vault. Identity is obfuscated immediately.
             </p>
             <div className="mt-auto flex items-center text-[10px] text-[#c8ff00] font-bold tracking-[2px] uppercase">
                INITIATE_DEPOSIT <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
             </div>
          </div>

          <div 
            onClick={() => setActiveModal("transfer")}
            className="bg-[#0e1016] border border-white/5 p-8 rounded-3xl hover:border-indigo-500/30 transition-all group relative overflow-hidden h-[240px] flex flex-col cursor-pointer"
          >
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-12 h-12 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
                <Ghost className="w-6 h-6 text-indigo-400" />
             </div>
             <h3 className="text-2xl font-bebas tracking-tight text-white mb-3">GHOST_TRANSFER</h3>
             <p className="text-xs text-white/40 uppercase tracking-tight leading-relaxed mb-6">
                Swift transfers between shielded accounts. Recipient only sees their incoming balance increase.
             </p>
             <div className="mt-auto flex items-center text-[10px] text-indigo-400 font-bold tracking-[2px] uppercase">
                ENCRYPT_TRANSFER <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
             </div>
          </div>

          <div 
            onClick={() => setActiveModal("withdraw")}
            className="bg-[#0e1016] border border-white/5 p-8 rounded-3xl hover:border-cyan-400/30 transition-all group relative overflow-hidden h-[240px] flex flex-col cursor-pointer"
          >
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-400/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-12 h-12 bg-cyan-400/5 border border-cyan-400/20 rounded-xl flex items-center justify-center mb-6">
                <ArrowUpRight className="w-6 h-6 text-cyan-400" />
             </div>
             <h3 className="text-2xl font-bebas tracking-tight text-white mb-3">UNSHIELD_EXIT</h3>
             <p className="text-xs text-white/40 uppercase tracking-tight leading-relaxed mb-6">
                Convert shielded units back to standard ERC20. Exit funds to any public Starknet address.
             </p>
             <div className="mt-auto flex items-center text-[10px] text-cyan-400 font-bold tracking-[2px] uppercase">
                TERMINATE_STEALTH <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
             </div>
          </div>

          <div 
            onClick={handleRagequit}
            className="bg-red-500/5 border border-red-500/10 p-8 rounded-3xl hover:bg-red-500/10 transition-all group flex flex-col justify-center items-center text-center cursor-pointer border-dashed"
          >
             <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-red-500" />
             </div>
             <h3 className="text-xl font-bebas tracking-tight text-white/60 mb-2 uppercase">TOTAL_EXIT_RAGEQUIT</h3>
             <p className="text-[10px] text-white/20 uppercase tracking-widest leading-loose">
                Emergency extraction of all shielded balances. Resets the neural circuit and rollovers remaining units before exit.
             </p>
          </div>

        </div>
      </main>

      {/* Global Terminal Prompt */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[600px] z-50">
         <div className="bg-[#0e1016]/90 backdrop-blur-xl border border-white/10 p-4 shadow-2xl rounded-2xl flex items-center gap-4">
            <Terminal className="w-5 h-5 text-indigo-400 animate-pulse" />
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex-1 font-mono text-[10px] text-white/40 uppercase tracking-widest">
               Neuro-Shield Interface // v1.0.4-stargate // ZK_PROOFS_ACTIVE
            </div>
         </div>
      </div>
    </div>
  );
}

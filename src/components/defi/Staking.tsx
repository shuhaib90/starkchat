"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useWallet } from "@/components/StarkzapProvider";
import { 
  Amount, 
  mainnetTokens, 
  mainnetValidators,
  fromAddress
} from "starkzap";
import { 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  TrendingUp,
  HandCoins,
  ChevronRight,
  AlertCircle,
  Check,
  Search,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ValidatorPool {
  name: string;
  stakerAddress: string;
  logo?: string;
  commission: number;
  totalStaked: string;
  userPosition?: any;
  poolContract?: string;
  apr: number;
  isVerified: boolean;
}

export function StakingHub() {
  const { sdk, wallet, address, showDiagnostic, connectWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validators, setValidators] = useState<ValidatorPool[]>([]);
  const [selectedValidator, setSelectedValidator] = useState<ValidatorPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [view, setView] = useState<"all" | "my">("all");
  const [isExpanded, setIsExpanded] = useState(false);

  const STRK = mainnetTokens.STRK;
  const inputRef = useRef<HTMLInputElement>(null);
  const diagnosticRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // High-precision countdown state for the withdrawal timer
  const [timeLeft, setTimeLeft] = useState<{d:number, h:number, m:number, s:number} | null>(null);

  useEffect(() => {
    if (!selectedValidator?.userPosition?.unpoolTime) {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(selectedValidator.userPosition.unpoolTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedValidator]);
  useEffect(() => {
    if (selectedValidator && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedValidator]);

  const fetchStakingData = useCallback(async () => {
    // Pause all background activity while user is interacting with modal to prevent glitches
    if (!sdk || selectedValidator) {
      if (!sdk) setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const vList = Object.values(mainnetValidators);
      
      // Elite Tier: Only shown in the "ALL_VALIDATORS" discovery view
      const ELITE_VALIDATORS = [
        "0x07e2c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7",       // Karnot (Elite)
        "0x04b00f97e2d2168b91fe64ceeace4a41fc274a85bbdd0adc402c3d0cf9f91bbb", // Braavos
        "0x01aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c00", // Twinstake
        "0x036963c7b56f08105ffdd7f12560924bdc0cb29ce210417ecbc8bf3c7e4b9090", // AVNU
        "0x02952d1e0de1de08fbe6a75d9d0e388e3e89d5d9d42d5f85906ec42ea02e35de"  // Nethermind
      ];

      // Process ALL validators - optimized for private RPC (Alchemy/Blast)
      const processed: ValidatorPool[] = [];
      const CHUNK_SIZE = 50; // Increased from 8 to 50 to leverage private RPC capacity
      for (let i = 0; i < vList.length; i += CHUNK_SIZE) {
        if (selectedValidator) break;
        
        const chunk = vList.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async (v): Promise<ValidatorPool | null> => {
          try {
            const pools = await sdk.getStakerPools(fromAddress(v.stakerAddress));
            if (!pools || pools.length === 0) return null;
            
            const strkPool = pools.find((p: any) => p.token.symbol === "STRK");
            if (!strkPool) return null;

            let userPos = null;
            if (wallet && address) {
              try {
                userPos = await wallet.getPoolPosition(strkPool.poolContract);
              } catch (posErr) {
                // Silently skip position errors
              }
            }

            const isElite = ELITE_VALIDATORS.includes(v.stakerAddress);
            const hasPosition = userPos && BigInt(userPos.staked?.toBase() || 0) > 0n;
            const hasUnpooling = userPos && BigInt(userPos.unpooling?.toBase() || 0) > 0n;

            // Starknet Native Staking APR (Baseline April 2026: 8.35%)
            // Net APR = Protocol_APR * (1 - commission / 100)
            const commission = strkPool.commissionPercent || 0;
            const netApr = 8.35 * (1 - commission / 100);

            // Transparency Gating: 
            // 1. Show it if it's Elite
            // 2. ALWAYS show it if the user has money in it (even if not elite)
            if (!isElite && !hasPosition && !hasUnpooling) return null;

            return {
              name: v.name || "Starknet Validator",
              stakerAddress: v.stakerAddress,
              logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${v.stakerAddress}`,
              commission: commission,
              totalStaked: strkPool.amount?.toFormatted() || "0 STRK",
              poolContract: strkPool.poolContract,
              userPosition: userPos,
              isVerified: isElite,
              apr: netApr
            } as ValidatorPool;
          } catch (err: any) {
             return null;
          }
        }));
        
        processed.push(...results.filter((res): res is ValidatorPool => res !== null));
      }

      if (!selectedValidator) {
        // Final Sort: Always keep Elite nodes at the Top 5 positions
        processed.sort((a, b) => {
          const eliteList = [
            "0x07e2c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7",
            "0x04b00f97e2d2168b91fe64ceeace4a41fc274a85bbdd0adc402c3d0cf9f91bbb",
            "0x01aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c00",
            "0x036963c7b56f08105ffdd7f12560924bdc0cb29ce210417ecbc8bf3c7e4b9090",
            "0x02952d1e0de1de08fbe6a75d9d0e388e3e89d5d9d42d5f85906ec42ea02e35de"
          ];
          const aPri = eliteList.indexOf(a.stakerAddress);
          const bPri = eliteList.indexOf(b.stakerAddress);
          if (aPri !== -1 && bPri !== -1) return aPri - bPri;
          if (aPri !== -1) return -1;
          if (bPri !== -1) return 1;
          return 0;
        });
        
        setValidators(processed);
        const successCount = processed.length;
        if (successCount > 0 && !diagnosticRef.current) {
          showDiagnostic(`ELITE_SYNC: Optimized ${successCount} verified/active pools.`, "info");
          diagnosticRef.current = true;
        }
      }
    } catch (e: any) {
      console.error("Staking sync failed", e);
      showDiagnostic(`SYNC_ERROR: ${e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [sdk, wallet, address, showDiagnostic, selectedValidator]);

  useEffect(() => {
    if (selectedValidator) return; 
    fetchStakingData();
    // Disabled auto-sync based on user preference for a cleaner background state
  }, [fetchStakingData, selectedValidator]);

  const activeStakes = useMemo(() => {
    return validators.filter(v => v.userPosition && v.userPosition.staked && BigInt(v.userPosition.staked.toBase() || 0) > 0n);
  }, [validators]);

  const totalRewards = useMemo(() => {
    return activeStakes.reduce((acc, curr) => acc + Number(curr.userPosition.rewards?.toUnit() || 0), 0);
  }, [activeStakes]);

  const handleStake = async (validator: ValidatorPool) => {
    if (!wallet || !validator.poolContract || !stakeAmount) return;
    try {
      setIsProcessing(true);
      const amount = Amount.parse(stakeAmount, STRK);
      
      showDiagnostic(`INITIATING: Transmitting ${stakeAmount} STRK to ${validator.name}...`, "info");
      
      const tx = await wallet.stake(fromAddress(validator.poolContract as string), amount);
      showDiagnostic(`TRANSMISSION_LIVE: ${stakeAmount} STRK broadcast. Tracking ref: ${tx.hash.slice(0, 10)}...`, "info");
      
      // Optimistic UI Update: handles both existing positions and first-time stakers
      setValidators(prev => prev.map(v => {
        if (v.poolContract === validator.poolContract) {
          return {
            ...v,
            userPosition: {
              ...(v.userPosition || { rewards: { toBase: () => "0" }, staked: { toBase: () => "0", toFormatted: () => "" } }),
              staked: { ...v.userPosition?.staked, toBase: () => (BigInt(v.userPosition?.staked?.toBase() || 0) + amount.toBase()).toString() }
            }
          };
        }
        return v;
      }));

      // INSTANT_UI_RESET: Release control back to user while network confirms
      setStakeAmount("");
      setSelectedValidator(null);
      setIsProcessing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Background Finality Tracking
      tx.wait().then(() => {
        showDiagnostic("SUCCESS: Stake finalized on-chain.", "info");
        // Force an immediate refresh of all data once finalized
        fetchStakingData();
      }).catch((err: any) => {
        showDiagnostic(`FINALITY_ERROR: ${err.message}`, "error");
      });

    } catch (e: any) {
      console.error("Staking failed", e);
      showDiagnostic(`STAKING_FAILED: ${e.message}`, "error");
      setIsProcessing(false);
    }
  };

  const handleClaim = async (pool: string) => {
    if (!wallet) return;
    try {
      setIsProcessing(true);
      const tx = await wallet.claimPoolRewards(fromAddress(pool));
      showDiagnostic("HARVESTING: Signature broadcast to Starknet...", "info");
      await tx.wait();
      showDiagnostic("SUCCESS: Rewards claimed to your wallet.", "info");
      fetchStakingData();
    } catch (e) {
      showDiagnostic("HARVEST_FAILED: Transaction rejected.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestake = async (v: ValidatorPool) => {
    if (!wallet || !v.poolContract) return;
    try {
      setIsProcessing(true);
      // Construct multicall: claim -> approve -> stake rewards
      const tx = await (wallet as any).restakePoolRewards(fromAddress(v.poolContract as string), v.userPosition.rewards.toBase());
      showDiagnostic("RESTAKING: Re-investing yield via multicall...", "info");
      await tx.wait();
      showDiagnostic("SUCCESS: Rewards compounded into stake!", "info");
      fetchStakingData();
    } catch (e) {
      showDiagnostic("RESTAKE_FAILED: Protocol rejection or network error.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExitIntent = async (poolContract: string, amountStr: string) => {
    if (!wallet) return;
    try {
      setIsProcessing(true);
      const amount = Amount.parse(amountStr || "0", STRK);
      showDiagnostic("EXIT_INTENT: Starting cooldown sequence...", "info");
      const tx = await wallet.exitPoolIntent(fromAddress(poolContract), amount);
      showDiagnostic("BROADCAST: Withdrawal sequence initiated.", "info");
      setSelectedValidator(null);
      setIsProcessing(false);

      tx.wait().then(() => {
        showDiagnostic("SUCCESS: Cooldown period active.", "info");
        fetchStakingData();
      });
    } catch (e: any) {
      showDiagnostic(`ERROR: ${e.message || "Exit intent failed."}`, "error");
      setIsProcessing(false);
    }
  };

  const handleExitComplete = async (poolContract: string) => {
    if (!wallet) return;
    try {
      setIsProcessing(true);
      showDiagnostic("WITHDRAWAL: Retrieving tokens from pool...", "info");
      const tx = await wallet.exitPool(fromAddress(poolContract));
      showDiagnostic("BROADCAST: Retrieval command sent.", "info");
      setSelectedValidator(null);
      setIsProcessing(false);

      tx.wait().then(() => {
        showDiagnostic("SUCCESS: STRK returned to wallet.", "info");
        fetchStakingData();
      });
    } catch (e: any) {
      showDiagnostic(`ERROR: ${e.message || "Withdrawal failed."}`, "error");
      setIsProcessing(false);
    }
  };

  // LOADING_GUARD: Only show the full-screen sync overlay on the initial cold start.
  // Once we have validator data, we handle any subsequent refreshes silently in the background.
  if (isLoading && validators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse relative z-50">
        <RefreshCw className="w-10 h-10 text-[#c8ff00] animate-spin mb-4" />
        <p className="font-bebas text-2xl tracking-widest opacity-20 uppercase">Syncing_Protocol_Validators</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Header with Sync control */}
      <div className="flex justify-between items-end border-b-2 border-white/5 pb-8">
         <div className="space-y-1">
            <h3 className="font-bebas text-4xl tracking-tighter">NETWORK_VALIDATORS</h3>
            <p className="font-unbounded text-[8px] text-white/30 tracking-[2px]">PROTOCOL: STARKNET_NATIVE_STAKING_V1</p>
         </div>
         <button 
           onClick={() => fetchStakingData()}
           disabled={isLoading}
           className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-[#c8ff00] hover:text-black transition-all font-bebas tracking-widest flex items-center gap-3 disabled:opacity-20"
         >
            {isLoading ? "SYNCING..." : "SYNC_NODE"} <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e1016] border-2 border-[#c8ff00]/20 p-8 rounded-lg relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-unbounded text-[#c8ff00] tracking-[3px] uppercase">Active_Stake</span>
              <h2 className="text-5xl font-bebas tracking-tighter text-white">
                {activeStakes.reduce((acc, curr) => acc + Number(curr.userPosition.staked.toUnit() || 0), 0).toFixed(2)}
                <span className="text-xl opacity-40 ml-2">STRK</span>
              </h2>
            </div>
            <div className="p-3 bg-[#c8ff00]/10 rounded-md border border-[#c8ff00]/20">
               <ShieldCheck className="w-6 h-6 text-[#c8ff00]" />
            </div>
          </div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        <div className="bg-[#0e1016] border-2 border-white/5 p-8 rounded-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-unbounded text-white/30 tracking-[3px] uppercase">Pending_Rewards</span>
              <h2 className="text-5xl font-bebas tracking-tighter text-[#0af0ff]">
                {totalRewards.toFixed(6)}
                <span className="text-xl opacity-40 ml-2">STRK</span>
              </h2>
            </div>
            <div className="p-3 bg-[#0af0ff]/5 rounded-md border border-white/10">
               <TrendingUp className="w-6 h-6 text-[#0af0ff]" />
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-[#0af0ff] animate-pulse" />
               <span className="text-[9px] font-unbounded text-[#0af0ff]/60 tracking-widest uppercase">Network_Integrity_High</span>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                disabled={totalRewards === 0 || isProcessing}
                onClick={async () => {
                  for (const s of activeStakes) {
                    if (s.poolContract && BigInt(s.userPosition.rewards.toBase() || 0) > 0n) {
                      await handleClaim(s.poolContract);
                    }
                  }
                }}
                className="flex-1 md:px-6 py-3 bg-white/5 border border-white/10 text-white/40 font-bebas tracking-[2px] hover:bg-white/10 hover:text-white transition-all disabled:opacity-20 flex items-center justify-center gap-3 uppercase"
              >
                 Harvest <HandCoins className="w-4 h-4" />
              </button>
              <button 
                disabled={totalRewards === 0 || isProcessing}
                onClick={async () => {
                  for (const s of activeStakes) {
                    if (s.poolContract && BigInt(s.userPosition.rewards.toBase() || 0) > 0n) {
                       await handleRestake(s);
                    }
                  }
                }}
                className="flex-1 md:px-8 py-3 bg-[#0af0ff]/10 border border-[#0af0ff]/30 text-[#0af0ff] font-bebas tracking-[3px] hover:bg-[#0af0ff] hover:text-black transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(10,240,255,0.1)] uppercase"
              >
                 Re-Stake_Signals <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/10 gap-8">
        <button 
          onClick={() => setView("all")}
          className={`pb-4 px-2 font-bebas text-2xl tracking-[2px] transition-all relative ${view === 'all' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
        >
          ALL_VALIDATORS
          {view === 'all' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#c8ff00]" />}
        </button>
        <button 
          onClick={() => setView("my")}
          className={`pb-4 px-2 font-bebas text-2xl tracking-[2px] transition-all relative ${view === 'my' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
        >
          MY_POSITIONS
          <span className="ml-3 px-2 py-0.5 bg-white/5 text-[10px] font-unbounded text-white/40">{activeStakes.length}</span>
          {view === 'my' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#c8ff00]" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(view === "all" ? validators : activeStakes).length === 0 ? (
          <div className="col-span-full py-20 border-2 border-dashed border-white/5 flex flex-col items-center justify-center space-y-4">
             <AlertCircle className="w-12 h-12 text-white/10" />
             <div className="text-center space-y-2">
                <p className="font-bebas text-2xl tracking-widest text-white/20 uppercase">
                   {view === "my" && !address ? "PLEASE_CONNECT_WALLET_TO_SYNC" : "NO_RECORDS_DETECTED"}
                </p>
                <p className="font-unbounded text-[8px] text-white/10 tracking-widest max-w-[300px] mx-auto">
                   {view === "my" && !address 
                     ? "Authorized credentials are required to index your on-chain staking positions."
                     : "Check your network connection or try a protocol rescan if data fails to populate."
                   }
                </p>
             </div>
             
             {view === "my" && !address ? (
               <button 
                 onClick={connectWallet}
                 className="px-8 py-3 bg-[#c8ff00] text-black font-bebas tracking-tighter text-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(200,255,0,0.2)]"
               >
                  INITIALIZE_WALLET_Handshake
               </button>
             ) : (
               <button 
                 onClick={fetchStakingData}
                 className="text-[#c8ff00] font-unbounded text-[10px] tracking-widest hover:underline"
               >
                  FORCE_PROTOCOL_RESCAN
               </button>
             )}
          </div>
        ) : (
          (view === "all" 
            ? (isExpanded 
                ? validators 
                : validators.filter(v => [
                  "0x07e2c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7",
                  "0x04b00f97e2d2168b91fe64ceeace4a41fc274a85bbdd0adc402c3d0cf9f91bbb",
                  "0x01aca15766cb615c3b7ca0fc3680cbde8b21934bb2e7b41594b9d046d7412c00",
                  "0x036963c7b56f08105ffdd7f12560924bdc0cb29ce210417ecbc8bf3c7e4b9090",
                  "0x02952d1e0de1de08fbe6a75d9d0e388e3e89d5d9d42d5f85906ec42ea02e35de"
                ].includes(v.stakerAddress)).slice(0, 5)
              )
            : activeStakes
          ).map((v) => (
            <div 
              key={v.stakerAddress}
              className={`bg-[#0a0b0e] border p-6 hover:border-[#c8ff00]/40 transition-all group backdrop-blur-sm relative ${v.userPosition && BigInt(v.userPosition.staked?.toBase() || 0) > 0n ? 'border-[#c8ff00]/20' : v.isVerified ? 'border-[#0af0ff]/20' : 'border-white/5'}`}
            >
              {v.isVerified && (
                <div className="absolute top-0 right-0 bg-[#0af0ff] text-black text-[7px] font-unbounded px-2 py-0.5 tracking-[1px] flex items-center gap-1 z-20">
                   <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED_NODE
                </div>
              )}
              
              <div className="absolute top-0 left-0 bg-[#c8ff00] text-black text-[7px] font-unbounded px-2 py-0.5 tracking-[1px] flex items-center gap-1 z-20">
                 <div className="w-1 h-1 rounded-full bg-black animate-pulse" /> {v.apr.toFixed(2)}%_LIVE_APR
              </div>
              {/* Card content... */}
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 rounded-sm border border-white/10 overflow-hidden flex-shrink-0">
                    <img src={v.logo} alt={v.name} className="w-full h-full grayscale group-hover:grayscale-0 transition-all opacity-80" />
                 </div>
                 <div>
                   <h3 className="font-bebas text-xl tracking-[1px] text-white/90">{v.name}</h3>
                   <p className="text-[10px] font-mono opacity-20 truncate w-32">{v.stakerAddress}</p>
                 </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="text-[9px] uppercase tracking-widest opacity-30">Commission</span>
                  <span className="font-bebas text-xl text-[#c8ff00]">{v.commission}%</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="text-[9px] uppercase tracking-widest opacity-30">TVL</span>
                  <span className="font-mono text-xs opacity-60">{v.totalStaked}</span>
                </div>
                
                {v.userPosition && BigInt(v.userPosition.staked?.toBase() || 0) > 0n && (
                  <div className="bg-[#c8ff00]/5 border border-[#c8ff00]/10 p-3 flex justify-between items-center rounded-sm">
                     <div>
                        <p className="text-[8px] uppercase tracking-widest text-[#c8ff00]">You Staked</p>
                        <p className="font-bebas text-lg text-white">{Number(v.userPosition.staked.toUnit() || 0).toFixed(2)} <span className="text-xs opacity-40">STRK</span></p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] uppercase tracking-widest text-[#0af0ff]">Earned</p>
                        <p className="font-bebas text-lg text-[#0af0ff]">{Number(v.userPosition.rewards.toUnit() || 0).toFixed(4)}</p>
                     </div>
                  </div>
                )}
                
                {v.userPosition && v.userPosition.unpoolTime && (
                  <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-sm">
                     <div className="flex items-center gap-2 text-red-400 mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-[8px] uppercase tracking-widest">Withdrawal_Cooldown</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <p className="font-mono text-[10px] opacity-60">Locked: {Number(v.userPosition.unpooling.toUnit() || 0).toFixed(2)} STRK</p>
                        <p className="font-mono text-[10px] text-white">
                          {v.userPosition.unpoolTime < new Date() ? "READY" : formatDistanceToNow(v.userPosition.unpoolTime)}
                        </p>
                     </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedValidator(v)}
                  className="flex-1 py-2 bg-white/5 border border-white/10 text-white font-bebas tracking-widest text-sm hover:bg-[#c8ff00] hover:text-black transition-all"
                >
                  MANAGE_STAKE
                </button>
                {v.userPosition && BigInt(v.userPosition.rewards?.toBase() || 0) > 0n && (
                  <button 
                    onClick={() => handleRestake(v)}
                    disabled={isProcessing}
                    title="Compound Rewards (Restake)"
                    className="px-4 py-2 border border-[#0af0ff]/20 text-[#0af0ff] hover:bg-[#0af0ff] hover:text-black transition-all flex items-center justify-center"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        {view === "all" && !isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full h-20 border-2 border-dashed border-white/10 hover:border-[#c8ff00]/50 hover:bg-[#c8ff00]/5 group transition-all flex flex-col items-center justify-center relative overflow-hidden mt-4"
          >
             <div className="flex items-center gap-4 text-white/40 group-hover:text-[#c8ff00] transition-colors">
                <div className="w-8 h-[1px] bg-current opacity-20" />
                <span className="font-unbounded text-[10px] tracking-[4px]">EXPLORE_FULL_NETWORK_REGISTRY</span>
                <div className="w-8 h-[1px] bg-current opacity-20" />
             </div>
             <p className="font-mono text-[7px] opacity-10 uppercase mt-1">Found {validators.length - 5} additional protocol nodes</p>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c8ff00]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        )}
      </div>

      {selectedValidator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#06070a]/90 backdrop-blur-md">
           <div className="w-full max-w-xl bg-[#0e1016] border-2 border-white/5 p-8 relative shadow-[0_0_100px_rgba(0,0,0,0.8)]">
              <button 
                onClick={() => { setSelectedValidator(null); setStakeAmount(""); }}
                className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
              >
                 CLOSE [X]
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-sm border border-[#c8ff00]/40 p-1">
                   <img src={selectedValidator.logo} className="w-full h-full object-cover" />
                </div>
                <div>
                   <h2 className="text-3xl font-bebas tracking-tighter text-white">{selectedValidator.name}</h2>
                   <p className="font-unbounded text-[8px] text-[#c8ff00] tracking-[2px]">VALIDATOR_NODE_ACTIVE</p>
                </div>
              </div>

              <div className="space-y-8">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-unbounded text-white/40 tracking-widest">
                       <span>STAKING_INPUT</span>
                       <span>MOD_01</span>
                    </div>
                    <div className="relative group">
                      <input 
                        ref={inputRef}
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full h-20 bg-[#06070a] border-2 border-white/10 px-8 text-3xl font-mono text-[#c8ff00] placeholder:opacity-10 focus:outline-none focus:border-[#c8ff00]/50 transition-all font-bebas tracking-wider"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-unbounded text-white/20">STRK</div>
                    </div>
                 </div>

                 {stakeAmount && !isNaN(Number(stakeAmount)) && (
                   <div className="bg-[#c8ff00]/5 border border-dashed border-[#c8ff00]/20 p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <TrendingUp className="w-4 h-4 text-[#c8ff00] opacity-60" />
                         <span className="text-[10px] font-unbounded text-white/40 tracking-widest uppercase">Estimated_Annual_Yield</span>
                      </div>
                      <div className="text-right">
                         <p className="font-bebas text-2xl text-[#c8ff00] tracking-tight">
                           +{(Number(stakeAmount) * (selectedValidator.apr / 100)).toFixed(2)} 
                           <span className="text-xs ml-1 opacity-60">STRK</span>
                          </p>
                          <p className="font-mono text-[8px] opacity-20 uppercase tracking-tighter">Based on {selectedValidator.apr.toFixed(2)}% Net APR</p>
                       </div>
                    </div>
                  )}

                 <div className="grid grid-cols-2 gap-4">
                     <button 
                      onClick={() => handleStake(selectedValidator)}
                      disabled={!stakeAmount || isProcessing}
                      className="h-16 bg-[#c8ff00] text-black font-bebas text-xl tracking-widest hover:bg-[#d8ff40] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                    >
                       EXECUTE_STAKE <ChevronRight className="w-5 h-5" />
                    </button>
                    {selectedValidator.userPosition && BigInt(selectedValidator.userPosition.staked?.toBase() || 0) > 0n && (
                      <button 
                        onClick={() => selectedValidator.poolContract && handleExitIntent(selectedValidator.poolContract, stakeAmount || "0")}
                        disabled={isProcessing || (selectedValidator.userPosition?.unpooling && BigInt(selectedValidator.userPosition.unpooling.toBase() || 0) > 0n)}
                        className={`h-16 border font-bebas text-xl tracking-widest transition-all flex items-center justify-center gap-3 ${
                          (selectedValidator.userPosition?.unpooling && BigInt(selectedValidator.userPosition.unpooling.toBase() || 0) > 0n)
                          ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                          : "bg-white/5 border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400"
                        }`}
                      >
                         INIT_WITHDRAWAL <Clock className="w-5 h-5" />
                      </button>
                    )}
                 </div>
                 
                 {selectedValidator.userPosition?.unpooling && BigInt(selectedValidator.userPosition.unpooling.toBase() || 0) > 0n && (
                   <div className="bg-[#f0a800]/10 border border-[#f0a800]/30 p-4 mb-4 rounded-sm flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-[#f0a800] mt-0.5" />
                      <p className="text-[11px] text-[#f0a800] font-mono leading-tight">
                        Tokens are currently locked for 7 days, please check later.
                      </p>
                   </div>
                 )}

                 {timeLeft ? (
                   <div className="w-full h-16 bg-white/5 border border-white/10 flex items-center justify-center gap-4 group cursor-not-allowed">
                      <div className="flex flex-col items-center">
                         <span className="text-[10px] opacity-30 font-unbounded">COOLDOWN_ACTIVE</span>
                         <span className="font-mono text-xl text-white">
                           {String(timeLeft.d).padStart(2, '0')}d {String(timeLeft.h).padStart(2, '0')}h {String(timeLeft.m).padStart(2, '0')}m {String(timeLeft.s).padStart(2, '0')}s
                         </span>
                      </div>
                   </div>
                 ) : selectedValidator.userPosition && selectedValidator.userPosition.unpoolTime && selectedValidator.userPosition.unpoolTime < new Date() && (
                   <button 
                    onClick={() => selectedValidator.poolContract && handleExitComplete(selectedValidator.poolContract)}
                    disabled={isProcessing}
                    className="w-full h-16 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bebas text-xl tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                   >
                     FINALIZE_EXIT_SIGNAL (RESTORE TO WALLET)
                   </button>
                 )}

                 <div className="bg-black/40 p-6 space-y-4">
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-widest opacity-40">
                       <span>Protocol Protocol</span>
                       <span>Starknet Native v1</span>
                    </div>
                    <p className="font-['DM_Mono'] text-[10px] leading-relaxed text-white/50 text-center uppercase tracking-tighter">
                      Tokens entered into this pool support decentralization. Withdrawal requires a 2-step intent sequence subject to protocol cooldowns.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* Elegant Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#06070a]/90 backdrop-blur-xl animate-anti-gravity">
           <div className="relative flex flex-col items-center">
              {/* Sonar Ripple */}
              <div className="absolute inset-0 rounded-full border-4 border-[#c8ff00] animate-sonar" />
              <div className="absolute inset-0 rounded-full border-4 border-[#c8ff00] animate-sonar [animation-delay:0.5s]" />
              
              {/* Glowing Icon */}
              <div className="w-32 h-32 rounded-full bg-[#c8ff00] flex items-center justify-center shadow-[0_0_50px_rgba(200,255,0,0.5)] z-10 animate-checkmark">
                 <Check className="w-20 h-20 text-black stroke-[3px]" />
              </div>
              
              <div className="mt-12 text-center animate-anti-gravity [animation-delay:0.3s]">
                 <h2 className="text-5xl font-bebas tracking-[10px] text-white mb-2">STAKE_SUCCESSFUL</h2>
                 <p className="font-unbounded text-[10px] text-[#c8ff00] tracking-[5px] uppercase opacity-60">Assets confirmed on protocol</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

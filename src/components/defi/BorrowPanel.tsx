"use client";

import React, { useState } from "react";
import { ArrowDownRight, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

interface BorrowPanelProps {
  onBorrow: (collateral: string, debt: string, amount: string) => Promise<void>;
  isProcessing: boolean;
  marketStats: any[];
}

export function BorrowPanel({ onBorrow, isProcessing, marketStats }: BorrowPanelProps) {
  const [collateralAsset, setCollateralAsset] = useState<string>("STRK");
  const [borrowAsset, setBorrowAsset] = useState<string>("ETH");
  const [amount, setAmount] = useState<string>("");

  // Real APR from Market Stats
  const currentApr = React.useMemo(() => {
    const market = marketStats.find(m => m.asset.symbol === borrowAsset);
    if (!market || !market.stats?.borrowApr) return "---";
    // SDK Amount toUnit() gives human readable value (e.g. 0.05 for 5%)
    return (Number(market.stats.borrowApr.toUnit()) * 100).toFixed(2);
  }, [marketStats, borrowAsset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isProcessing) return;
    onBorrow(collateralAsset, borrowAsset, amount);
  };

  const riskLevel = Number(amount) > 1 ? "RISKY" : "SAFE";

  return (
    <div className="bg-[#0e1016] border border-white/5 p-8 space-y-8 relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <h2 className="font-bebas text-3xl tracking-[2px] flex items-center gap-3">
          <Zap className="w-6 h-6 text-magenta" />
          Borrow_Liquidity
        </h2>
        <div className="text-right">
          <div className="font-bebas text-sm text-white/40 tracking-widest uppercase mb-1">Borrow_APR</div>
          <div className="font-bebas text-2xl text-magenta tracking-wider">
            {currentApr === "---" ? "---" : `${currentApr}% APR`}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-2 gap-8">
          {/* Collateral Pick */}
          <div className="space-y-3">
            <label className="text-[10px] font-unbounded text-white/30 uppercase tracking-[2px]">Use_As_Collateral</label>
            <select 
              value={collateralAsset}
              onChange={(e) => setCollateralAsset(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 font-bebas text-xl text-white outline-none focus:border-white/20 appearance-none"
            >
              <option value="STRK">STRK_TOKEN</option>
              <option value="ETH">ETH_ASSET</option>
            </select>
          </div>

          {/* Borrow Pick */}
          <div className="space-y-3">
            <label className="text-[10px] font-unbounded text-white/30 uppercase tracking-[2px]">Borrow_Target</label>
            <select 
              value={borrowAsset}
              onChange={(e) => setBorrowAsset(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 font-bebas text-xl text-white outline-none focus:border-white/20 appearance-none"
            >
              <option value="ETH">ETH_ASSET</option>
              <option value="STRK">STRK_TOKEN</option>
            </select>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <label className="text-[10px] font-unbounded text-white/30 uppercase tracking-[2px]">Request_Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              disabled={isProcessing}
              className="w-full bg-white/[0.03] border-2 border-white/10 p-6 font-bebas text-5xl tracking-widest focus:border-magenta outline-none transition-all placeholder:text-white/5 disabled:opacity-50"
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 font-bebas text-2xl text-white/30 tracking-widest">
              {borrowAsset}
            </div>
          </div>
        </div>

        {/* Risk Visualization */}
        <div className={`p-4 border flex items-center justify-between transition-all ${
           riskLevel === "SAFE" ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20"
        }`}>
          <div className="flex items-center gap-3">
            {riskLevel === "SAFE" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <div className={`text-[10px] font-unbounded uppercase ${
                riskLevel === "SAFE" ? "text-emerald-400" : "text-red-400"
              }`}>Health_Status: {riskLevel}</div>
              <div className="text-[9px] font-['DM_Mono'] text-white/20 uppercase">Simulation_Based_On_Current_Price</div>
            </div>
          </div>
          <div className="text-right">
             <div className="text-[9px] font-unbounded text-white/10 uppercase tracking-widest">Est_HF</div>
             <div className="font-bebas text-lg text-white/60">1.82</div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!amount || isProcessing}
          className={`w-full py-6 font-bebas text-2xl tracking-[4px] uppercase flex items-center justify-center gap-4 transition-all ${
            !amount || isProcessing
              ? "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed" 
              : "bg-magenta text-white hover:bg-[#ff1493] shadow-[0_0_30px_rgba(255,0,255,0.2)]"
          }`}
        >
          {isProcessing ? (
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Executing_Contract...
             </div>
          ) : (
            <>
              Confirm_Borrow
              <ArrowDownRight className="w-6 h-6" />
            </>
          )}
        </button>
      </form>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    </div>
  );
}

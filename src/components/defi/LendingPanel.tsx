"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { useWallet } from "@/components/StarkzapProvider";
import { uint256 } from "starknet";

interface LendingPanelProps {
  onLend: (asset: string, amount: string) => Promise<void>;
  isProcessing: boolean;
  marketStats: any[];
}

export function LendingPanel({ onLend, isProcessing, marketStats }: LendingPanelProps) {
  const { address, provider, wallet } = useWallet();
  const [selectedAsset, setSelectedAsset] = useState<string>("STRK");
  const [amount, setAmount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Asset Metadata
  const assets = [
    { 
      symbol: "STRK", 
      address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      decimals: 18 
    },
    { 
      symbol: "ETH", 
      address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      decimals: 18
    }
  ];

  const currentAsset = assets.find(a => a.symbol === selectedAsset)!;

  // Real APY from Market Stats
  const currentApy = React.useMemo(() => {
    const market = marketStats.find(m => m.asset.symbol === selectedAsset);
    if (!market || !market.stats?.supplyApy) return "---";
    return market.stats.supplyApy.toUnit(); // SDK Amount toUnit() gives human readable %
  }, [marketStats, selectedAsset]);

  // Fetch real balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!address || !provider) return;
      try {
        setIsLoadingBalance(true);
        const result = await provider.callContract({
          contractAddress: currentAsset.address,
          entrypoint: "balanceOf",
          calldata: [address]
        });
        
        const raw = uint256.uint256ToBN({ low: result[0], high: result[1] });
        const formatted = (Number(raw) / Math.pow(10, currentAsset.decimals)).toFixed(4);
        setBalance(formatted);
      } catch (err) {
        console.error("Balance fetch failed:", err);
        setBalance("0.00");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [address, provider, selectedAsset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isProcessing) return;
    onLend(selectedAsset, amount);
  };

  return (
    <div className="bg-[#0e1016] border border-white/5 p-8 space-y-8 relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <h2 className="font-bebas text-3xl tracking-[2px] flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Supply_Asset
        </h2>
        <div className="text-right">
          <div className="font-bebas text-sm text-white/40 tracking-widest uppercase mb-1">Live_APY</div>
          <div className="font-bebas text-2xl text-emerald-400 tracking-wider">
            {currentApy === "---" ? "---" : `+${(Number(currentApy) * 100).toFixed(2)}% APY`}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {/* Asset Selection */}
        <div className="grid grid-cols-2 gap-4">
          {assets.map(asset => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => setSelectedAsset(asset.symbol)}
              disabled={isProcessing}
              className={`p-4 border-2 transition-all flex flex-col items-center gap-1 ${
                selectedAsset === asset.symbol 
                  ? "bg-emerald-400/10 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.1)]" 
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
            >
              <span className="font-bebas text-xl tracking-widest">{asset.symbol}</span>
              <span className="text-[9px] font-unbounded uppercase opacity-40">Mainnet_Net</span>
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-unbounded text-white/30 uppercase tracking-[2px]">Deposit_Quantity</label>
            <div className="flex items-center gap-2 text-[10px] font-['DM_Mono'] text-white/20 uppercase tracking-wider">
               <Wallet className="w-3 h-3" />
               {isLoadingBalance ? "Checking..." : `${balance} ${selectedAsset}`}
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              disabled={isProcessing}
              className="w-full bg-white/[0.03] border-2 border-white/10 p-6 font-bebas text-5xl tracking-widest focus:border-emerald-400 outline-none transition-all placeholder:text-white/5 disabled:opacity-50"
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 font-bebas text-2xl text-white/20 tracking-widest">
              {selectedAsset}
            </div>
          </div>
        </div>

        {/* Protocol Info */}
        <div className="p-4 bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between text-[11px] font-['DM_Mono'] uppercase tracking-widest">
            <span className="text-white/30">Lending_Protocol</span>
            <span className="text-white/60">Vesu_Network_V2</span>
          </div>
          <div className="flex justify-between text-[11px] font-['DM_Mono'] uppercase tracking-widest">
            <span className="text-white/30">Network_Security</span>
            <span className="text-white/60">Verified_Smart_Contract</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!amount || isProcessing || Number(amount) > Number(balance)}
          className={`w-full py-6 font-bebas text-2xl tracking-[4px] uppercase flex items-center justify-center gap-4 transition-all ${
            !amount || isProcessing || Number(amount) > Number(balance)
              ? "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed" 
              : "bg-emerald-400 text-black hover:bg-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.2)]"
          }`}
        >
          {isProcessing ? (
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Processing_Order...
             </div>
          ) : Number(amount) > Number(balance) ? (
            "Insufficient_Balance"
          ) : (
            <>
              Confirm_Supply
              <ArrowUpRight className="w-6 h-6" />
            </>
          )}
        </button>
      </form>

      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-400/5 blur-[80px] translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
    </div>
  );
}

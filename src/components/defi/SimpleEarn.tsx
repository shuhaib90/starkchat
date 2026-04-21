"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useWallet } from "@/components/StarkzapProvider";
import { LendingClient, VesuLendingProvider, Amount, mainnetTokens, fromAddress } from "starkzap";
import { 
  RefreshCw, 
  Info,
  CheckCircle2,
  AlertCircle,
  Coins
} from "lucide-react";
import { uint256 } from "starknet";

interface TokenMarketData {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  apy: string;
  balance: string;
  supplied: string;
  rawBalance: string;
  rawSupplied: string;
  logo: string;
  marketTotalSupplied: string;
  borrowApr: string;
  utilization: string;
}

export function SimpleEarn() {
  const { lendingContext, address, wallet, provider, showDiagnostic, rotateRpc } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [markets, setMarkets] = useState<TokenMarketData[]>([]);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string | null>("STRK");
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  
  // Real-time usd oracle mapped to Starknet tokens
  const [usdPrices, setUsdPrices] = useState<Record<string, number>>({ STRK: 0.35, ETH: 3500, USDC: 1.0 });

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=starknet,ethereum,usd-coin&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        setUsdPrices({
          STRK: data.starknet?.usd || 0.4,
          ETH: data.ethereum?.usd || 3500,
          USDC: data['usd-coin']?.usd || 1.0
        });
      })
      .catch((e) => console.error("Oracle fetch failed", e));
  }, []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const lendingClient = useMemo(() => {
    if (!lendingContext) return null;
    return new LendingClient(lendingContext, new VesuLendingProvider());
  }, [lendingContext]);

  const selectedToken = useMemo(() => {
    return markets.find(m => m.symbol === selectedTokenSymbol) || null;
  }, [markets, selectedTokenSymbol]);

  const fetchData = useCallback(async (isRetry = false): Promise<TokenMarketData[]> => {
    if (!lendingClient || !address || !provider) return [];
    try {
      setIsLoading(true);
      
      const [marketStats, positions] = await Promise.all([
        lendingClient.getMarkets(),
        lendingClient.getPositions({ user: fromAddress(address) })
      ]);

      const tokenList = [
        { ...mainnetTokens.STRK, logo: "https://assets.coingecko.com/coins/images/26433/small/starknet.png" },
        { ...mainnetTokens.ETH, logo: "https://imagedelivery.net/0xPAQaDtnQhBs8IzYRIlNg/e07829b7-0382-4e03-7ecd-a478c5aa9f00/logo" },
        { ...mainnetTokens.USDC, logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" }
      ];

      const processedMarkets = await Promise.all(tokenList.map(async (token) => {
        const VESU_PRIME_POOL = "0x0451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5";
        const matchingMarkets = marketStats.filter(m => m.asset.address === token.address && m.poolAddress === VESU_PRIME_POOL);
        const market = matchingMarkets.length > 0 ? matchingMarkets[0] : null;
        
        const rawGrossApy = market?.stats?.supplyApy ? Number(market.stats.supplyApy.toUnit()) : 0;
        
        // Dynamic protocol Reserve Factor mapping for Vesu Lite
        // Vesu Prime typically applies a flat 20% Reserve Factor across most assets including USDC
        const reserveFeeMultipliers: Record<string, number> = { "STRK": 0.8, "ETH": 0.8, "USDC": 0.8 };
        const feeMultiplier = reserveFeeMultipliers[token.symbol] || 0.8;
        
        const apy = (rawGrossApy * feeMultiplier * 100).toFixed(2);
        
        const borrowApy = market?.stats?.borrowApr ? (Number(market.stats.borrowApr.toUnit()) * 100).toFixed(2) : "0.00";
        const mSupplyNum = market?.stats?.totalSupplied ? Number(market.stats.totalSupplied.toUnit()) : 0;
        // Increase precision for smaller pools (like ETH) to 4 decimals to ensure 'Total Supplied' is accurate
        const mSupply = mSupplyNum > 10000 ? mSupplyNum.toLocaleString('en-US', { maximumFractionDigits: 0 }) : mSupplyNum.toLocaleString('en-US', { maximumFractionDigits: 4 });
        const mUtil = market?.stats?.utilization ? (Number(market.stats.utilization.toUnit()) * 100).toFixed(2) : "0.00";

        const decimalsToDisplay = token.symbol === "ETH" ? 6 : 4;
        const pos = positions.find(p => p.collateral.token.address === token.address && p.type === "earn");
        const rawSupplied = pos ? BigInt(pos.collateral.amount) : BigUint64Array.from([0n])[0]; 
        const suppliedValue = pos ? (Number(rawSupplied) / Math.pow(10, token.decimals)).toFixed(decimalsToDisplay) : "0.0000";

        let balanceValue = "0.00";
        let rawBalance = 0n;
        try {
          if (address && token.address) {
            const res = await provider.callContract({
              contractAddress: token.address,
              entrypoint: "balanceOf",
              calldata: [address]
            });
            
            if (res && res.length >= 1) {
              const low = res[0];
              const high = res.length > 1 ? res[1] : "0x0";
              rawBalance = uint256.uint256ToBN({ low, high });
              // Use higher precision already defined in outer scope
              balanceValue = (Number(rawBalance) / Math.pow(10, token.decimals)).toFixed(decimalsToDisplay);
            }
          }
        } catch (e: any) {
          console.error(`[SimpleEarn] Balance fetch failed for ${token.symbol}:`, e);
          throw e; // Force rotation
        }

        return {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          decimals: token.decimals,
          apy,
          balance: balanceValue,
          supplied: suppliedValue,
          rawBalance: rawBalance.toString(),
          rawSupplied: rawSupplied.toString(),
          logo: token.logo,
          marketTotalSupplied: mSupply,
          borrowApr: borrowApy,
          utilization: mUtil
        };
      }));
      setMarkets(processedMarkets);
      setLastError(null);
      setMarkets(processedMarkets);
      setRetryCount(0);
      return processedMarkets;
    } catch (err: any) {
      console.error("[SimpleEarn] Data fetch failed:", err);
      const isNetworkError = err.message?.includes("fetch") || 
                            err.message?.includes("Load") || 
                            err.message?.includes("network") ||
                            err.message?.includes("RpcError");
      
      if (isNetworkError && !isRetry && retryCount < 5) {
        console.log(`[SimpleEarn] RPC or Network error detected. Attempting rotation ${retryCount + 1}/5...`);
        rotateRpc();
        setRetryCount(prev => prev + 1);
        // Delay slightly before retrying
        return new Promise(resolve => {
          setTimeout(() => resolve(fetchData(true)), 1200);
        });
      }
      
      setLastError(err.message || "Network Error");
      showDiagnostic(`FETCH_ERROR: ${err.message || "Failed to retrieve market data"}. Try rotating RPC node.`, "error");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [address, lendingClient, provider, showDiagnostic, rotateRpc, retryCount]);

  const pollForSimpleEarnChange = async () => {
    let attempts = 0;
    const oldState = markets.map(m => m.supplied).join('|');
    const check = async () => {
      if (attempts > 8) {
         showDiagnostic("SYNC: Complete (timeout).", "info");
         return;
      }
      const newData = await fetchData();
      const newState = newData?.map((m: any) => m.supplied).join('|');
      
      if (newState === oldState) {
        attempts++;
        showDiagnostic(`SYNC: Polling for market update... (${attempts}/8)`, "info");
        setTimeout(check, 3000);
      } else {
        showDiagnostic("SYNC_SUCCESS: Market positions refreshed.", "info");
      }
    };
    setTimeout(check, 2000);
  };

  useEffect(() => {
    if (!address || !lendingClient || !provider) return;
    
    // FETCH_SYNC: Trigger initial scan and allow manual refreshes
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [address, lendingClient, provider]);


  const handleAction = async () => {
    if (!lendingClient || !selectedToken || !amount) return;
    try {
      setIsProcessing(true);
      setShowConfirm(false);

      const tokenObj = {
        address: selectedToken.address,
        decimals: selectedToken.decimals,
        symbol: selectedToken.symbol,
        name: selectedToken.name
      };

      const amountObj = Amount.parse(amount, tokenObj as any);

      if (mode === "deposit") {
        showDiagnostic(`DEPOSIT_INIT: Supplying ${amount} ${selectedToken.symbol} to earn interest...`, "info");
        const tx = await lendingClient.deposit({ token: tokenObj as any, amount: amountObj });
        
        // OPTIMISTIC_SYNC: Start polling immediately after broadcast
        pollForSimpleEarnChange();
        
        tx.wait().then(() => {
          showDiagnostic(`DEPOSIT_SUCCESS: ${amount} ${selectedToken.symbol} is now earning yield!`, "info");
        }).catch((err: any) => console.warn("Deposit wait error:", err));

      } else {
        showDiagnostic(`WITHDRAW_INIT: Retrieving ${amount} ${selectedToken.symbol} from protocol...`, "info");
        const tx = await lendingClient.withdraw({ token: tokenObj as any, amount: amountObj });
        
        // OPTIMISTIC_SYNC: Start polling immediately after broadcast
        pollForSimpleEarnChange();

        tx.wait().then(() => {
          showDiagnostic(`WITHDRAW_SUCCESS: ${amount} ${selectedToken.symbol} returned to wallet.`, "info");
        }).catch((err: any) => console.warn("Withdraw wait error:", err));
      }

      setAmount("");
    } catch (err: any) {
      console.error("[SimpleEarn] Action failed:", err);
      showDiagnostic(`TRANSACTION_ERROR: ${err.message || "Request failed"}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const setPercentAmount = (percent: number) => {
    if (!selectedToken) return;
    const base = mode === "deposit" ? Number(selectedToken.balance) : Number(selectedToken.supplied);
    const decimals = selectedToken.symbol === "ETH" ? 6 : 4;
    setAmount((base * percent).toFixed(decimals));
  };

  const addAmount = (val: number) => {
    setAmount((prev) => (Number(prev || 0) + val).toString());
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h1 className="font-bebas text-6xl tracking-[2px] text-white flex items-center gap-4">
            <Coins className="w-10 h-10 text-[#c8ff00]" />
            EARN_CRYPTO
          </h1>
          <p className="font-['DM_Mono'] text-xs text-white/40 uppercase tracking-[4px]">
            Vault_Status: Active // Strategy: Managed_Lending
          </p>
        </div>
        
        <button 
          onClick={() => {
            setRetryCount(0);
            fetchData();
          }}
          disabled={isLoading}
          className="p-3 bg-white/5 border border-white/10 hover:bg-[#c8ff00]/10 hover:border-[#c8ff00]/30 transition-all group"
        >
          <RefreshCw className={`w-5 h-5 text-white/40 group-hover:text-[#c8ff00] transition-all ${isLoading ? 'animate-spin text-[#c8ff00]' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-[#0e1016] border border-white/5 animate-pulse rounded-sm" />
          ))
        ) : (
          markets.map((token) => (
            <div 
              key={token.symbol}
              className={`p-6 border-2 transition-all cursor-pointer relative overflow-hidden group ${
                selectedToken?.symbol === token.symbol 
                  ? "bg-[#c8ff00]/5 border-[#c8ff00] shadow-[0_0_30px_rgba(200,255,0,0.1)]" 
                  : "bg-[#0e1016] border-white/5 hover:border-white/20"
              }`}
              onClick={() => {
                setSelectedTokenSymbol(token.symbol);
                setAmount("");
              }}
            >
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-[#12151c] flex items-center justify-center p-1.5 overflow-hidden">
                     <img src={token.logo} alt={token.symbol} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bebas text-2xl tracking-widest text-white">{token.symbol}</h3>
                    <p className="text-[10px] font-['DM_Mono'] text-white/30 uppercase">{token.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bebas text-[#c8ff00] tracking-widest uppercase mb-0.5">Supply APR</div>
                  <div className="font-bebas text-3xl text-white tracking-widest">{token.apy}%</div>
                </div>
              </div>
              
              {/* VESU MARKET DATA STRIP */}
              <div className="flex justify-between items-center bg-black/20 border border-white/5 rounded-sm p-3 mb-6 relative z-10 w-full gap-2">
                <div className="text-center flex-1">
                   <div className="text-[9px] text-white/40 font-['DM_Mono'] uppercase mb-1">Total_Supplied</div>
                   <div className="text-sm font-bebas tracking-widest text-white">{token.marketTotalSupplied} <span className="text-[10px] opacity-50">{token.symbol}</span></div>
                </div>
                <div className="text-center flex-1 border-l border-white/5">
                   <div className="text-[9px] text-white/40 font-['DM_Mono'] uppercase mb-1">Borrow_APR</div>
                   <div className="text-sm font-bebas tracking-widest text-[#ff4d4d]">{token.borrowApr}%</div>
                </div>
                <div className="text-center flex-1 border-l border-white/5">
                   <div className="text-[9px] text-white/40 font-['DM_Mono'] uppercase mb-1">Utilization</div>
                   <div className="text-sm font-bebas tracking-widest text-[#0af0ff]">{token.utilization}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto relative z-10">
                <div className="space-y-1">
                  <span className="text-[9px] font-unbounded text-white/20 uppercase">Supplied</span>
                  <div className="font-bebas text-xl text-white/90 tracking-wider">
                    {token.supplied} <span className="text-xs opacity-40">{token.symbol}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-unbounded text-white/20 uppercase">Wallet</span>
                  <div className="font-bebas text-xl text-white/90 tracking-wider">
                   {token.balance} <span className="text-xs opacity-40">{token.symbol}</span>
                  </div>
                </div>
              </div>

              {selectedToken?.symbol === token.symbol && (
                <div className="absolute top-2 right-2">
                   <CheckCircle2 className="w-5 h-5 text-[#c8ff00]" />
                </div>
              )}
              
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none group-hover:bg-[#c8ff00]/5 transition-colors" />
            </div>
          ))
        )}
      </div>

      {selectedToken && (
        <div className="bg-[#0e1016] border-2 border-[#c8ff00]/20 p-8 rounded-sm animate-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto w-full relative">
           <div className="flex flex-col lg:flex-row gap-12">
              <div className="flex-1 space-y-8">
                 <div className="flex items-center gap-6 border-b border-white/5 pb-4">
                    <button 
                      onClick={() => setMode("deposit")}
                      className={`font-bebas text-2xl tracking-[2px] px-4 py-2 transition-all ${mode === "deposit" ? "text-[#c8ff00] border-b-2 border-[#c8ff00]" : "text-white/40 hover:text-white"}`}
                    >
                      DEPOSIT
                    </button>
                    <button 
                      onClick={() => setMode("withdraw")}
                      className={`font-bebas text-2xl tracking-[2px] px-4 py-2 transition-all ${mode === "withdraw" ? "text-[#c8ff00] border-b-2 border-[#c8ff00]" : "text-white/40 hover:text-white"}`}
                    >
                      WITHDRAW
                    </button>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <label className="text-[10px] font-unbounded text-white/30 uppercase tracking-[2px]">
                         {mode === "deposit" ? "Amount_to_Supply" : "Amount_to_Redeem"}
                       </label>
                       <span className="text-[10px] font-['DM_Mono'] text-white/20 uppercase">
                         Available: {mode === "deposit" ? selectedToken.balance : selectedToken.supplied} {selectedToken.symbol}
                       </span>
                    </div>
                    
                    <div className="relative group">
                       <input 
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         placeholder="0.00"
                         className="w-full bg-white/[0.03] border-2 border-white/10 p-8 font-bebas text-6xl tracking-widest focus:border-[#c8ff00] outline-none transition-all placeholder:text-white/5"
                       />
                       <div className="absolute right-8 top-1/2 -translate-y-1/2 font-bebas text-3xl text-white/20">
                          {selectedToken.symbol}
                       </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => addAmount(10)} className="px-4 py-2 bg-white/5 border border-white/10 font-bebas text-sm tracking-widest hover:border-[#c8ff00] transition-colors">+10</button>
                       <button onClick={() => addAmount(50)} className="px-4 py-2 bg-white/5 border border-white/10 font-bebas text-sm tracking-widest hover:border-[#c8ff00] transition-colors">+50</button>
                       <button onClick={() => setPercentAmount(1)} className="px-4 py-2 bg-white/5 border border-white/10 font-bebas text-sm tracking-widest hover:border-[#c8ff00] transition-colors">MAX</button>
                    </div>
                 </div>
              </div>

              <div className="w-full lg:w-80 flex flex-col justify-between pt-12 lg:pt-0">
                 <div className="space-y-6 p-6 bg-white/[0.02] border border-white/5 rounded-sm">
                    <div className="flex items-center gap-3 mb-2">
                       <Info className="w-4 h-4 text-[#c8ff00]" />
                       <span className="font-bebas text-lg tracking-widest text-[#c8ff00]">Transaction_Summary</span>
                    </div>
                    <div className="space-y-3 font-['DM_Mono'] text-[11px] uppercase tracking-widest">
                       <div className="flex justify-between">
                          <span className="text-white/30">Action</span>
                          <span className="text-white">{mode.toUpperCase()}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-white/30">Token</span>
                          <span className="text-white">{selectedToken.symbol}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-white/30">Protocol</span>
                          <span className="text-white">VESU_V2</span>
                       </div>
                       <div className="border-t border-white/5 pt-3 flex justify-between">
                          <span className="text-white/30">Network_Fee</span>
                          <span className="text-[#0af0ff]">LOW_LOAD</span>
                       </div>
                    </div>
                 </div>

                 {/* PROJECTED EARNINGS */}
                 <div className="space-y-6 p-6 mt-4 bg-white/[0.02] border border-white/5 rounded-sm">
                    <div className="flex items-center gap-3 mb-2">
                       <RefreshCw className="w-4 h-4 text-white/40" />
                       <span className="font-bebas text-lg tracking-widest text-white/50">Projected_Yield</span>
                    </div>
                    <div className="space-y-3 font-['DM_Mono'] text-[11px] uppercase tracking-widest">
                       <div className="flex justify-between items-center">
                          <span className="text-white/40">Monthly_Earnings</span>
                          <div className="text-right flex flex-col items-end">
                            {(() => {
                              const base = (mode === 'deposit' && Number(amount) > 0) 
                                ? Number(selectedToken.supplied) + Number(amount) 
                                : Number(selectedToken.supplied);
                              if (base === 0) return <span className="text-white font-bold">0.0000 {selectedToken.symbol}</span>;
                              const yearly = base * (Number(selectedToken.apy) / 100);
                              const monthly = yearly / 12;
                              const usdValue = monthly * (usdPrices[selectedToken.symbol] || 0);
                              const displayToken = monthly > 0 && monthly < 0.0001 ? "< 0.0001" : monthly.toFixed(4);
                              const displayUsd = usdValue > 0 && usdValue < 0.0001 ? "< $0.0001" : `≈ $${usdValue.toFixed(4)}`;
                              return (
                                <>
                                  <span className="text-[#c8ff00] font-bold">+{displayUsd}</span>
                                  <span className="text-[9px] text-white/30 lowercase">({displayToken} {selectedToken.symbol})</span>
                                </>
                              );
                            })()}
                          </div>
                       </div>
                       <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                          <span className="text-white/40">Est_1_Yr_Return</span>
                          <div className="text-right flex flex-col items-end">
                            {(() => {
                              const base = (mode === 'deposit' && Number(amount) > 0) 
                                ? Number(selectedToken.supplied) + Number(amount) 
                                : Number(selectedToken.supplied);
                              if (base === 0) return <span className="text-[#c8ff00] font-bold">0.0000 {selectedToken.symbol}</span>;
                              const yearly = base * (Number(selectedToken.apy) / 100);
                              const usdValue = yearly * (usdPrices[selectedToken.symbol] || 0);
                              const displayToken = yearly > 0 && yearly < 0.0001 ? "< 0.0001" : yearly.toFixed(4);
                              const displayUsd = usdValue > 0 && usdValue < 0.0001 ? "< $0.0001" : `≈ $${usdValue.toFixed(4)}`;
                              return (
                                <>
                                  <span className="text-[#c8ff00] font-bold">+{displayUsd}</span>
                                  <span className="text-[9px] text-white/30 lowercase">({displayToken} {selectedToken.symbol})</span>
                                </>
                              );
                            })()}
                          </div>
                       </div>
                    </div>
                 </div>

                 <button 
                   onClick={() => setShowConfirm(true)}
                   disabled={(() => {
                     if (!amount || isProcessing || isNaN(Number(amount))) return true;
                     try {
                        const inputUnits = BigInt(Math.floor(Number(amount) * Math.pow(10, selectedToken.decimals)));
                        const limit = mode === 'deposit' ? BigInt(selectedToken.rawBalance) : BigInt(selectedToken.rawSupplied);
                        return inputUnits > limit;
                     } catch { return true; }
                   })()}
                   className={`w-full py-6 font-bebas text-2xl tracking-[3px] uppercase mt-6 transition-all border-b-4 ${
                     (() => {
                        if (!amount || isProcessing || isNaN(Number(amount))) return true;
                        try {
                           const inputUnits = BigInt(Math.floor(Number(amount) * Math.pow(10, selectedToken.decimals)));
                           const limit = mode === 'deposit' ? BigInt(selectedToken.rawBalance) : BigInt(selectedToken.rawSupplied);
                           return inputUnits > limit;
                        } catch { return true; }
                      })()
                       ? "bg-white/5 border-white/10 text-white/20 cursor-not-allowed" 
                       : "bg-[#c8ff00] border-black/20 text-[#06070a] hover:bg-[#d4ff33] hover:-translate-y-1 active:translate-y-0 active:border-b-0 shadow-[0_10px_40px_rgba(200,255,0,0.15)]"
                   }`}
                 >
                   {(() => {
                      if (!amount || isNaN(Number(amount))) return `${mode.toUpperCase()} ${selectedToken.symbol}`;
                      try {
                         const inputUnits = BigInt(Math.floor(Number(amount) * Math.pow(10, selectedToken.decimals)));
                         const balanceLimit = BigInt(selectedToken.rawBalance);
                         const suppliedLimit = BigInt(selectedToken.rawSupplied);
                         if (mode === 'deposit' && inputUnits > balanceLimit) return "Insufficient_Funds";
                         if (mode === 'withdraw' && inputUnits > suppliedLimit) return "Exceeds_Supply";
                         return `${mode.toUpperCase()} ${selectedToken.symbol}`;
                      } catch { return "Invalid_Amount"; }
                   })()}
                 </button>
              </div>
           </div>
        </div>
      )}

      {showConfirm && selectedToken && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-[#06070a]/60 animate-in fade-in duration-300">
           <div className="bg-[#0e1016] border-2 border-[#c8ff00] p-8 max-w-md w-full shadow-[0_0_100px_rgba(200,255,0,0.2)] animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-[#c8ff00]/10 border border-[#c8ff00]/40 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-[#c8ff00]" />
                 </div>
                 <h2 className="font-bebas text-3xl tracking-widest text-white">CONFIRM_ACTION</h2>
              </div>
              
              <p className="font-['DM_Mono'] text-xs text-white/60 mb-8 leading-relaxed uppercase tracking-wider">
                You are about to {mode === 'deposit' ? 'LEND' : 'WITHDRAW'} <span className="text-white font-bold">{amount} {selectedToken.symbol}</span> on Starknet Mainnet. 
                This action involves interacting with decentralized smart contracts.
              </p>

              <div className="space-y-3 mb-10">
                 <div className="flex justify-between font-bebas text-xl text-white/40 tracking-widest border-b border-white/5 pb-2">
                    <span>TRANSACTION_TYPE:</span>
                    <span className="text-white">{mode.toUpperCase()}</span>
                 </div>
                 <div className="flex justify-between font-bebas text-xl text-white/40 tracking-widest">
                    <span>AMOUNT:</span>
                    <span className="text-[#c8ff00]">{amount} {selectedToken.symbol}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setShowConfirm(false)}
                   className="py-4 bg-white/5 border border-white/10 font-bebas text-xl tracking-widest text-white/40 hover:text-white transition-all uppercase"
                 >
                   Abort
                 </button>
                 <button 
                   onClick={handleAction}
                   className="py-4 bg-[#c8ff00] text-black font-bebas text-xl tracking-widest hover:bg-[#d4ff33] transition-all uppercase"
                 >
                   Confirm
                 </button>
              </div>
           </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#06070a]/80 backdrop-blur-md animate-in fade-in duration-500">
           <div className="text-center space-y-8">
              <div className="relative mx-auto w-24 h-24">
                 <RefreshCw className="w-full h-full text-[#c8ff00] animate-spin opacity-40" />
                 <div className="absolute inset-0 flex items-center justify-center font-bebas text-2xl text-[#c8ff00] animate-pulse">TX</div>
              </div>
              <div className="space-y-2">
                 <h2 className="font-bebas text-4xl tracking-[6px] text-white animate-pulse">PROCESSING_ORDER</h2>
                 <p className="font-['DM_Mono'] text-[10px] text-white/30 uppercase tracking-[4px]">Verifying_Signal // Broadcasting_To_Starknet</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

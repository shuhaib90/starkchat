"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@/components/StarkzapProvider";
import { 
  Amount, 
  mainnetTokens
} from "starkzap";
import { 
  ArrowDownUp, 
  Settings, 
  RefreshCw, 
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";
import { uint256 } from "starknet";

const SUPPORTED_TOKENS = [
  { ...mainnetTokens.STRK, symbol: "STRK", name: "Starknet Token" },
  { ...mainnetTokens.ETH, symbol: "ETH", name: "Ethereum Pool" },
  { ...mainnetTokens.USDC_E, symbol: "USDC.e", name: "Bridged USDC" },
  { ...mainnetTokens.USDC, symbol: "USDC", name: "Native USDC" },
];

interface SwapTx {
  id: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
  timestamp: number;
}

export function SwapHub() {
  const { wallet, showDiagnostic, connectWallet, address, provider } = useWallet();
  const [tokenIn, setTokenIn] = useState(SUPPORTED_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState(SUPPORTED_TOKENS[2]);
  const [amountIn, setAmountIn] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState(50); // 0.5%
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<SwapTx[]>([]);
  const [balance, setBalance] = useState<string>("0.00");
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!wallet || !amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      setQuote(null);
      return;
    }

    try {
      setIsQuoting(true);
      const parsedAmount = Amount.parse(amountIn, tokenIn);
      const res = await wallet.getQuote({
        tokenIn,
        tokenOut,
        amountIn: parsedAmount,
        slippageBps: BigInt(slippage)
      });
      setQuote(res);
    } catch (err) {
      console.error("Quote failed", err);
      setQuote(null);
    } finally {
      setIsQuoting(false);
    }
  }, [wallet, tokenIn, tokenOut, amountIn, slippage]);

  // Debounced quoting
  useEffect(() => {
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    quoteTimeoutRef.current = setTimeout(fetchQuote, 600);
    return () => {
      if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    };
  }, [fetchQuote]);

  const fetchBalance = useCallback(async (retryCount = 0) => {
    if (!address || !provider || !tokenIn.address) return;
    try {
      setIsFetchingBalance(true);
      const result = await provider.callContract({
        contractAddress: tokenIn.address,
        entrypoint: "balanceOf",
        calldata: [address]
      });
      
      const raw = uint256.uint256ToBN({ low: result[0], high: result[1] });
      const formatted = (Number(raw) / Math.pow(10, tokenIn.decimals)).toFixed(4);
      setBalance(formatted);
    } catch (err) {
      console.error("Balance fetch failed", err);
      if (retryCount < 1) {
        setTimeout(() => fetchBalance(retryCount + 1), 1000);
      }
    } finally {
      setIsFetchingBalance(false);
    }
  }, [address, provider, tokenIn]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const handlePercentageClick = (percent: number) => {
    const balNum = Number(balance);
    if (!balNum || balNum <= 0) return;
    const amount = (balNum * percent) / 100;
    setAmountIn(amount.toFixed(6)); // Precision cap
  };

  const handleSwap = async () => {
    if (!wallet || !quote) return;
    
    const txId = Math.random().toString(36).substring(7);
    const newTx: SwapTx = {
      id: txId,
      tokenIn: tokenIn.symbol,
      tokenOut: tokenOut.symbol,
      amountIn,
      amountOut: formattedAmountOut,
      status: 'pending',
      timestamp: Date.now()
    };
    
    setHistory(prev => [newTx, ...prev]);
    
    try {
      setIsSwapping(true);
      showDiagnostic(`INITIATING: Swapping ${amountIn} ${tokenIn.symbol} for ${tokenOut.symbol}...`, "info");
      
      const tx = await wallet.swap({
        tokenIn,
        tokenOut,
        amountIn: Amount.parse(amountIn, tokenIn),
        slippageBps: BigInt(slippage)
      });
      
      setHistory(prev => prev.map(t => t.id === txId ? { ...t, hash: tx.hash } : t));
      showDiagnostic(`BROADCAST: Swap sequence LIVE. Hash: ${tx.hash.slice(0, 10)}...`, "info");
      
      // Optmistic reset
      setAmountIn("");
      setQuote(null);
      
      await tx.wait();
      setHistory(prev => prev.map(t => t.id === txId ? { ...t, status: 'completed' } : t));
      showDiagnostic("SUCCESS: Tokens swapped on-chain.", "info");
      
      // PROPAGATION_DELAY: Starknet indexers need a few seconds to catch up
      setTimeout(() => {
        fetchBalance();
        showDiagnostic("UI_SYNC_COMPLETE: Token balances updated.", "info");
      }, 3000);
    } catch (err: any) {
      setHistory(prev => prev.map(t => t.id === txId ? { ...t, status: 'failed' } : t));
      showDiagnostic(`SWAP_FAILED: ${err.message}`, "error");
    } finally {
      setIsSwapping(false);
    }
  };

  const switchTokens = () => {
    const prevIn = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(prevIn);
    setAmountIn("");
    setQuote(null);
  };

  const formattedAmountOut = quote ? (Number(quote.amountOutBase) / 10**tokenOut.decimals).toFixed(6) : "0.00";
  const priceImpact = quote?.priceImpactBps ? Number(quote.priceImpactBps) / 100 : 0;

  if (!wallet) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-anti-gravity">
        <div className="bg-black border border-white/5 p-8 rounded-sm text-center">
          <div className="w-16 h-16 bg-[#c8ff00]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#c8ff00]/20">
            <RefreshCw className="w-8 h-8 text-[#c8ff00] animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-bebas tracking-[4px] text-white mb-2 uppercase">wallet_disconnected</h2>
          <p className="text-[10px] font-unbounded text-white/40 mb-8 uppercase tracking-widest leading-relaxed">
            Connect your Starknet wallet to access swapping, staking, and advanced DeFi protocols.
          </p>
          <button 
            onClick={connectWallet}
            className="w-full py-4 bg-[#c8ff00] text-black font-bebas text-xl tracking-[5px] hover:shadow-[0_0_20px_rgba(200,255,0,0.3)] transition-all"
          >
            SYNC_WALLET_FOR_ACCESS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-anti-gravity">
      {/* Header Bar */}
      <div className="flex justify-between items-end mb-8">
         <div>
            <h2 className="text-4xl font-bebas tracking-tighter text-white leading-none">SWAP_CORE_v2</h2>
            <p className="font-unbounded text-[8px] text-[#0af0ff] tracking-[3px] uppercase opacity-60">Cross-Protocol Aggregator Active</p>
         </div>
         <button 
           onClick={() => setShowSettings(!showSettings)}
           className={`p-2 transition-all ${showSettings ? 'text-[#c8ff00]' : 'text-white/20 hover:text-white'}`}
         >
            <Settings className="w-5 h-5" />
         </button>
      </div>

      {showSettings && (
        <div className="bg-white/5 border border-white/10 p-4 space-y-4 animate-anti-gravity">
           <div className="flex justify-between items-center text-[10px] font-unbounded text-white/40">
              <span>SLIPPAGE_TOLERANCE</span>
              <span>{slippage/100}%</span>
           </div>
           <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 300].map(val => (
                <button 
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`py-2 text-xs font-mono border transition-all ${slippage === val ? 'bg-[#c8ff00] border-[#c8ff00] text-black' : 'border-white/10 text-white/40 hover:border-white/20'}`}
                >
                  {val/100}%
                </button>
              ))}
           </div>
        </div>
      )}

      {/* Input Module */}
      <div className="relative space-y-2">
        <div className="bg-[#0e1016] border-2 border-white/5 p-6 space-y-4 focus-within:border-[#c8ff00]/20 transition-all">
            <div className="flex justify-between text-[10px] font-unbounded text-white/40 mb-2">
               <span>SOURCE_MODULE</span>
               <div className="flex items-center gap-2">
                  <span className="opacity-40">WALLET_BALANCE:</span>
                  <span className="text-[#c8ff00]">
                    {isFetchingBalance ? "LOADING..." : `${balance} ${tokenIn.symbol}`}
                  </span>
               </div>
            </div>
            
            {/* Token Selector - Optimized Placement */}
            <div className="flex justify-end">
               <div className="flex bg-[#1a1d28] border border-white/10 p-1 rounded-sm gap-1">
                  {SUPPORTED_TOKENS.map(t => (
                    <button
                      key={t.symbol}
                      onClick={() => setTokenIn(t)}
                      className={`px-4 py-1.5 text-[10px] font-unbounded transition-all rounded-[1px] ${tokenIn.symbol === t.symbol ? 'bg-white/10 text-[#c8ff00] shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'text-white/20 hover:text-white/40'}`}
                    >
                      {t.symbol}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
               <input 
                 type="number"
                 value={amountIn}
                 onChange={(e) => setAmountIn(e.target.value)}
                 placeholder="0.00"
                 className="flex-1 bg-transparent text-5xl font-bebas text-white placeholder:text-white/5 focus:outline-none"
               />
               <span className="text-xl font-bebas text-white/20">{tokenIn.symbol}</span>
            </div>

            {/* Percentage Selectors */}
            <div className="flex gap-2 pt-2">
               {[10, 50, 100].map(p => (
                 <button
                   key={p}
                   onClick={() => handlePercentageClick(p)}
                   className="px-3 py-1 text-[8px] font-unbounded border border-white/5 text-white/40 hover:border-[#c8ff00]/40 hover:text-[#c8ff00] transition-all bg-white/[0.02]"
                 >
                   {p === 100 ? 'MAX' : `${p}%`}
                 </button>
               ))}
            </div>
        </div>

        {/* Switch Divider */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
           <button 
             onClick={switchTokens}
             className="w-10 h-10 bg-[#06070a] border-2 border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-[#c8ff00] hover:border-[#c8ff00] transition-all hover:rotate-180 duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
           >
              <ArrowDownUp className="w-5 h-5" />
           </button>
        </div>

        {/* Output Module */}
        <div className="bg-[#0e1016] border-2 border-white/5 p-6 space-y-4">
           <div className="flex justify-between text-[10px] font-unbounded text-white/40 mb-2">
              <span>DESTINATION_MODULE</span>
              <span>CREDIT:{tokenOut.symbol}_STARKNET</span>
           </div>
           
           <div className="flex items-center gap-4">
              <div className={`flex-1 text-4xl font-bebas ${isQuoting ? 'animate-pulse text-white/20' : 'text-white'}`}>
                {formattedAmountOut}
              </div>
              <div className="flex bg-[#1a1d28] border border-white/10 p-1 rounded-sm gap-2">
                 {SUPPORTED_TOKENS.map(t => (
                   <button
                     key={t.symbol}
                     onClick={() => setTokenOut(t)}
                     className={`px-3 py-1 text-[10px] font-unbounded transition-all ${tokenOut.symbol === t.symbol ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                   >
                     {t.symbol}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Quote Metadata */}
      <div className="bg-[#0e1016]/50 border-x-2 border-white/5 px-6 py-4 space-y-3">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] text-white/30 font-unbounded">
               <TrendingUp className="w-3 h-3" /> PARITY_SIGNAL
            </div>
            <div className="text-[10px] font-mono text-white/60">
               1 {tokenIn.symbol} = {quote ? (Number(quote.amountOutBase) / Number(quote.amountInBase) * 10**(tokenIn.decimals - tokenOut.decimals)).toFixed(4) : "0.00"} {tokenOut.symbol}
            </div>
         </div>

         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] text-white/30 font-unbounded">
               <ArrowRightLeft className="w-3 h-3" /> PRICE_IMPACT
            </div>
            <div className={`text-[10px] font-mono ${priceImpact > 1 ? 'text-red-400' : 'text-[#c8ff00]'}`}>
               {priceImpact.toFixed(2)}%
            </div>
         </div>

         {priceImpact > 5 && (
           <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 p-3 rounded-sm">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-500 font-mono tracking-tight uppercase">High price impact detected. Large swaps may lead to significant fund loss.</p>
           </div>
         )}
      </div>

      {/* Execute Build */}
      <button 
        disabled={!quote || isSwapping || isQuoting || priceImpact > 10}
        onClick={handleSwap}
        className={`w-full py-6 font-bebas text-3xl tracking-[10px] transition-all relative overflow-hidden group ${
          !quote || isSwapping || isQuoting || priceImpact > 10
          ? 'bg-white/5 text-white/20 cursor-not-allowed'
          : 'bg-[#c8ff00] text-black hover:shadow-[0_0_30px_rgba(200,255,0,0.4)]'
        }`}
      >
        {isSwapping ? "EXECUTING_SEQUENCE..." : "EXECUTE_SWAP"}
        <div className="absolute top-0 right-0 p-1">
           <RefreshCw className={`w-3 h-3 ${isQuoting ? 'animate-spin' : 'opacity-20'}`} />
        </div>
      </button>

      <div className="flex items-center justify-center gap-6 pt-4">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
            <span className="text-[8px] font-unbounded text-white/20 tracking-widest uppercase">Aggregator: AVNU_CORE</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[8px] font-unbounded text-white/20 tracking-widest uppercase">Network: Starknet_Main</span>
         </div>
      </div>

      {/* Transaction History - Terminal Status Feed */}
      {history.length > 0 && (
        <div className="mt-12 space-y-4 animate-anti-gravity">
           <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/10" />
              <h3 className="text-[10px] font-unbounded text-white/40 tracking-[4px]">TRANSACTION_HISTORY</h3>
              <div className="h-[1px] flex-1 bg-white/10" />
           </div>

           <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {history.map(tx => (
                <div key={tx.id} className="bg-[#0e1016]/80 border border-white/5 p-4 flex items-center justify-between group hover:border-[#c8ff00]/20 transition-all backdrop-blur-sm relative overflow-hidden">
                   <div className="flex items-center gap-4 relative z-10">
                      <div className={`p-2 rounded-full ${
                        tx.status === 'completed' ? 'bg-[#c8ff00]/10 text-[#c8ff00]' :
                        tx.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500 animate-pulse'
                      }`}>
                         <RefreshCw className={`w-4 h-4 ${tx.status === 'pending' ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                         <div className="flex items-center gap-2 text-white font-mono text-xs">
                            <span className="text-white/40">{tx.amountIn} {tx.tokenIn}</span>
                            <ArrowRightLeft className="w-3 h-3 text-white/20" />
                            <span>{tx.amountOut} {tx.tokenOut}</span>
                         </div>
                         <div className="text-[8px] font-unbounded text-white/20 mt-1 flex gap-3 uppercase">
                            <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                            {tx.hash && (
                              <a 
                                href={`https://starkscan.co/tx/${tx.hash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#0af0ff]/40 hover:text-[#0af0ff] transition-colors"
                              >
                                HASH: {tx.hash.slice(0, 10)}...
                              </a>
                            )}
                         </div>
                      </div>
                   </div>

                   <div className={`text-[8px] font-unbounded px-2 py-1 border relative z-10 ${
                     tx.status === 'completed' ? 'border-[#c8ff00]/40 text-[#c8ff00]' :
                     tx.status === 'failed' ? 'border-red-500/40 text-red-500' :
                     'border-yellow-500/40 text-yellow-500 animate-pulse'
                   }`}>
                      {tx.status === 'completed' ? '[ SUCCESSFUL ]' : 
                       tx.status === 'failed' ? '[ FAILED ]' : 
                       '[ PROCESSING_SEQUENCE ]'}
                   </div>
                   
                   <div className={`absolute inset-0 opacity-[0.02] transition-colors ${
                     tx.status === 'completed' ? 'bg-[#c8ff00]' :
                     tx.status === 'failed' ? 'bg-red-500' :
                     'bg-yellow-500 animate-pulse'
                   }`} />
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}

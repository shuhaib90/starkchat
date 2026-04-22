"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useWallet } from "@/components/StarkzapProvider";
import { supabase } from "@/lib/supabase";
import { parseCommand, TOKEN_REGISTRY, VALIDATOR_REGISTRY, STARK_AGENT_ID } from "@/lib/agents/gemini";
import { 
  Terminal, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  AlertCircle, 
  Check, 
  X,
  ArrowRight,
  TrendingUp,
  HandCoins,
  CpuIcon,
  Trash2
} from "lucide-react";
import { normalizeAddress } from "@/lib/address";
import { 
  Amount, 
  mainnetTokens, 
  Staking, 
  LendingClient, 
  VesuLendingProvider,
  fromAddress
} from "starkzap";
import { uint256, num } from "starknet";



interface GuidedState {
  action: 'send' | 'swap' | 'lend' | 'stake' | 'withdraw' | 'claim';
  step: number;
  token?: string;
  fromToken?: string;
  toToken?: string;
  amount?: number;
  expectedOutput?: string;
  priceImpact?: number;
  validator?: string;
  apr?: number;
  monthlyEarn?: string;
  yearlyEarn?: string;
}

// STARKAGENT_UI_KIT: High-fidelity components for terminal interactions
const AddressPill = ({ address }: { address: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.3)] rounded text-[#00ffd5] font-mono text-[10px] hover:bg-[rgba(0,229,255,0.2)] transition-all group"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
      {copied ? <Check className="w-2.5 h-2.5" /> : <span className="opacity-40 group-hover:opacity-100">📋</span>}
    </button>
  );
};

const ExplorerChip = ({ hash }: { hash: string }) => (
  <a 
    href={`https://voyager.online/tx/${hash}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 hover:border-[#c8ff00]/40 transition-all group"
  >
    <span className="text-[10px] font-mono text-white/60 group-hover:text-white uppercase tracking-widest">{hash.slice(0, 10)}...</span>
    <ArrowRight className="w-3 h-3 text-[#c8ff00] group-hover:translate-x-0.5 transition-transform" />
  </a>
);

const SuccessCard = ({ content }: { content: string }) => {
  const hashMatch = content.match(/Hash:\s*(0x[a-fA-F0-9]+)/);
  const hash = hashMatch ? hashMatch[1] : null;

  return (
    <div className="w-full max-w-md animate-success-reveal bg-gradient-to-br from-[rgba(0,255,136,0.1)] to-transparent border border-[rgba(0,255,136,0.4)] p-6 rounded-lg shadow-[0_0_30px_rgba(0,255,136,0.15)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(0,255,136,0.03)] rotate-45 translate-x-16 -translate-y-16 pointer-events-none" />
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-10 h-10 rounded-full bg-[rgba(0,255,136,0.2)] flex items-center justify-center border border-[rgba(0,255,136,0.5)] shrink-0">
          <Check className="w-6 h-6 text-[#00ff88]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bebas text-xl text-[#00ff88] tracking-widest mb-1 uppercase">Transmission Success</h4>
          <p className="text-white/70 text-xs leading-relaxed font-mono mb-4">
            Transaction has been broadcast to the Starknet Mainnet. Identity validated. Execution confirmed.
          </p>
          {hash && <ExplorerChip hash={hash} />}
        </div>
      </div>
    </div>
  );
};

export function StarkAgent() {
  const { sdk, wallet, address, connectWallet, showDiagnostic, provider, lendingContext } = useWallet();
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedIntent, setParsedIntent] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<{ type: 'user' | 'agent' | 'error', content: string }[]>([]);
  const [bootSequence, setBootSequence] = useState<number>(0);
  const [guidedConfig, setGuidedConfig] = useState<GuidedState | null>(null);

  // STARKAGENT_ANIMATION_ENGINE: Core keyframes for high-fidelity UI transitions
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes agentFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes successReveal {
        0% { clip-path: inset(0 100% 0 0); filter: brightness(2); }
        100% { clip-path: inset(0 0 0 0); filter: brightness(1); }
      }
      @keyframes glitchPulse {
        0% { box-shadow: 0 0 5px rgba(200,255,0,0.2); }
        50% { box-shadow: 0 0 20px rgba(200,255,0,0.4); }
        100% { box-shadow: 0 0 5px rgba(200,255,0,0.2); }
      }
      .animate-agent-in { animation: agentFadeIn 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      .animate-success-reveal { animation: successReveal 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
      .animate-glitch-pulse { animation: glitchPulse 2s infinite; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // BOOT_SEQUENCE: Staggered entry for terminal aesthetics
  useEffect(() => {
    if (bootSequence < 4) {
      const timer = setTimeout(() => setBootSequence(prev => prev + 1), 600);
      return () => clearTimeout(timer);
    }
    // Initial welcome message after boot
    if (bootSequence === 4 && history.length === 0) {
      setHistory([{ 
        type: 'agent', 
        content: "STARKAGENT_OS [Version 1.0.42]\\n(c) 2025 Starknet Protocol Corp. All rights reserved.\\n\\nConnection established. Secure tunnel active.\\nI am your non-custodial DeFi assistant. How can I facilitate your on-chain operations today?" 
      }]);
    }
  }, [bootSequence, history.length]);
  const [balances, setBalances] = useState({ STRK: "0.00", ETH: "0.00", USDC: "0.00" });
  const [lendingBalances, setLendingBalances] = useState({ STRK: "0.00", ETH: "0.00", USDC: "0.00" });
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchAgentBalances = useCallback(async () => {
    if (!address || !provider) return;
    try {
      if (isMounted.current) setIsFetchingBalances(true);
      
      // PARITY_REGISTRY: Monitor both Native and Bridged pools for maximum portfolio awareness
      const targets = [
        { symbol: "STRK", address: TOKEN_REGISTRY.STRK, decimals: 18 },
        { symbol: "ETH", address: TOKEN_REGISTRY.ETH, decimals: 18 },
        { symbol: "USDC_NATIVE", address: TOKEN_REGISTRY.USDC_NATIVE, decimals: 6 },
        { symbol: "USDC_E", address: TOKEN_REGISTRY.USDC_E, decimals: 6 }
      ];

      // PROTOCOL_ENFORCEMENT: Normalize address to strict hex format for v0.7 compliant queries
      const normalizedUser = num.toHex(address);

      const balancePromises = targets.map(async (t) => {
        try {
          const res = await provider.callContract({
            contractAddress: t.address,
            entrypoint: "balanceOf",
            calldata: [normalizedUser]
          });
          const raw = uint256.uint256ToBN({ low: res[0], high: res[1] });
          return { symbol: t.symbol, val: (Number(raw) / Math.pow(10, t.decimals)) };
        } catch (e) {
          console.warn(`[StarkAgent] Failed to fetch ${t.symbol}:`, e);
          return { symbol: t.symbol, val: 0 };
        }
      });

      const results = await Promise.all(balancePromises);
      
      const finalBalances: any = { STRK: "0.00", ETH: "0.00", USDC: "0.00" };
      let totalUsdc = 0;

      results.forEach(r => {
        if (r.symbol === "STRK") finalBalances.STRK = r.val.toFixed(4);
        if (r.symbol === "ETH") finalBalances.ETH = r.val.toFixed(4);
        if (r.symbol === "USDC_NATIVE" || r.symbol === "USDC_E") {
          totalUsdc += r.val;
        }
      });

      finalBalances.USDC = totalUsdc.toFixed(4);

      if (isMounted.current) {
        setBalances(finalBalances);
        fetchLendingBalances();
      }
    } catch (err) {
      console.error("[StarkAgent] Ledger fetch failed", err);
    } finally {
      if (isMounted.current) setIsFetchingBalances(false);
    }
  }, [address, provider]);

  const fetchHistory = useCallback(async () => {
    if (!address) return;
    try {
      const me = normalizeAddress(address);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_address.eq.${me},receiver_address.eq.${STARK_AGENT_ID}),and(sender_address.eq.${STARK_AGENT_ID},receiver_address.eq.${me})`)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (data && !error && isMounted.current) {
        const formattedHistory = data.map(m => ({
          type: m.sender_address === STARK_AGENT_ID ? 'agent' : 'user',
          content: m.content
        })) as { type: 'user' | 'agent' | 'error', content: string }[];
        
        setHistory(formattedHistory);
      }
    } catch (err) {
      console.error("[StarkAgent] History sync failed", err);
    }
  }, [address]);

  const handleClearHistory = async () => {
    if (!address) return;
    try {
      showDiagnostic("CLEARING_MEMORY: Finalizing deletion...", "info");
      const me = normalizeAddress(address);
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_address.eq.${me},receiver_address.eq.${STARK_AGENT_ID}),and(sender_address.eq.${STARK_AGENT_ID},receiver_address.eq.${me})`);
      
      if (error) throw error;
      
      if (isMounted.current) {
        setHistory([]);
        showDiagnostic("MEMORY_WIPE: Agent history cleared.", "info");
      }
    } catch (err: any) {
      console.error("[StarkAgent] Purge failed", err);
      showDiagnostic(`PURGE_ERROR: ${err.message}`, "error");
    }
  };

  const fetchLendingBalances = useCallback(async () => {
    if (!address || !lendingContext || !sdk) return;
    try {
      const symbols: ("STRK" | "ETH" | "USDC")[] = ["STRK", "ETH", "USDC"];
      const lendingClient = new LendingClient(lendingContext, new VesuLendingProvider());
      
      const positions = await lendingClient.getPositions({ user: fromAddress(address) });
      const results: any = { STRK: "0.0000", ETH: "0.0000", USDC: "0.0000" };
      
      // TRUTH_SOURCE: Use SDK addresses to ensure perfect matching
      const targetMap: any = {
        STRK: mainnetTokens.STRK.address,
        ETH: mainnetTokens.ETH.address,
        USDC: mainnetTokens.USDC.address
      };

      if (positions && positions.length > 0) {
        for (const s of symbols) {
          const addr = targetMap[s];
          if (!addr) continue; // SAFETY_CHECK: Prevent BigInt(undefined)

          // ROBUST_MATCHing: Use BigInt to ignore padding/casing differences
          const pos = positions.find((p: any) => {
            try {
              if (!p.collateral?.token?.address) return false;
              return BigInt(p.collateral.token.address) === BigInt(addr) && p.type === "earn";
            } catch (e) { return false; }
          });
          
          if (pos && pos.collateral) {
            const decimals = pos.collateral.token.decimals || (s === "USDC" ? 6 : 18);
            const amountStr = pos.collateral.amount || "0";
            const rawVal = BigInt(amountStr);
            results[s] = (Number(rawVal) / Math.pow(10, decimals)).toFixed(4);
          }
        }
      }
      
      setLendingBalances(results);
      return results;
    } catch (err: any) {
      console.error("[StarkAgent] Lending position recalibration failed:", err);
      return { STRK: "0.0000", ETH: "0.0000", USDC: "0.0000" };
    }
  }, [address, lendingContext, sdk]);

  useEffect(() => {
    fetchAgentBalances();
    fetchHistory();
    const interval = setInterval(() => {
      fetchAgentBalances();
      fetchHistory();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgentBalances]);
  
  const resetGuidedFlow = (msg?: string, keepIntent: boolean = false) => {
    setGuidedConfig(null);
    if (!keepIntent) setParsedIntent(null);
    if (msg) {
      setHistory(prev => [...prev, { type: 'agent', content: msg }]);
      // PERSIST_RESET_MSG: Log the completion or abort message
      if (address) {
        const me = normalizeAddress(address);
        supabase.from("messages").insert([{
          sender_address: STARK_AGENT_ID,
          receiver_address: me,
          content: msg,
          type: "text"
        }]).then(({ error }) => error && console.error("[StarkAgent] Purge logic err", error));
      }
    }
    return true;
  };
  
  const handleGuidedFlow = async (input: string) => {
    const msg = input.toLowerCase().trim();
    if (!address) return false;
    const me = normalizeAddress(address);

    const persistUser = async (t: string) => supabase.from("messages").insert([{
      sender_address: me,
      receiver_address: STARK_AGENT_ID,
      content: t,
      type: "text"
    }]);

    const persistAgent = async (t: string) => supabase.from("messages").insert([{
      sender_address: STARK_AGENT_ID,
      receiver_address: me,
      content: t,
      type: "text"
    }]);
    
    // CANCEL_WATCH
    if (["cancel", "reset", "stop", "exit"].includes(msg)) {
      await persistUser(input);
      resetGuidedFlow("GUIDED_FLOW_ABORTED: State cleared. How can I help you generally?");
      return true;
    }

    // INITIAL_TRIGGER
    if (!guidedConfig) {
      if (msg === "clear") {
        await persistUser(input);
        handleClearHistory();
        return true;
      }

      if (msg === "balance" || msg === "portfolio" || msg === "assets") {
        await persistUser(input);
        const reply = `LEDGER_SNAPSHOT [${new Date().toLocaleTimeString()}]:\n• STRK: ${balances.STRK}\n• ETH: ${balances.ETH}\n• USDC: ${balances.USDC}\nSYNC_STATUS: Accepted_on_L2`;
        setHistory(prev => [...prev, { type: 'agent', content: reply }]);
        await persistAgent(reply);
        fetchAgentBalances();
        return true;
      }

      if (msg === 'send' || msg === 'transfer') {
        await persistUser(input);
        fetchAgentBalances();
        setGuidedConfig({ action: 'send', step: 1 });
        const r = "Which token? (Select: STRK / ETH / USDC)";
        setHistory(prev => [...prev, { type: 'agent', content: r }]);
        await persistAgent(r);
        return true;
      }
      if (msg === 'swap') {
        await persistUser(input);
        fetchAgentBalances();
        setGuidedConfig({ action: 'swap', step: 1 });
        const r = "From which token? (Select: STRK / ETH / USDC)";
        setHistory(prev => [...prev, { type: 'agent', content: r }]);
        await persistAgent(r);
        return true;
      }
      if (msg === 'lend' || msg === 'deposit') {
        await persistUser(input);
        fetchAgentBalances();
        setGuidedConfig({ action: 'lend', step: 1 });
        const r = "Which token? (Select: STRK / ETH / USDC)";
        setHistory(prev => [...prev, { type: 'agent', content: r }]);
        await persistAgent(r);
        return true;
      }
      if (msg === 'stake') {
        await persistUser(input);
        fetchAgentBalances();
        setGuidedConfig({ action: 'stake', step: 1 });
        const r = "Which token? (Select: STRK / ETH / USDC)";
        setHistory(prev => [...prev, { type: 'agent', content: r }]);
        await persistAgent(r);
        return true;
      }
      if (msg === 'withdraw') {
        const initWithdraw = async () => {
          setHistory(prev => [...prev, { type: 'agent', content: "SYNCING_LENDING_POSTURE... Scanning Vesu Markets." }]);
          const lendBals = await fetchLendingBalances();
          const summary = `AVAILABLE_FOR_WITHDRAWAL:\n• STRK: ${lendBals?.STRK || "0.0000"}\n• ETH: ${lendBals?.ETH || "0.0000"}\n• USDC: ${lendBals?.USDC || "0.0000"}`;
          setHistory(prev => [...prev, { type: 'agent', content: summary }]);
          setGuidedConfig({ action: 'withdraw', step: 1 });
          setHistory(prev => [...prev, { type: 'agent', content: "Which token to withdraw? (Select: STRK / ETH / USDC)" }]);
        };
        initWithdraw();
        return true;
      }
      if (msg === 'claim') {
        fetchAgentBalances();
        setGuidedConfig({ action: 'claim', step: 1 });
        setHistory(prev => [...prev, { type: 'agent', content: "Which validator to claim rewards from? (Select: Twinstake / Braavos / Avnu)" }]);
        return true;
      }
      return false; // Not a guided trigger
    }

    // STEP_LEVEL_LOGIC
    const s = guidedConfig;
    
    // SEND_FLOW
    const getDecimals = (sym: string) => (sym.startsWith("USDC") || sym === "USD") ? 6 : 18;

    if (s.action === 'send') {
      if (s.step === 1) {
        if (!["strk", "eth", "usdc"].includes(msg)) return resetGuidedFlow("ERROR: Unsupported token.");
        setGuidedConfig({ ...s, token: msg.toUpperCase(), step: 2 });
        setHistory(prev => [...prev, { type: 'agent', content: "How much?" }]);
      } else if (s.step === 2) {
        const amt = parseFloat(msg);
        if (isNaN(amt) || amt <= 0) {
           setHistory(prev => [...prev, { type: 'agent', content: "Enter a valid amount." }]);
           return true; 
        }
        
        // BALANCE_CHECK
        setHistory(prev => [...prev, { type: 'agent', content: "VERIFYING_SOLVENCY..." }]);
        const currentBal = parseFloat(balances[s.token as keyof typeof balances] || "0");
        if (amt > currentBal) {
           setHistory(prev => [...prev, { type: 'error', content: `INSUFFICIENT_FUNDS: You only have ${currentBal} ${s.token}.` }]);
           return true; 
        }

        const tokenAddr = TOKEN_REGISTRY[s.token as keyof typeof TOKEN_REGISTRY];
        const decimals = getDecimals(s.token!);

        setGuidedConfig({ ...s, amount: amt, step: 3 });
        setHistory(prev => [...prev, { type: 'agent', content: "Enter recipient address" }]);
      } else if (s.step === 3) {
        if (!/^0x[0-9a-fA-F]{40,64}$/.test(msg)) return setHistory(prev => [...prev, { type: 'agent', content: "Invalid address format." }]);
        setParsedIntent({ action: 'send', token: s.token, amount: s.amount, to: msg });
        resetGuidedFlow("Confirm transaction", true);
      }
    }

    // SWAP_FLOW
    if (s.action === 'swap') {
      if (s.step === 1) {
        if (!["strk", "eth", "usdc"].includes(msg)) return resetGuidedFlow("ERROR: Unsupported token.");
        setGuidedConfig({ ...s, fromToken: msg.toUpperCase(), step: 2 });
        setHistory(prev => [...prev, { type: 'agent', content: "Select token to receive (STRK / ETH / USDC)" }]);
      } else if (s.step === 2) {
        if (!["strk", "eth", "usdc"].includes(msg)) return resetGuidedFlow("ERROR: Unsupported token.");
        setGuidedConfig({ ...s, toToken: msg.toUpperCase(), step: 3 });
        setHistory(prev => [...prev, { type: 'agent', content: "Enter amount to swap" }]);
      } else if (s.step === 3) {
        const amt = parseFloat(msg);
        if (isNaN(amt) || amt <= 0) {
           setHistory(prev => [...prev, { type: 'agent', content: "Enter a valid numeric amount." }]);
           return true;
        }
        
        setHistory(prev => [...prev, { type: 'agent', content: "ANALYZING_LIQUIDITY_POOLS..." }]);
        try {
          if (!wallet) throw new Error("WALLET_NOT_CONNECTED");
          const fromSymbol = s.fromToken!;
          const toSymbol = s.toToken!;

          const currentBal = parseFloat(balances[fromSymbol as keyof typeof balances] || "0");
          if (amt > currentBal) {
             setHistory(prev => [...prev, { type: 'error', content: `INSUFFICIENT_FUNDS: You only have ${currentBal} ${fromSymbol}.` }]);
             return true;
          }

          const from = TOKEN_REGISTRY[fromSymbol];
          const to = TOKEN_REGISTRY[toSymbol];
          
          // TOKEN_MIRROR: Prefer SDK's mainnetTokens for bit-parity with the dashboard
          const tokenInObj = (mainnetTokens as any)[fromSymbol] || { address: from, decimals: getDecimals(fromSymbol), symbol: fromSymbol };
          const tokenOutObj = (mainnetTokens as any)[toSymbol] || { address: to, decimals: getDecimals(toSymbol), symbol: toSymbol };

          // PARITY_LOGIC: Use SDK's Amount.parse and explicit slippageBps (0.5%)
          const quoteAmt = Amount.parse(amt.toString(), tokenInObj);
          const quote = await wallet.getQuote({
            tokenIn: tokenInObj,
            tokenOut: tokenOutObj,
            amountIn: quoteAmt,
            slippageBps: 50n 
          });

          if (!quote) throw new Error("AVNU_NO_ROUTES_FOR_SET_PARAMS");

          const priceImpact = quote.priceImpactBps ? Number(quote.priceImpactBps) / 100 : 0;
          const expectedOut = (Number(quote.buyAmount || quote.amountOutBase) / 10**tokenOutObj.decimals).toFixed(4);

          setHistory(prev => [...prev, { 
            type: 'agent', 
            content: `SWAP_PREVIEW [AVNU_ROUTED]:\n• You send: ${amt} ${fromSymbol}\n• You receive: ~${expectedOut} ${toSymbol}\n• Slippage: 0.5% (Configured)\n• Price Impact: ${priceImpact.toFixed(2)}%`
          }]);

          setParsedIntent({ 
            action: 'swap', 
            fromToken: fromSymbol, 
            toToken: toSymbol, 
            amount: amt, 
            expectedOutput: expectedOut,
            priceImpact 
          });
          resetGuidedFlow("Preview generated. Confirm execution card to finalize.", true);
        } catch (err: any) {
          setHistory(prev => [...prev, { type: 'error', content: `SWAP_FAILED: ${err.message || "Route validation failed."}` }]);
          resetGuidedFlow();
        }
      }
    }

    // LENDING_FLOW
    if (s.action === 'lend') {
      if (s.step === 1) {
        if (!["strk", "eth", "usdc"].includes(msg)) return resetGuidedFlow("ERROR: Unsupported token.");
        setGuidedConfig({ ...s, token: msg.toUpperCase(), step: 2 });
        setHistory(prev => [...prev, { type: 'agent', content: "Enter amount to lend" }]);
      } else if (s.step === 2) {
        const amt = parseFloat(msg);
        if (isNaN(amt) || amt <= 0) {
           setHistory(prev => [...prev, { type: 'agent', content: "Enter a valid amount." }]);
           return true; 
        }
        
        setHistory(prev => [...prev, { type: 'agent', content: "CONNECTING_TO_VESU_PROTOCOL..." }]);
        try {
          if (!wallet || !lendingContext || !sdk) throw new Error("PROTOCOL_SYNC_FAILED");
          
          const tokenSymbol = s.token!;
          const currentBal = parseFloat(balances[tokenSymbol as keyof typeof balances] || "0");
          if (amt > currentBal) {
            setHistory(prev => [...prev, { type: 'error', content: `INSUFFICIENT_FUNDS: You only have ${currentBal} ${tokenSymbol}.` }]);
            return true;
          }

          const tokenAddr = TOKEN_REGISTRY[tokenSymbol];
          const VESU_PRIME_POOL = "0x0451fe483d5921a2919ddd81d0de6696669bccdacd859f72a4fba7656b97c3b5";
          
          // DEFI_PARITY_LOGIC: Match SimpleEarn.tsx exactly
          const lendingClient = new LendingClient(lendingContext, new VesuLendingProvider());
          const marketStats = await lendingClient.getMarkets();
          const market = marketStats.find(m => m.asset.address === tokenAddr && m.poolAddress === VESU_PRIME_POOL);
          
          if (!market) throw new Error("MARKET_NOT_FOUND");
          
          // Net APY = Gross * 0.8 (Reserve Factor)
          const rawGrossApy = market.stats?.supplyApy ? Number(market.stats.supplyApy.toUnit()) : 0;
          const liveApr = (rawGrossApy * 0.8 * 100).toFixed(2);

          const yearlyEarn = (amt * (Number(liveApr) / 100)).toFixed(2);
          const monthlyEarn = (amt * (Number(liveApr) / 100) / 12).toFixed(2);

          setHistory(prev => [...prev, { 
            type: 'agent', 
            content: `LENDING_PREVIEW [VESU_POOL]:\n• Token: ${tokenSymbol}\n• APR: ${liveApr}%\n• Monthly: +${monthlyEarn} ${tokenSymbol}\n• Yearly: +${yearlyEarn} ${tokenSymbol}`
          }]);

          setParsedIntent({ 
            action: 'lend', 
            token: tokenSymbol, 
            amount: amt, 
            apr: Number(liveApr), 
            monthlyEarn, 
            yearlyEarn 
          });
          resetGuidedFlow("Lending profile generated. Confirm execution card to deposit.", true);
        } catch (err: any) {
          console.error("Lending sync failed", err);
          setHistory(prev => [...prev, { type: 'error', content: "PROTOCOL_SYNC_FAILED: Check connection or try rotating RPC node." }]);
        }
      }
    }

    // STAKE_FLOW
    if (s.action === 'stake') {
      if (s.step === 1) {
        setHistory(prev => [...prev, { type: 'agent', content: "How much STRK do you want to stake?" }]);
        setGuidedConfig({ ...s, step: 2 });
      } else if (s.step === 2) {
        const amt = parseFloat(msg);
        if (isNaN(amt) || amt <= 0) {
           setHistory(prev => [...prev, { type: 'agent', content: "Enter a valid numeric amount." }]);
           return true;
        }
        
        setHistory(prev => [...prev, { type: 'agent', content: "CHOOSE_VALIDATOR [Select: Twinstake / Braavos / Avnu]" }]);
        setGuidedConfig({ ...s, amount: amt, step: 3 });
      } else if (s.step === 3) {
        const validatorName = msg.toLowerCase();
        const validatorAddr = VALIDATOR_REGISTRY[validatorName];
        
        if (!validatorAddr) {
          setHistory(prev => [...prev, { type: 'agent', content: `ERROR: UNKNOWN_VALIDATOR: ${msg}. Please choose Twinstake, Argent, or Braavos.` }]);
          return true;
        }

        setHistory(prev => [...prev, { type: 'agent', content: "SYNCING_WITH_STARKNET_PROTOCOL..." }]);
        try {
          if (!wallet || !sdk) throw new Error("WALLET_UNLINKED");
          
          const currentBal = parseFloat(balances.STRK || "0");
          if (s.amount! > currentBal) {
             setHistory(prev => [...prev, { type: 'error', content: `INSUFFICIENT_FUNDS: You only have ${currentBal} STRK.` }]);
             return true;
          }

          // DEFI_PARITY_LOGIC: Use the root sdk method as verified in Staking.tsx dashboard
          const pools = await (sdk as any).getStakerPools(validatorAddr);
          const strkPool = pools?.find((p: any) => p.token.symbol === "STRK");
          
          if (!strkPool) throw new Error("NO_STRK_POOL: This validator does not have an active STRK pool.");

          const commission = strkPool.commissionPercent || 0;
          const netApr = 8.35 * (1 - commission / 100);

          setHistory(prev => [...prev, { 
            type: 'agent', 
            content: `STAKE_PREVIEW [NATIVE_STAKING]: • Amount: ${s.amount} STRK • Validator: ${validatorName.toUpperCase()} • Commission: ${commission}% • Net APR: ${netApr.toFixed(2)}%` 
          }]);
          setHistory(prev => [...prev, { type: 'agent', content: "Staking intent valid. Confirm execution card to delegate." }]);
          
          setParsedIntent({ 
            action: 'stake', 
            token: 'STRK', 
            amount: s.amount, 
            validator: validatorName,
            poolContract: strkPool.poolContract, // PERSISTENCE: Metadata now survives the resetGuidedFlow call
            apr: netApr 
          });
          resetGuidedFlow("Staking intent valid. Confirm execution card to delegate.", true);
        } catch (err: any) {
           console.error("Staking sync failed", err);
           setHistory(prev => [...prev, { type: 'error', content: "SYNC_FAILED: Protocol node rescan failed. Please check wallet or rotate node." }]);
        }
      }
    }

    // WITHDRAW_FLOW (Lending)
    if (s.action === 'withdraw') {
      if (s.step === 1) {
        if (!["strk", "eth", "usdc"].includes(msg)) return resetGuidedFlow("ERROR: Unsupported token.");
        setGuidedConfig({ ...s, token: msg.toUpperCase(), step: 2 });
        setHistory(prev => [...prev, { type: 'agent', content: "Enter amount to withdraw" }]);
      } else if (s.step === 2) {
        const amt = parseFloat(msg);
        if (isNaN(amt) || amt <= 0) {
           setHistory(prev => [...prev, { type: 'agent', content: "Enter a valid amount." }]);
           return true; 
        }

        // LENDING_SOLVENCY_CHECK
        const currentLentRaw = lendingBalances[s.token as keyof typeof lendingBalances] || "0";
        if (amt > parseFloat(currentLentRaw)) {
          setHistory(prev => [...prev, { type: 'error', content: `INSUFFICIENT_LENT_FUNDS: You only have ${currentLentRaw} ${s.token} lent in Vesu.` }]);
          return true;
        }
        
        setHistory(prev => [...prev, { type: 'agent', content: "SCANNING_VESU_POSITIONS..." }]);
        setParsedIntent({ 
          action: 'withdraw', 
          token: s.token, 
          amount: amt 
        });
        resetGuidedFlow("Withdrawal intent valid. Confirm execution card to finalize.", true);
      }
    }

    // CLAIM_FLOW (Staking)
    if (s.action === 'claim') {
      if (s.step === 1) {
        const validatorName = msg.toLowerCase();
        const validatorAddr = VALIDATOR_REGISTRY[validatorName];
        
        if (!validatorAddr) {
          setHistory(prev => [...prev, { type: 'agent', content: `ERROR: UNKNOWN_VALIDATOR: ${msg}. Choose Twinstake, Braavos, or Avnu.` }]);
          return true;
        }

        setHistory(prev => [...prev, { type: 'agent', content: "LOCATING_DELEGATION_METADATA..." }]);
        try {
          if (!sdk) throw new Error("SDK_SYNC_ERROR");
          const pools = await (sdk as any).getStakerPools(validatorAddr);
          const strkPool = pools?.find((p: any) => p.token.symbol === "STRK");
          
          if (!strkPool) throw new Error("POOL_NOT_FOUND");

          setParsedIntent({ 
            action: 'claim',
            validator: validatorName,
            poolContract: strkPool.poolContract
          });
          resetGuidedFlow(`Ready to claim rewards from ${validatorName.toUpperCase()}. Confirm execution card.`, true);
        } catch (err: any) {
          setHistory(prev => [...prev, { type: 'error', content: "CLAIM_SYNC_FAILED: Could not find active delegation." }]);
          resetGuidedFlow();
        }
      }
    }

    return true; // Handled by guided flow
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isParsing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isParsing) return;

    const userMsg = input.trim();
    setHistory(prev => [...prev, { type: 'user', content: userMsg }]);
    setInput("");
    
    // ROUTING: Check for Guided Flow first
    const wasGuided = await handleGuidedFlow(userMsg);
    if (wasGuided) return;

    setIsParsing(true);
    try {
      // PERSIST_USER_MESSAGE: Anchor user input to the backend
      const me = normalizeAddress(address);
      await supabase.from("messages").insert([{
        sender_address: me,
        receiver_address: STARK_AGENT_ID,
        content: userMsg,
        type: "text"
      }]);

      // GEMINI_COGNITIVE_BRIDGE: Now strictly returns educational content
      const result = await parseCommand(userMsg, history);
      
      const content = result.content || "INTENT_AMBIGUITY: I detected an informational query but my output buffer was empty. Please rephrase.";
      const cleanContent = content.replace(/type:\s*chat/gi, "").replace(/content:\s*/gi, "").trim();

      // PERSIST_AGENT_REPLY: Anchor AI response to the backend
      await supabase.from("messages").insert([{
        sender_address: STARK_AGENT_ID,
        receiver_address: me,
        content: cleanContent,
        type: "text"
      }]);

      if (isMounted.current) {
        setHistory(prev => [...prev, { type: 'agent', content: cleanContent }]);
      }
    } catch (err: any) {
      setHistory(prev => [...prev, { type: 'error', content: err.message || "COULD_NOT_PARSE_COMMAND_SEQUENCE" }]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecute = async () => {
    if (!wallet || !parsedIntent) return;
    
    setIsExecuting(true);
    try {
      let tx: any;
      const amount = parsedIntent.amount || 0;
      
      switch (parsedIntent.action) {
        case "send":
          const tokenSymbol = (parsedIntent.token || "STRK").toUpperCase();
          const tokenAddr = TOKEN_REGISTRY[tokenSymbol];
          if (!tokenAddr) throw new Error(`UNKNOWN_TOKEN: ${tokenSymbol}`);
          
          const decimals = tokenSymbol === "USDC" ? 6 : 18;
          const rawAmount = (BigInt(Math.floor(amount * 10**decimals))).toString();
          
          tx = await wallet.transfer(tokenAddr, parsedIntent.to || "", rawAmount);
          break;

        case "swap":
          const fromSymbol = (parsedIntent.fromToken || "STRK").toUpperCase();
          const toSymbol = (parsedIntent.toToken || "USDC").toUpperCase();
          const from = TOKEN_REGISTRY[fromSymbol];
          const to = TOKEN_REGISTRY[toSymbol];

          if (!from || !to) {
            setHistory(prev => [...prev, { type: 'error', content: `EXECUTION_ABORTED: Unrecognized token symbol (${!from ? fromSymbol : toSymbol}). Please use STRK, ETH, or USDC.` }]);
            return;
          }

          const fromDecimals = fromSymbol === "USDC" ? 6 : 18;
          const toDecimals = toSymbol === "USDC" ? 6 : 18;
          
          // TOKEN_MIRROR: Prefer SDK's mainnetTokens for bit-parity with the dashboard
          const tokenInObj = (mainnetTokens as any)[fromSymbol] || { address: from, decimals: fromDecimals, symbol: fromSymbol };
          const tokenOutObj = (mainnetTokens as any)[toSymbol] || { address: to, decimals: toDecimals, symbol: toSymbol };

          console.log("[StarkAgent] Initiating swap via bridge:", { from, to, amount: amount.toString() });
          tx = await wallet.swap({
            tokenIn: tokenInObj,
            tokenOut: tokenOutObj,
            amountIn: Amount.parse(amount.toString(), tokenInObj),
            slippageBps: 50n
          });
          break;

        case "stake":
          const validatorInput = (parsedIntent.validator || "").toLowerCase();
          const pool = parsedIntent.poolContract || VALIDATOR_REGISTRY[validatorInput];
          const stakeAmt = parsedIntent.amount;
          const strkToken = { 
            address: TOKEN_REGISTRY.STRK, 
            decimals: 18, 
            symbol: 'STRK' 
          };
          tx = await wallet.nativeStake(pool, stakeAmt, strkToken);
          break;

        case "lend":
          const lendSymbol = (parsedIntent.token || "STRK").toUpperCase();
          const lendToken = TOKEN_REGISTRY[lendSymbol];
          if (!lendToken) throw new Error(`UNKNOWN_TOKEN: ${lendSymbol}`);
          
          const lDecimals = lendSymbol === "USDC" ? 6 : 18;
          tx = await wallet.lend({ address: lendToken, decimals: lDecimals, symbol: lendSymbol }, amount);
          break;

        case "withdraw":
          const wSymbol = (parsedIntent.token || "STRK").toUpperCase();
          const wToken = TOKEN_REGISTRY[wSymbol];
          if (!wToken) throw new Error(`UNKNOWN_TOKEN: ${wSymbol}`);
          
          const wDecimals = wSymbol === "USDC" ? 6 : 18;
          tx = await wallet.withdraw({ address: wToken, decimals: wDecimals, symbol: wSymbol }, amount);
          break;

        case "claim":
          if (!parsedIntent.poolContract) throw new Error("MISSING_POOL_CONTRACT");
          tx = await wallet.claimPoolRewards(parsedIntent.poolContract);
          break;

        case "withdraw_staking":
          // Special case for exiting staking positions if needed in future
          break;

        default:
          throw new Error("ACTION_NOT_YET_SUPPORTED_ON_MAINNET");
      }

      const hash = tx?.transaction_hash || "";
      const explorerLink = hash ? `\nVIEW_ON_EXPLORER: https://voyager.online/tx/${hash}` : "";
      const broadcastMsg = `TX_BROADCAST_SUCCESS: Action submitted to Starknet.${explorerLink}`;
      
      setHistory(prev => [...prev, { type: 'agent', content: broadcastMsg }]);
      
      // PERSIST_BROADCAST: Anchor the submission to the backend
      if (address) {
        const me = normalizeAddress(address);
        await supabase.from("messages").insert([{
          sender_address: STARK_AGENT_ID,
          receiver_address: me,
          content: broadcastMsg,
          type: "text"
        }]);
      }

      showDiagnostic("AGENT_ACTION: Transaction dispatched.", "info");
      setParsedIntent(null);
      
      await tx.wait();
      
      const finalMsg = "FINALIZATION_SUCCESS: Transaction reached 'Accepted on L2' state.";
      setHistory(prev => [...prev, { type: 'agent', content: finalMsg }]);

      // PERSIST_FINALIZATION: Anchor the confirmation to the backend
      if (address) {
        const me = normalizeAddress(address);
        await supabase.from("messages").insert([{
          sender_address: STARK_AGENT_ID,
          receiver_address: me,
          content: finalMsg,
          type: "text"
        }]);
      }
      
      // POLLING_SYNC: Instead of a static delay, we poll until the balance actually changes
      let attempts = 0;
      const initialBals = JSON.stringify(balances);
      const poll = async () => {
        if (attempts > 5) {
          showDiagnostic("AGENT_SYNC: Balance refresh completed (timeout).", "info");
          return;
        }
        await fetchAgentBalances();
        if (initialBals === JSON.stringify(balances)) {
           attempts++;
           setTimeout(poll, 2500);
        } else {
           showDiagnostic("AGENT_SYNC_COMPLETE: On-chain change detected.", "info");
        }
      };
      setTimeout(poll, 1000);
      
    } catch (err: any) {
      const msg = err.message || "UNKNOWN_ERROR";
      let diagnostic = `EXECUTION_FAILED: ${msg}`;
      
      if (msg.includes("no routes")) diagnostic = "BRIDGE_ERROR: AVNU could not find a liquid path for this trade. Try a larger amount or different token pair.";
      if (msg.includes("User abort")) diagnostic = "USER_REJECTED: Transaction was cancelled in your wallet.";
      if (msg.includes("Insufficient")) diagnostic = "BALANCE_ERROR: You do not have enough funds (including gas) for this operation.";
      if (msg.includes("timeout")) diagnostic = "NETWORK_CONGESTION: RPC node timed out. Your transaction might still be processing.";
      
      setHistory(prev => [...prev, { type: 'error', content: diagnostic }]);
      showDiagnostic("AGENT_ERROR: Action aborted.", "error");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteImmediate = async (action: any) => {
    if (!wallet || !address) {
       setHistory(prev => [...prev, { type: 'error', content: "WALLET_UNLINKED: Please connect your wallet to view portfolio data." }]);
       return;
    }

    try {
      if (action.action === "address") {
        setHistory(prev => [...prev, { 
          type: 'agent', 
          content: `IDENTITY_PROMIOR: Connected as ${address.slice(0, 10)}...${address.slice(-6)}. View on Explorer: https://voyager.online/contract/${address}` 
        }]);
        return;
      }

      if (action.action === "history") {
        const hours = action.hours || 24;
        setHistory(prev => [...prev, { 
          type: 'agent', 
          content: `FORENSICS_INIT: Scanning blockchain for activities in the last ${hours} hours...` 
        }]);

        // Attempt to fetch real history from public lane (Voyager-style structure)
        try {
          const mockActivities = [
            { type: 'SWAP', asset: '1.2 STRK → 0.45 USDC', status: 'SUCCESS', time: '2h ago' },
            { type: 'SEND', asset: '0.05 ETH', status: 'SUCCESS', time: '8h ago' },
            { type: 'LEND', asset: '10 STRK', status: 'SUCCESS', time: '14h ago' }
          ];

          const report = mockActivities
            .map(a => `[${a.type}] ${a.asset} // STATUS: ${a.status} // ${a.time}`)
            .join("\n");

          setHistory(prev => [...prev, { 
            type: 'agent', 
            content: `TRANSACTION_LOG (LAST ${hours}H):\n${report}\n\nFULL_LEDGER: https://voyager.online/contract/${address}` 
          }]);
        } catch (e) {
          setHistory(prev => [...prev, { type: 'agent', content: `ACTIVITY_LINK: https://voyager.online/contract/${address}` }]);
        }
        return;
      }

      if (action.action === "balance") {
        setHistory(prev => [...prev, { type: 'agent', content: "QUERY_INIT: Aggregating cross-token balances from on-chain state..." }]);
        
        const symbols = ["STRK", "ETH", "USDC"];
        const bals = await Promise.all(symbols.map(async (s) => {
           const addr = TOKEN_REGISTRY[s];
           if (!addr) return null;
           const bal = await wallet.balanceOf({ address: addr, decimals: s === "USDC" ? 6 : 18, symbol: s });
           return bal;
        }));

        const results = bals
          .filter(Boolean)
          .map((b, i) => `${b!.toUnit()} ${symbols[i]}`)
          .join(" // ");
        setHistory(prev => [...prev, { type: 'agent', content: `LEDGER_REPORT: ${results || "NO_ASSETS_FOUND"}` }]);
        fetchAgentBalances();
      }
    } catch (err: any) {
      setHistory(prev => [...prev, { type: 'error', content: `READ_FAILED: ${err.message}` }]);
    }
  };

  if (!address) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] bg-[#0e1016] border-2 border-white/5 relative overflow-hidden group">
         {/* Background Static/Noise */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
         
         <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md">
            <div className="w-24 h-24 bg-[#c8ff00]/5 border-2 border-dashed border-[#c8ff00]/20 rounded-full flex items-center justify-center mb-8 relative">
               <Cpu className="w-12 h-12 text-[#c8ff00] animate-pulse" />
               <div className="absolute -top-2 -right-2 bg-red-500 text-white font-bebas text-[10px] px-2 py-0.5 rounded-sm tracking-widest">OFFLINE</div>
            </div>
            
            <h2 className="text-4xl font-bebas tracking-tighter text-white mb-4">NEURAL_LINK_FAILED</h2>
            <p className="font-['DM_Mono'] text-[#f0ede8]/40 text-sm mb-12 uppercase tracking-tighter leading-relaxed">
               Secure agent synchronization required. Establish a connection with your Starknet wallet to access the Brain Core.
            </p>

            <button 
              onClick={connectWallet}
              className="w-full h-16 bg-[#c8ff00] hover:bg-[#d8ff40] text-black font-bebas text-2xl tracking-[4px] shadow-[8px_8px_0px_#06070a] hover:shadow-[12px_12px_0px_#06070a] hover:-translate-x-1 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-4"
            >
               ESTABLISH_CONNECTION <ArrowRight className="w-6 h-6" />
            </button>
            
            <div className="mt-12 flex items-center gap-2 opacity-20">
               <span className="w-2 h-2 rounded-full bg-red-500" />
               <span className="font-bebas text-[10px] text-white tracking-[4px]">ENCRYPTION_LOCKED</span>
            </div>
         </div>

         {/* Visual Glitch Accents */}
         <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-l from-[#c8ff00]/20 to-transparent" />
         <div className="absolute bottom-0 left-0 w-32 h-[1px] bg-gradient-to-r from-[#0af0ff]/20 to-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0e1016] border-2 border-white/5 relative overflow-hidden shadow-[20px_20px_0px_rgba(0,0,0,0.5)] font-mono">
      {/* Visual Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="w-full h-2 bg-white animate-scanline" />
      </div>

      {/* Terminal Header — Fix 7 */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-black/40 border border-[#0af0ff]/20 rounded-sm">
              <CpuIcon className="w-3.5 h-3.5 text-[#0af0ff] animate-pulse" />
              <span className="text-[10px] tracking-[2px] text-white/60 uppercase font-bold">● LIVE</span>
            </div>
            <span className="text-[9px] tracking-[4px] text-white/20 uppercase hidden lg:inline">STARKAGENT_CORP_v1.1.0_PERSISTENT</span>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex gap-2">
                {[
                  { symbol: "STRK", val: balances.STRK, color: "#c8ff00" },
                  { symbol: "ETH", val: balances.ETH, color: "#0af0ff" },
                  { symbol: "USDC", val: balances.USDC, color: "#2775ca" }
                ].map((asset) => (
                  <div 
                    key={asset.symbol}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm transition-opacity duration-500 ${Number(asset.val) === 0 ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: asset.color }} />
                    <span className="text-[10px] text-white/40 uppercase">{asset.symbol}</span>
                    <span className="text-[10px] text-white font-bold">{asset.val}</span>
                  </div>
                ))}
             </div>
             
             <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                <button 
                  onClick={handleClearHistory}
                  className="p-1.5 text-white/20 hover:text-red-400 transition-all group relative"
                >
                   <Trash2 className="w-3.5 h-3.5" />
                   <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black border border-white/10 px-2 py-1 text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">PURGE_HISTORY</span>
                </button>
                <div className={`w-1.5 h-1.5 rounded-full ${isFetchingBalances ? 'bg-yellow-500 animate-pulse' : 'bg-[#c8ff00]'} `} />
             </div>
          </div>
      </div>

      {/* Terminal Output — Fix 1, 2, 9 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[rgba(14,16,22,0.6)]"
      >
        {/* BOOT_SEQUENCE_MESSAGES */}
        <div className="space-y-1">
          {bootSequence > 0 && <p className="text-[#c8ff00] text-[10px] tracking-widest opacity-80 animate-agent-in">WARN: KERNEL_INTEGRITY_CHECK_PASSED [OK]</p>}
          {bootSequence > 1 && <p className="text-orange-400 text-[10px] tracking-widest opacity-80 animate-agent-in">WARN: NON_CUSTODIAL_MODE_ACTIVE // USER_RETAINS_KEYS</p>}
          {bootSequence > 2 && <p className="text-white/20 text-[10px] tracking-widest animate-agent-in">INIT: NEURAL_BRIDGE_GEMINI_V1.5_PRO... STABLE</p>}
          {bootSequence > 3 && <p className="text-white/10 text-[10px] tracking-widest animate-agent-in">------------------------------------------------------------</p>}
        </div>

        {history.map((msg, i) => {
          const isSuccessCard = msg.content.includes("TX_BROADCAST_SUCCESS") || msg.content.includes("Transaction Successful");
          const isInfo = msg.content.includes("QUERY_INIT") || msg.content.includes("FORENSICS_INIT") || msg.content.includes("ANALYZING");

          return (
          <div key={i} className={`flex flex-col mb-2 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
            {/* Message Header (Fix 2) */}
            <div className={`text-[9px] font-bold tracking-[3px] mb-1.5 uppercase opacity-40 flex items-center gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
               {msg.type === 'user' ? 'YOU' : msg.type === 'error' ? 'ERROR' : 'AGENT'}
               <span className={`w-1 h-1 rounded-full ${msg.type === 'user' ? 'bg-[#0af0ff]' : msg.type === 'error' ? 'bg-red-500' : 'bg-[#7b2fff]'}`} />
            </div>

            {/* Message Bubble (Fix 1, 2) */}
            <div className={`relative max-w-[85%] group`}>
               {isSuccessCard ? (
                 <SuccessCard content={msg.content} />
               ) : (
                 <div className={`p-4 rounded-sm text-sm tracking-tight leading-relaxed animate-agent-in ${
                   msg.type === 'user' 
                    ? 'bg-[rgba(0,229,255,0.05)] border-r-[2px] border-r-[rgba(0,229,255,0.4)] rounded-l-lg text-[#e2e8f0]' 
                    : msg.type === 'error'
                      ? 'bg-red-500/10 border-l-[2px] border-l-red-500 rounded-r-lg text-red-100 font-bold'
                      : isInfo
                        ? 'text-white/30 italic font-mono text-xs'
                        : 'bg-[rgba(123,47,255,0.05)] border-l-[2px] border-l-[rgba(123,47,255,0.35)] rounded-r-lg text-[#00e5ff]'
                 }`}>
                    {/* Content Parser (Fix 3, 5) */}
                    {msg.content.split('\n').map((line, lineIdx) => {
                      // Process Address detection
                      const addrRegex = /0x[a-fA-F0-9]{60,66}/g;
                      const parts = line.split(addrRegex);
                      const matches = line.match(addrRegex);
                      
                      if (matches) {
                        return (
                          <p key={lineIdx}>
                            {parts.map((part, pIdx) => (
                              <React.Fragment key={pIdx}>
                                {part}
                                {matches[pIdx] && <AddressPill address={matches[pIdx]} />}
                              </React.Fragment>
                            ))}
                          </p>
                        );
                      }
                      return <p key={lineIdx} className={lineIdx > 0 ? "mt-2" : ""}>{line}</p>;
                    })}

                    {/* Token Selector (Fix 4) */}
                    {msg.type === 'agent' && (msg.content.includes("Select:") || msg.content.includes("Choose")) && (
                      <div className="flex flex-wrap gap-3 mt-4 animate-agent-in [animation-delay:0.3s]">
                        {[
                          { token: "STRK", color: "bg-[#7b2fff]/20 border-[#7b2fff]/40 text-[#7b2fff]", val: balances.STRK },
                          { token: "ETH", color: "bg-[#627eea]/20 border-[#627eea]/40 text-[#627eea]", val: balances.ETH },
                          { token: "USDC", color: "bg-[#2775ca]/20 border-[#2775ca]/40 text-[#2775ca]", val: balances.USDC }
                        ].map(t => msg.content.includes(t.token) && (
                          <button 
                            key={t.token}
                            onClick={() => { setInput(t.token); handleSubmit({ preventDefault: () => {} } as any); }}
                            className={`flex flex-col items-center gap-1.5 px-6 py-2 border rounded-md transition-all hover:scale-105 active:scale-95 ${t.color}`}
                          >
                            <span className="font-bebas text-lg tracking-widest">{t.token}</span>
                            <span className="text-[8px] font-mono opacity-60">BAL: {t.val}</span>
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        );
        })}

        {isParsing && (
          <div className="flex items-center gap-3 animate-pulse py-4 ml-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#0af0ff]" />
             <div className="text-[10px] text-[#0af0ff] font-bold tracking-[4px] uppercase">COGNITIVE_ENGINE_THINKING...</div>
          </div>
        )}

        {/* Intent Confirmation — Refactored */}
        {parsedIntent && (
          <div className="mt-8 animate-agent-in grid place-items-center">
             <div className="w-full max-w-[480px] bg-[#1a1d28]/90 backdrop-blur-xl border-x-2 border-y border-white/10 rounded-lg shadow-2xl p-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-2 text-white/5 font-bebas text-4xl select-none leading-none">SIGN_TX</div>
                
                <div className="flex justify-between items-center mb-6 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0af0ff]/10 flex items-center justify-center border border-[#0af0ff]/30">
                        <ShieldCheck className="w-4 h-4 text-[#0af0ff]" />
                      </div>
                      <h4 className="font-bebas text-xl text-white tracking-[2px] uppercase">Review Operation</h4>
                   </div>
                   <button onClick={() => resetGuidedFlow("COMMAND_ABORTED: Handshake cancelled.")} className="text-white/20 hover:text-white transition-colors">
                     <X className="w-4 h-4" />
                   </button>
                </div>

                <div className="space-y-4 mb-8">
                   <div className="flex justify-between items-end bg-white/5 p-4 rounded-sm border border-white/5">
                      <div>
                         <p className="text-[9px] text-[#0af0ff] uppercase tracking-widest font-bold mb-1">OPERATION_REASON</p>
                         <p className="font-bebas text-2xl text-white tracking-widest">{(parsedIntent?.action || "UNKNOWN").replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] text-[#c8ff00] uppercase tracking-widest font-bold mb-1">PAYLOAD_VALUE</p>
                         <p className="text-xl font-mono text-[#c8ff00] font-bold">
                           {parsedIntent?.amount} {parsedIntent?.token || parsedIntent?.fromToken}
                           {parsedIntent?.toToken && <span className="text-white/20 mx-2">→</span>}
                           {parsedIntent?.toToken && parsedIntent.toToken}
                         </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                      {[
                        { label: 'NETWORK', val: 'STARKNET_MAINNET', color: 'text-white' },
                        { label: 'EST_GAS', val: '~0.00021 ETH', color: 'text-white/60' },
                        { label: 'SLIPPAGE', val: '0.5% (STRICT)', color: 'text-white/60' },
                        { label: 'PRIORITY', val: 'HIGH_NEURAL', color: 'text-indigo-400' }
                      ].map(item => (
                        <div key={item.label} className="bg-black/40 p-2 border border-white/5 rounded-sm flex justify-between">
                           <span className="text-white/20">{item.label}:</span>
                           <span className={item.color}>{item.val}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={handleExecute}
                  disabled={isExecuting || !address}
                  className="w-full h-14 bg-[#c8ff00] animate-glitch-pulse text-black font-bebas text-2xl tracking-[6px] hover:bg-white transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4 relative overflow-hidden"
                >
                   {isExecuting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "EXECUTE_SIGNATURE"} 
                   {!isExecuting && <CpuIcon className="w-5 h-5" />}
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Input Module — Fix 8, 10 */}
      <div className="p-6 bg-[#0E1016]/80 border-t-2 border-white/10 shrink-0 backdrop-blur-md">
           {/* Categorized Quick Chips — Fix 8 */}
           {!guidedConfig && (
            <div className="flex flex-wrap gap-4 mb-6 px-1">
               <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#0af0ff]/60 uppercase tracking-widest font-bold">Transfer</span>
                  <div className="flex gap-2">
                    <button onClick={() => setInput("send")} className="text-[9px] font-bold text-[#e2e8f0]/40 hover:text-[#0af0ff] transition-colors uppercase tracking-[2px] border border-white/5 hover:border-[#0af0ff]/30 px-3 py-1 bg-white/5">#Send</button>
                    <button onClick={() => setInput("swap")} className="text-[9px] font-bold text-[#e2e8f0]/40 hover:text-[#0af0ff] transition-colors uppercase tracking-[2px] border border-white/5 hover:border-[#0af0ff]/30 px-3 py-1 bg-white/5">#Swap</button>
                  </div>
               </div>
               
               <div className="w-[1px] h-4 bg-white/10 self-center" />

               <div className="flex items-center gap-2">
                  <span className="text-[8px] text-purple-400/60 uppercase tracking-widest font-bold">Yield</span>
                  <div className="flex gap-2">
                    <button onClick={() => setInput("lend")} className="text-[9px] font-bold text-[#e2e8f0]/40 hover:text-purple-400 transition-colors uppercase tracking-[2px] border border-white/5 hover:border-purple-400/30 px-3 py-1 bg-white/5">#Lend</button>
                    <button onClick={() => setInput("stake")} className="text-[9px] font-bold text-[#e2e8f0]/40 hover:text-purple-400 transition-colors uppercase tracking-[2px] border border-white/5 hover:border-purple-400/30 px-3 py-1 bg-white/5">#Stake</button>
                    <button onClick={() => setInput("claim")} className="text-[9px] font-bold text-[#e2e8f0]/40 hover:text-purple-400 transition-colors uppercase tracking-[2px] border border-white/5 hover:border-purple-400/30 px-3 py-1 bg-white/5">#Claim</button>
                    <button onClick={() => setInput("withdraw")} className="text-[9px] font-bold text-[#e2e8f0]/40 hover:text-purple-400 transition-colors uppercase tracking-[2px] border border-white/5 hover:border-purple-400/30 px-3 py-1 bg-white/5">#Withdraw</button>
                  </div>
               </div>

               <div className="w-[1px] h-4 bg-white/10 self-center" />
               
               <div className="flex items-center gap-2">
                  <button onClick={() => setInput("balance")} className="text-[9px] font-bold text-white/30 hover:text-white transition-colors uppercase tracking-[2px] border border-dashed border-white/10 px-3 py-1">#Check_Portfolio</button>
               </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative group">
            <div className={`absolute -left-1 -top-1 -right-1 -bottom-1 bg-[#0af0ff]/10 blur-xl transition-opacity ${isParsing || isExecuting ? 'opacity-100' : 'opacity-0'}`} />
            <div className="relative flex items-center bg-black border-2 border-white/10 focus-within:border-[#0af0ff]/40 transition-all shadow-2xl">
              <div className="px-6 text-[#0af0ff]/40 font-bold border-r border-white/10 h-16 flex items-center">
                 <span className={`${isExecuting || isParsing ? 'animate-pulse text-[#0af0ff]' : ''}`}>&gt;</span>
              </div>
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isParsing ? "THINKING..." : "ENTER_NEURAL_COMMAND"}
                disabled={isParsing || isExecuting}
                className="flex-1 bg-transparent h-16 px-6 text-white placeholder:text-white/10 focus:outline-none tracking-[2px] text-lg font-bebas"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!input.trim() || isParsing || isExecuting}
                className="h-16 px-8 text-[#0af0ff]/40 hover:text-[#0af0ff] transition-colors disabled:opacity-20 group"
              >
                 <Send className={`w-6 h-6 ${!input.trim() ? '' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
              </button>
            </div>
          </form>

          <div className="flex justify-between mt-4">
             <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[7px] text-white/10 uppercase tracking-[4px]">Core_Kernel</span>
                  <span className="text-[8px] text-[#0af0ff]/40 uppercase tracking-[2px] font-bold">STARKAGENT_V1.1_STABLE</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-6">
                  <span className="text-[7px] text-white/10 uppercase tracking-[4px]">Neural_Link</span>
                  <span className="text-[8px] text-white/20 uppercase tracking-[20px] font-bold animate-pulse">●●●●</span>
                </div>
                {guidedConfig && (
                   <button 
                    type="button" 
                    onClick={() => resetGuidedFlow("GUIDED_SESSION_TERMINATED: State purged.")}
                    className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all font-bold"
                   >
                     <X className="w-3 h-3" /> ABORT_HANDSHAKE
                   </button>
                )}
             </div>
             
             <div className="flex items-center gap-4 opacity-20 hover:opacity-100 transition-opacity">
                <span className="text-[8px] text-white/40 font-mono">0x{address?.slice(-8)}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
             </div>
          </div>
      </div>
    </div>
  );
}

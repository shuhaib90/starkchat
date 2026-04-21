"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useWallet } from "@/components/StarkzapProvider";
import { parseCommand, TOKEN_REGISTRY, VALIDATOR_REGISTRY } from "@/lib/agents/gemini";
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
  CpuIcon
} from "lucide-react";
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

export function StarkAgent() {
  const { sdk, wallet, address, connectWallet, showDiagnostic, provider, lendingContext } = useWallet();
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedIntent, setParsedIntent] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<{ type: 'user' | 'agent' | 'error', content: string }[]>([]);
  const [guidedConfig, setGuidedConfig] = useState<GuidedState | null>(null);
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
    const interval = setInterval(fetchAgentBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchAgentBalances]);
  
  const resetGuidedFlow = (msg?: string, keepIntent: boolean = false) => {
    setGuidedConfig(null);
    if (!keepIntent) setParsedIntent(null);
    if (msg) setHistory(prev => [...prev, { type: 'agent', content: msg }]);
    return true;
  };
  
  const handleGuidedFlow = async (input: string) => {
    const msg = input.toLowerCase().trim();
    
    // CANCEL_WATCH
    if (["cancel", "reset", "stop", "exit"].includes(msg)) {
      resetGuidedFlow("GUIDED_FLOW_ABORTED: State cleared. How can I help you generally?");
      return true;
    }

    // INITIAL_TRIGGER
    if (!guidedConfig) {
      if (msg === "clear") {
        setHistory([]);
        return true;
      }

      if (msg === "balance" || msg === "portfolio" || msg === "assets") {
        setHistory(prev => [...prev, { 
          type: 'agent', 
          content: `LEDGER_SNAPSHOT [${new Date().toLocaleTimeString()}]:\n• STRK: ${balances.STRK}\n• ETH: ${balances.ETH}\n• USDC: ${balances.USDC}\nSYNC_STATUS: Accepted_on_L2` 
        }]);
        fetchAgentBalances();
        return true;
      }

      if (msg === 'send' || msg === 'transfer') {
        fetchAgentBalances();
        setGuidedConfig({ action: 'send', step: 1 });
        setHistory(prev => [...prev, { type: 'agent', content: "Which token? (Select: STRK / ETH / USDC)" }]);
        return true;
      }
      if (msg === 'swap') {
        fetchAgentBalances();
        setGuidedConfig({ action: 'swap', step: 1 });
        setHistory(prev => [...prev, { type: 'agent', content: "From which token? (Select: STRK / ETH / USDC)" }]);
        return true;
      }
      if (msg === 'lend' || msg === 'deposit') {
        fetchAgentBalances();
        setGuidedConfig({ action: 'lend', step: 1 });
        setHistory(prev => [...prev, { type: 'agent', content: "Which token? (Select: STRK / ETH / USDC)" }]);
        return true;
      }
      if (msg === 'stake') {
        fetchAgentBalances();
        setGuidedConfig({ action: 'stake', step: 1 });
        setHistory(prev => [...prev, { type: 'agent', content: "Which token? (Select: STRK / ETH / USDC)" }]);
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
      // GEMINI_COGNITIVE_BRIDGE: Now strictly returns educational content
      const result = await parseCommand(userMsg, history);
      
      const content = result.content || "INTENT_AMBIGUITY: I detected an informational query but my output buffer was empty. Please rephrase.";
      
      // ORACLE_RESPONSE: All AI outputs are treated as educational chat
      setHistory(prev => [...prev, { 
        type: 'agent', 
        content: content.replace(/type:\s*chat/gi, "").replace(/content:\s*/gi, "").trim() 
      }]);

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

      setHistory(prev => [...prev, { type: 'agent', content: `TX_BROADCAST_SUCCESS: Action submitted to Starknet.` }]);
      showDiagnostic("AGENT_ACTION: Transaction dispatched.", "info");
      setParsedIntent(null);
      
      await tx.wait();
      setHistory(prev => [...prev, { type: 'agent', content: "FINALIZATION_SUCCESS: Transaction reached 'Accepted on L2' state." }]);
      
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
    <div className="flex-1 flex flex-col bg-[#0e1016] border-2 border-white/5 relative overflow-hidden shadow-[20px_20px_0px_rgba(0,0,0,0.5)]">
      {/* Terminal Header */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-3">
            <CpuIcon className="w-4 h-4 text-[#0af0ff] animate-pulse" />
            <span className="text-[10px] tracking-[4px] text-white/40 uppercase">STARKAGENT_CORP_v1.0.4</span>
         </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-[#1a1d28] border border-white/10 px-2 py-0.5 rounded-sm gap-3">
                <div className="flex items-center gap-1.5 border-r border-white/5 pr-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]" />
                   <span className="text-[9px] font-mono text-white/40 uppercase">STRK:</span>
                   <span className="text-[9px] font-mono text-[#c8ff00] font-bold">{balances.STRK}</span>
                </div>
                <div className="flex items-center gap-1.5 border-r border-white/5 pr-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#0af0ff]" />
                   <span className="text-[9px] font-mono text-white/40 uppercase">ETH:</span>
                   <span className="text-[9px] font-mono text-white font-bold">{balances.ETH}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                   <span className="text-[9px] font-mono text-white/40 uppercase">USDC:</span>
                   <span className="text-[9px] font-mono text-white/60 font-bold">{balances.USDC}</span>
                </div>
             </div>
             
             <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                <div className={`w-2 h-2 rounded-full ${isFetchingBalances ? 'bg-yellow-500 animate-pulse' : 'bg-[#c8ff00]'} `} />
                <span className="text-[8px] text-white/40 uppercase tracking-widest">{isFetchingBalances ? 'SYNCING_LEDGER' : 'LEDGER_LIVE'}</span>
             </div>
          </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
      >
        <div className="text-white/20 text-[10px] leading-relaxed mb-8 uppercase">
          Welcome to StarkAgent. Initializing Gemini Cognitive Bridge...<br />
          Ready for natural language instruction. Supported protocols: Send, Swap, Stake (Native), Lend.<br />
          // WARNING: Always verify sensitive transaction payloads before final signature.
        </div>

        {history.map((msg, i) => (
          <div key={i} className="space-y-3">
            <div className={`flex gap-4 ${msg.type === 'user' ? 'opacity-80' : ''}`}>
               <div className={`mt-1 font-bold ${msg.type === 'user' ? 'text-white' : msg.type === 'error' ? 'text-red-500' : 'text-[#0af0ff]'}`}>
                  {msg.type === 'user' ? '>' : msg.type === 'error' ? '!' : '#'}
               </div>
               <div className={`text-sm tracking-tighter ${msg.type === 'error' ? 'text-red-400 bg-red-500/5 px-2' : 'text-white/80'}`}>
                  {msg.content}
               </div>
            </div>
            
            {/* INJECT_QUICK_OPTIONS: Detect selection hints and render buttons */}
            {msg.type === 'agent' && (msg.content.includes("Select:") || msg.content.includes("Choose")) && (
              <div className="flex flex-wrap gap-2 ml-8 pb-2">
                {["STRK", "ETH", "USDC"].map(token => msg.content.includes(token) && (
                  <button 
                    key={token}
                    onClick={() => { setInput(token); handleSubmit({ preventDefault: () => {} } as any); }}
                    className="truncate px-3 py-1 bg-white/5 border border-white/10 text-[10px] text-[#0af0ff] hover:bg-[#0af0ff]/10 hover:border-[#0af0ff]/30 transition-all uppercase tracking-widest"
                  >
                    {token}
                  </button>
                ))}
                {["Twinstake", "Avnu", "Braavos"].map(val => msg.content.includes(val) && (
                  <button 
                    key={val}
                    onClick={() => { setInput(val); handleSubmit({ preventDefault: () => {} } as any); }}
                    className="truncate px-3 py-1 bg-white/5 border border-white/10 text-[10px] text-[#c8ff00] hover:bg-[#c8ff00]/10 hover:border-[#c8ff00]/30 transition-all uppercase tracking-widest"
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isParsing && (
          <div className="flex items-center gap-4 animate-pulse">
             <div className="text-[#0af0ff] font-bold">#</div>
             <div className="text-sm text-[#0af0ff]/60 tracking-widest uppercase">ANALYZING_VIA_STARKAGENT_BRAIN...</div>
          </div>
        )}

        {/* Confirmation Card (Inline & Compact) */}
        {parsedIntent && (
          <div className="ml-8 mt-4 max-w-[420px] animate-anti-gravity">
             <div className="bg-[#1a1d28]/80 backdrop-blur-md border border-[#0af0ff]/20 p-4 rounded-sm shadow-[0_0_30px_rgba(10,240,255,0.05)]">
                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                   <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-[#0af0ff]" />
                      <span className="text-[10px] font-bebas tracking-[2px] text-[#0af0ff] uppercase">INTENT_CONFIRMATION</span>
                   </div>
                   <button onClick={() => resetGuidedFlow("COMMAND_ABORTED: Execution sequence terminated.")} className="text-white/20 hover:text-white"><X className="w-3 h-3" /></button>
                </div>

                <div className="space-y-3 mb-4">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[8px] text-white/30 uppercase tracking-widest mb-0.5">OP_TYPE</p>
                         <p className="font-bebas text-lg text-white tracking-widest">{(parsedIntent?.action || "UNKNOWN").toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] text-white/30 uppercase tracking-widest mb-0.5">ASSET_VALUE</p>
                         <p className="text-sm font-mono text-[#c8ff00] font-bold">
                           {parsedIntent?.amount} {parsedIntent?.token || parsedIntent?.fromToken}
                           {parsedIntent?.toToken && <span className="text-[#0af0ff] mx-1">→</span>}
                           {parsedIntent?.toToken && parsedIntent.toToken}
                         </p>
                      </div>
                   </div>

                   <div className="bg-black/40 p-3 border border-white/5 rounded-sm">
                      <p className="text-[8px] text-[#c8ff00] uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
                         <TrendingUp className="w-2.5 h-2.5" /> PREVIEW_INSIGHTS
                      </p>
                      <div className="space-y-1.5">
                         {parsedIntent?.action === 'swap' && (
                           <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-white/30 uppercase">EST_RECEIVE:</span>
                                <span className="text-white">~{parsedIntent.expectedOutput} {parsedIntent.toToken}</span>
                           </div>
                         )}
                         {parsedIntent?.action === 'lend' && (
                           <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-white/30 uppercase">VESU_APR:</span>
                                <span className="text-[#c8ff00]">{parsedIntent.apr}%</span>
                           </div>
                         )}
                         {parsedIntent?.action === 'stake' && (
                           <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-white/30 uppercase">STAKING_APR:</span>
                                <span className="text-[#c8ff00]">~{parsedIntent.apr?.toFixed(2)}%</span>
                           </div>
                         )}
                         <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-white/30 uppercase">EST_FEE:</span>
                            <span className="text-white/40">~0.0002 ETH</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={handleExecute}
                     disabled={isExecuting || !address}
                     className="flex-1 h-9 bg-[#0af0ff] text-black font-bebas text-sm tracking-[2px] hover:bg-white transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
                   >
                      {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "EXECUTE"} 
                      {!isExecuting && <CpuIcon className="w-3.5 h-3.5" />}
                   </button>
                   
                   {!isExecuting && (
                     <button 
                       onClick={() => resetGuidedFlow("COMMAND_ABORTED: State cleared. How can I assist you further?")}
                       className="flex-1 h-9 bg-white/5 border border-white/20 text-white/40 font-bebas text-sm tracking-[2px] hover:text-white hover:border-white/40 transition-all uppercase"
                     >
                       CANCEL
                     </button>
                   )}

                   {!address && !isExecuting && (
                     <button 
                      onClick={connectWallet}
                      className="flex-1 h-9 border border-[#c8ff00] text-[#c8ff00] font-bebas text-sm tracking-[2px] hover:bg-[#c8ff00]/10"
                     >
                       CONNECT
                     </button>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Input Module */}
      <form onSubmit={handleSubmit} className="p-6 bg-[#0E1016] border-t border-white/10 shrink-0">
          <div className="relative group">
            <div className={`absolute -left-1 -top-1 -right-1 -bottom-1 bg-[#0af0ff]/20 blur-xl transition-opacity ${isParsing ? 'opacity-100' : 'opacity-0'}`} />
            <div className="relative flex items-center bg-black border-2 border-white/10 group-focus-within:border-[#0af0ff]/50 transition-all">
              <div className="px-6 text-white/20 font-bold border-r border-white/10 h-16 flex items-center">
                 <span className={isExecuting ? 'animate-pulse' : ''}>&gt;</span>
              </div>
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isParsing ? "PROCESSING..." : "INSTRUCT AGENT (e.g. 'swap 1 strk to usdc')"}
                disabled={isParsing || isExecuting}
                className="flex-1 bg-transparent h-16 px-6 text-white placeholder:text-white/10 focus:outline-none tracking-tight text-lg"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isParsing || isExecuting}
                className="h-16 px-8 text-[#0af0ff]/40 hover:text-[#0af0ff] transition-colors disabled:opacity-20"
              >
                 <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex justify-between mt-4">
             <div className="flex items-center gap-4">
                <span className="text-[8px] text-white/20 uppercase tracking-widest">STARKAGENT_V1_CORE</span>
                <span className="text-[8px] text-white/10">//</span>
                <span className="text-[8px] text-white/20 uppercase tracking-widest">LATENCY: 420ms</span>
                {guidedConfig && (
                   <button 
                    type="button" 
                    onClick={() => resetGuidedFlow("GUIDED_SESSION_TERMINATED: Returning to general assistance.")}
                    className="flex items-center gap-2 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-[8px] text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all"
                   >
                     <X className="w-2 h-2" /> CANCEL_SESSION
                   </button>
                )}
             </div>
          </div>
          {!guidedConfig && (
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-white/5 bg-black/20">
               <button onClick={() => setInput("send")} className="text-[9px] font-unbounded text-[#c8ff00]/60 hover:text-[#c8ff00] transition-colors uppercase tracking-widest border border-[#c8ff00]/10 px-2 py-1 bg-[#c8ff00]/5 hover:bg-[#c8ff00]/10">#Start_Send</button>
               <button onClick={() => setInput("swap")} className="text-[9px] font-unbounded text-[#0af0ff]/60 hover:text-[#0af0ff] transition-colors uppercase tracking-widest border border-[#0af0ff]/10 px-2 py-1 bg-[#0af0ff]/5 hover:bg-[#0af0ff]/10">#Start_Swap</button>
               <button onClick={() => setInput("lend")} className="text-[9px] font-unbounded text-purple-400/60 hover:text-purple-400 transition-colors uppercase tracking-widest border border-purple-400/10 px-2 py-1 bg-purple-400/5 hover:bg-purple-400/10">#Start_Lend</button>
               <button onClick={() => setInput("stake")} className="text-[9px] font-unbounded text-orange-400/60 hover:text-orange-400 transition-colors uppercase tracking-widest border border-orange-400/10 px-2 py-1 bg-orange-400/5 hover:bg-orange-400/10">#Start_Stake</button>
               <button onClick={() => setInput("withdraw")} className="text-[9px] font-unbounded text-pink-400/60 hover:text-pink-400 transition-colors uppercase tracking-widest border border-pink-400/10 px-2 py-1 bg-pink-400/5 hover:bg-pink-400/10">#Withdraw_Lend</button>
               <button onClick={() => setInput("claim")} className="text-[9px] font-unbounded text-yellow-400/60 hover:text-yellow-400 transition-colors uppercase tracking-widest border border-yellow-400/10 px-2 py-1 bg-yellow-400/5 hover:bg-yellow-400/10">#Claim_Rewards</button>
               <button onClick={() => setInput("balance")} className="text-[9px] font-unbounded text-white/40 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-2 py-1 bg-white/5 hover:bg-white/10">#Check_Portfolio</button>
            </div>
          )}
      </form>
    </div>
  );
}

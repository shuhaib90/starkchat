"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { RpcProvider, num, uint256 } from "starknet";
import { 
  StarkZap, 
  ChainId, 
  Staking, 
  AvnuSwapProvider, 
  EkuboSwapProvider, 
  Amount,
  VesuLendingProvider,
  LendingClient,
  mainnetTokens,
  fromAddress
} from "starkzap";
import { connect, disconnect } from "starknetkit";
import { normalizeAddress } from "@/lib/address";
import { NetworkDiagnostic } from "./NetworkDiagnostic";

// The STRK token address on starknet mainnet
export const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const ETH_TOKEN_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const STAKING_MASTER = "0x05f42602685741697200445d4c88f117f3000570b57e7939130701083de083";

// Aliases for the execution bridge
export const STRK_TOKEN = STRK_TOKEN_ADDRESS;
export const ETH_TOKEN = ETH_TOKEN_ADDRESS;

// FAILSAFE_METADATA: Guaranteed fallbacks to prevent "decimals" resolution errors
const FAILSAFE_STRK = { address: STRK_TOKEN_ADDRESS, decimals: 18, symbol: "STRK" };
const FAILSAFE_ETH = { address: ETH_TOKEN_ADDRESS, decimals: 18, symbol: "ETH" };
const FAILSAFE_USDC = { address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8", decimals: 6, symbol: "USDC.e" };

const PRIVATE_RPC = process.env.NEXT_PUBLIC_STARKNET_RPC_URL;
const FALLBACK_RPCS = [PRIVATE_RPC].filter(Boolean) as string[];

interface WalletContextType {
  sdk: any;
  wallet: any | null;
  address: string | null;
  provider: RpcProvider;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void> | void;
  isConnecting: boolean;
  connectorId: string | null;
  rotateRpc: () => void;
  showDiagnostic: (msg: string, type: 'warning' | 'error' | 'info') => void;
  lendingContext: any | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function StarkzapProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [rpcIndex, setRpcIndex] = useState(0);
  const [activeRpc, setActiveRpc] = useState(FALLBACK_RPCS[0]);
  
  // Diagnostic State
  const [diagnostic, setDiagnostic] = useState<{ isOpen: boolean; message: string; type: string }>({
    isOpen: false,
    message: "",
    type: "info"
  });

  // GRACEFUL_FAILOVER: If private RPC is dead, we allow rotation to fallbacks
  useEffect(() => {
    if (PRIVATE_RPC) {
      console.log("[Starknet_Uplink] PRIVATE_LANE_RECOGNIZED:", PRIVATE_RPC.split('/').slice(0, 3).join('/'));
    }
  }, []);
  
  // Use a stable provider for non-wallet calls
  const provider = useMemo(() => {
    const url = activeRpc;
    const isPrivate = url === PRIVATE_RPC;
    console.log(`[Starknet_Uplink] ${isPrivate ? 'PRIVATE_LANE_ACTIVE' : 'FALLBACK_NODE_ACTIVE'}: ${url?.split('/')[2]}`);
    // Explicitly target RPC version 0.10 for stable DeFi performance
    return new RpcProvider({ nodeUrl: url });
  }, [activeRpc]);

  const showDiagnostic = useCallback((message: string, type: 'warning' | 'error' | 'info' = 'info') => {
    setDiagnostic({ isOpen: true, message, type });
    // Auto-close after 8 seconds
    setTimeout(() => setDiagnostic(prev => ({ ...prev, isOpen: false })), 8000);
  }, []);

  const rotateRpc = useCallback(() => {
    if (FALLBACK_RPCS.length <= 1) return; // Dedicated private lane active
    
    setRpcIndex((prev) => {
      const next = (prev + 1) % FALLBACK_RPCS.length;
      setActiveRpc(FALLBACK_RPCS[next]);
      showDiagnostic(`Switching to backup lane: ${FALLBACK_RPCS[next].split('/')[2]}`, "warning");
      return next;
    });
  }, [showDiagnostic]);

  useEffect(() => {
    // Initialize on mount with our robust provider
    const instance = new StarkZap({ 
      network: "mainnet",
      rpcUrl: activeRpc
    });
    
    setSdk(instance);
  }, [provider]);

  useEffect(() => {
    // [DIAGNOSTIC] Check for critical Supabase environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[StarkChat] CRITICAL: Supabase environment variables are missing!");
      // Delay slightly to ensure UI is ready
      setTimeout(() => {
        showDiagnostic(
          "ENVIRONMENT_ERROR: NEXT_PUBLIC_SUPABASE_URL or ANON_KEY is missing. Core messaging features will fail. Check Vercel dashboard settings.", 
          "error"
        );
      }, 1500);
    }
  }, []);

  /**
   * [EXECUTION_BRIDGE]
   * Wraps a raw browser account (Argent/Braavos) in a bridge that implements 
   * the SDK's high-level staking methods without needing a private key.
   */
  const createBrowserWallet = useMemo(() => (account: any, sdkInstance: any) => {
    if (!account || !sdkInstance) return null;
    
    // Create a normalized account using a Proxy to preserve the prototype chain (methods like .execute)
    // while ensuring the .address property is always returned as a 64-char padded Starknet address.
    const normalizedAccount = new Proxy(account, {
      get(target, prop, receiver) {
        if (prop === 'address') return normalizeAddress(target.address);
        return Reflect.get(target, prop, receiver);
      }
    });

    // Create the bridge using Prototype Inheritance so it inherits ALL methods from the account instance
    // but overrides/adds the SDK-specific staking methods.
    const bridge = Object.assign(Object.create(normalizedAccount), {
      stake: async (pool: string, amount: any, token?: any) => {
        const s = await Staking.fromPool(fromAddress(pool), sdkInstance.getProvider(), sdkInstance.getResolvedConfig().staking);
        
        // UNIFIED_AMOUNT_PROTOCOL: Handle both raw numbers (Agent) and Amount objects (Dashboard)
        const tokenMeta = token || mainnetTokens?.STRK || FAILSAFE_STRK;
        const parsedAmount = (amount instanceof Amount)
          ? amount 
          : Amount.parse(amount.toString(), tokenMeta);
          
        const tx = await s.stake(normalizedAccount, parsedAmount);
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      nativeStake: async (pool: string, amount: any, token?: any) => {
        // Alias for the unified stake method to maintain agent compatibility
        return bridge.stake(pool, amount, token);
      },
      claimPoolRewards: async (pool: string) => {
        const s = await Staking.fromPool(fromAddress(pool), sdkInstance.getProvider(), sdkInstance.getResolvedConfig().staking);
        const tx = await s.claimRewards(normalizedAccount);
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      exitPoolIntent: async (pool: string, amount: any) => {
        const s = await Staking.fromPool(fromAddress(pool), sdkInstance.getProvider(), sdkInstance.getResolvedConfig().staking);
        const tx = await s.exitIntent(normalizedAccount, amount);
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      exitPool: async (pool: string) => {
        const s = await Staking.fromPool(fromAddress(pool), sdkInstance.getProvider(), sdkInstance.getResolvedConfig().staking);
        const tx = await s.exit(normalizedAccount);
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      getPoolPosition: async (pool: string) => {
        try {
          const s = await Staking.fromPool(fromAddress(pool), sdkInstance.getProvider(), sdkInstance.getResolvedConfig().staking);
          const pos = await s.getPosition(normalizedAccount);
          
          // PRECISION SYNC: Fetch real-time accrued rewards directly from Staking Master and Pool
          try {
            const [poolMemberInfo, stakerInfo] = await Promise.all([
              sdkInstance.getProvider().callContract({
                contractAddress: pool,
                entrypoint: "get_pool_member_info_v1",
                calldata: [normalizedAccount.address]
              }),
              sdkInstance.getProvider().callContract({
                contractAddress: STAKING_MASTER,
                entrypoint: "get_staker_info_v1",
                calldata: [pool] // Pool address is the validator identity in Master
              })
            ]);

            if (poolMemberInfo && stakerInfo) {
              const unclaimed = uint256.uint256ToBN({ low: poolMemberInfo[1], high: poolMemberInfo[2] });
              const amount = uint256.uint256ToBN({ low: poolMemberInfo[3], high: poolMemberInfo[4] });
              const lastIndex = uint256.uint256ToBN({ low: poolMemberInfo[5], high: poolMemberInfo[6] });
              const globalIndex = uint256.uint256ToBN({ low: stakerInfo[4], high: stakerInfo[5] });

              if (globalIndex > lastIndex && amount > 0n) {
                const INDEX_SCALE = 10n ** 12n; // Starknet Index Scale
                const delta = globalIndex - lastIndex;
                const accrued = (delta * amount) / INDEX_SCALE;
                const totalReal = unclaimed + accrued;
                
                if (pos && pos.rewards) {
                   pos.rewards = Amount.fromRaw(totalReal.toString(), pos.rewards.getDecimals());
                }
              } else if (pos && pos.rewards) {
                 pos.rewards = Amount.fromRaw(unclaimed.toString(), pos.rewards.getDecimals());
              }
            }
          } catch (err) {
             console.log("[Starkzap] Accrued calculation failed, falling back to settled rewards.");
          }
          
          return pos;
        } catch (e) { return null; }
      },
      restakePoolRewards: async (pool: string, amountRaw: string) => {
         // ATOMIC MULTICALL: Claim -> Approve -> Restake
         const calls = [
           {
             contractAddress: pool,
             entrypoint: "claim_rewards",
             calldata: [normalizedAccount.address]
           },
           {
             contractAddress: STRK_TOKEN,
             entrypoint: "approve",
             calldata: [pool, amountRaw, "0"]
           },
           {
             contractAddress: pool,
             entrypoint: "add_to_delegation_pool",
             calldata: [normalizedAccount.address, amountRaw, "0"]
           }
         ];
         const tx = await normalizedAccount.execute(calls);
         return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      getQuote: async (params: any) => {
        const avnu = new AvnuSwapProvider();
        const ekubo = new EkuboSwapProvider();
        const provider = params.provider === 'ekubo' ? ekubo : avnu;
        const chainId = sdkInstance.getResolvedConfig().chainId;
        return provider.getQuote({ ...params, chainId });
      },
      swap: async (params: any) => {
        const avnu = new AvnuSwapProvider();
        const ekubo = new EkuboSwapProvider();
        const provider = params.provider === 'ekubo' ? ekubo : avnu;
        const chainId = sdkInstance.getResolvedConfig().chainId;
        const { calls } = await provider.prepareSwap({ ...params, chainId, takerAddress: normalizedAccount.address });
        const tx = await normalizedAccount.execute(calls);
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      balanceOf: async (token: any) => {
        try {
          return await sdkInstance.balanceOf(token, normalizedAccount.address);
        } catch (e) {
          return Amount.fromRaw(0n, token.decimals, token.symbol);
        }
      },
      transfer: async (tokenAddress: string, recipient: string, amountRaw: string) => {
        const calls = [
          {
            contractAddress: tokenAddress,
            entrypoint: "transfer",
            calldata: [recipient, amountRaw, "0"]
          }
        ];
        const tx = await normalizedAccount.execute(calls);
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      // nativeStake is now unified with stake at the top of the bridge
      lend: async (token: any, amount: any) => {
        const dynamicContext = {
          address: normalizedAccount.address,
          getChainId: () => ChainId.MAINNET,
          getProvider: () => sdkInstance.getProvider(),
          chainId: ChainId.MAINNET,
          execute: async (calls: any[], options?: any) => {
            const res = await normalizedAccount.execute(calls, options);
            return { transaction_hash: res.hash, wait: async () => sdkInstance.getProvider().waitForTransaction(res.hash) };
          }
        };
        const client = new LendingClient(dynamicContext as any, new VesuLendingProvider());
        
        // Defensive token resolution
        const tokenMeta = token || (typeof token === 'string' ? (mainnetTokens as any)[token] : null);
        if (!tokenMeta?.decimals) {
          throw new Error(`METADATA_MISSING: Cannot resolve decimals for lending.`);
        }

        const tx = await client.deposit({ 
          token: tokenMeta, 
          amount: Amount.parse(amount.toString(), tokenMeta) 
        });
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      withdraw: async (token: any, amount: any) => {
        const dynamicContext = {
          address: normalizedAccount.address,
          getChainId: () => ChainId.MAINNET,
          getProvider: () => sdkInstance.getProvider(),
          chainId: ChainId.MAINNET,
          execute: async (calls: any[], options?: any) => {
            const res = await normalizedAccount.execute(calls, options);
            return { transaction_hash: res.hash, wait: async () => sdkInstance.getProvider().waitForTransaction(res.hash) };
          }
        };
        const client = new LendingClient(dynamicContext as any, new VesuLendingProvider());
        
        // Defensive token resolution
        const tokenMeta = token || (typeof token === 'string' ? (mainnetTokens as any)[token] : null);
        if (!tokenMeta?.decimals) {
          throw new Error(`METADATA_MISSING: Cannot resolve decimals for withdrawal.`);
        }

        const tx = await client.withdraw({ 
          token: tokenMeta, 
          amount: Amount.parse(amount.toString(), tokenMeta) 
        });
        return { ...tx, wait: () => sdkInstance.getProvider().waitForTransaction(tx.hash) };
      },
      _sdkProvider: sdkInstance.getProvider().nodeUrl
    });
    return bridge;
  }, [rotateRpc, showDiagnostic]);

  // [AUTO_WRAP] Detect raw accounts and upgrade to the Execution Bridge automatically
  useEffect(() => {
    if (wallet && sdk) {
      const currentProviderUrl = sdk.getProvider().nodeUrl;
      const isStale = wallet._sdkProvider && wallet._sdkProvider !== currentProviderUrl;
      const notBridged = typeof wallet.stake !== 'function';

      if (notBridged || isStale) {
        console.log(`[Starkzap] ${isStale ? 'Refreshing' : 'Upgrading'} connection to Execution Bridge...`);
        const bridgedWallet = createBrowserWallet(wallet, sdk);
        if (bridgedWallet) {
          setWallet(bridgedWallet);
          showDiagnostic(isStale ? "RPC_ROTATED: Bridge re-synchronized." : "BRIDGE_ACTIVE: Staking controls enabled.", "info");
        }
      }
    }
  }, [wallet, sdk, createBrowserWallet, showDiagnostic]);

  const disconnectWallet = useCallback(async () => {
    try {
      const { disconnect } = await import("starknetkit");
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
    setWallet(null);
    setAddress(null);
    setConnectorId(null);
  }, []);

  const connectWallet = useCallback(async () => {
    if (!sdk) return;
    try {
      setIsConnecting(true);
      const { connect } = await import("starknetkit");
      const { InjectedConnector } = await import("starknetkit/injected");

      const connectors = [
        new InjectedConnector({ options: { id: "argentX", name: "Argent X" } }),
        new InjectedConnector({ options: { id: "braavos", name: "Braavos" } }),
        new InjectedConnector({ options: { id: "okxwallet", name: "OKX Wallet" } })
      ];

      const result = await connect({
        modalMode: "alwaysAsk",
        modalTheme: "dark",
        connectors
      }) as any;
      
      const rawWallet = result.wallet as any;
      if (rawWallet && result.connector) {
        const chainId = await rawWallet.provider?.getChainId?.();
        const chainIdStr = chainId?.toString().toLowerCase();
        
        const isMainnet = !chainId || 
          chainIdStr === "sn_main" || 
          chainIdStr === "0x534e5f4d41494e" || 
          chainIdStr === "23448594291968334" ||
          chainIdStr.includes("main");

        if (!isMainnet) {
          showDiagnostic("WRONG_NETWORK: Please switch your wallet to Starknet Mainnet.", "warning");
          await disconnectWallet();
          return;
        }

        let account = result.account || rawWallet.account;
        
        if (!account && typeof result.connector.account === 'function') {
           account = await result.connector.account(provider);
        }

        if (account) {
          try {
            const bridgedWallet = createBrowserWallet(account, sdk);
            setWallet(bridgedWallet);
            setAddress(normalizeAddress(account.address));
          } catch (wrapErr) {
            setWallet(account); 
            setAddress(normalizeAddress(account.address));
          }
        }
        
        setConnectorId(result.connector.id);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [sdk, provider, createBrowserWallet, disconnectWallet, showDiagnostic]);

  const lendingContext = useMemo(() => {
    if (!wallet || !address) return null;
    return {
      address: fromAddress(address),
      getChainId: () => ChainId.MAINNET,
      getProvider: () => provider,
      chainId: ChainId.MAINNET,
      execute: async (calls: any[], options?: any) => {
        const res = await wallet.execute(calls, options);
        return { transaction_hash: res.hash, wait: async () => provider.waitForTransaction(res.hash) };
      },
      preflight: async (options: any) => {
        return { fee_estimate: [], total_fee: 0n };
      }
    };
  }, [wallet, address, provider]);


  const value = useMemo(() => ({ 
    sdk, wallet, address, provider, 
    connectWallet, disconnectWallet, isConnecting,
    connectorId,
    rotateRpc, showDiagnostic,
    lendingContext
  }), [
    sdk, wallet, address, provider, 
    connectWallet, disconnectWallet, isConnecting,
    connectorId,
    rotateRpc, showDiagnostic,
    lendingContext
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
      {/* Visual Diagnostic Overlay */}
      {diagnostic.isOpen && (
        <NetworkDiagnostic 
          message={diagnostic.message} 
          type={diagnostic.type as any} 
          onRotate={rotateRpc}
          onClose={() => setDiagnostic(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a StarkzapProvider");
  }
  return context;
}

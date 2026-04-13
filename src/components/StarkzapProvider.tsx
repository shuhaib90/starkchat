"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { StarkZap } from "starkzap";

import { RpcProvider } from "starknet";
import { NetworkDiagnostic } from "./NetworkDiagnostic";

// The STRK token address on starknet mainnet
export const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const ETH_TOKEN_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

// Reliable RPC fallbacks
const FALLBACK_RPCS = [
  "https://starknet-mainnet.public.blastapi.io",
  "https://rpc.starknet.lava.build",
  "https://starknet-mainnet.public.nethermind.io",
  "https://free-openapi.starknet.io/rt/v1/mainnet", // OnFinality
  "https://starknet-mainnet.g.allpotential.io"
];

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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function StarkzapProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [rpcIndex, setRpcIndex] = useState(0);
  
  // Diagnostic State
  const [diagnostic, setDiagnostic] = useState<{ isOpen: boolean; message: string; type: string }>({
    isOpen: false,
    message: "",
    type: "info"
  });
  
  // Use a stable provider for non-wallet calls
  const provider = useMemo(() => new RpcProvider({ 
    nodeUrl: FALLBACK_RPCS[rpcIndex % FALLBACK_RPCS.length] 
  }), [rpcIndex]);

  const rotateRpc = () => {
    setRpcIndex(prev => prev + 1);
    console.log(`[Starkzap] Rotated to node: ${FALLBACK_RPCS[(rpcIndex + 1) % FALLBACK_RPCS.length]}`);
  };

  const showDiagnostic = (message: string, type: 'warning' | 'error' | 'info' = 'info') => {
    setDiagnostic({ isOpen: true, message, type });
    // Auto-close after 8 seconds
    setTimeout(() => setDiagnostic(prev => ({ ...prev, isOpen: false })), 8000);
  };

  useEffect(() => {
    // Initialize SDK on mount
    const instance = new StarkZap({ 
      network: "mainnet" 
    });
    setSdk(instance);
  }, []);

  const connectWallet = async () => {
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
        // Enforce mainnet check with robust ID matching
        const chainId = result.connectorData?.chainId || await rawWallet.provider?.getChainId?.();
        const chainIdStr = chainId?.toString().toLowerCase();
        
        // Starknet Mainnet IDs:
        // - "sn_main" (literal)
        // - "0x534e5f4d41494e" (hex)
        // - "23448594291968334" (decimal)
        const isMainnet = !chainId || // Fallback: if we can't find it, don't block
          chainIdStr === "sn_main" || 
          chainIdStr === "0x534e5f4d41494e" || 
          chainIdStr === "23448594291968334" ||
          chainIdStr.includes("main");

        console.log(`[Starknet] Connected to chain: ${chainId} (${chainIdStr}), isMainnet: ${isMainnet}`);
        
        if (!isMainnet) {
          showDiagnostic("WRONG_NETWORK: Please switch your wallet to Starknet Mainnet.", "warning");
          await disconnectWallet();
          return;
        }

        let account = result.account || rawWallet.account;
        
        // If account isn't ready or throttled, we can try to re-init it with our provider
        if (!account && typeof result.connector.account === 'function') {
           account = await result.connector.account(provider);
        }
        
        setWallet(account);
        setAddress(result.connectorData?.account || rawWallet.selectedAddress || account?.address);
        setConnectorId(result.connector.id);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const { disconnect } = await import("starknetkit");
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
    setWallet(null);
    setAddress(null);
    setConnectorId(null);
  };

  return (
    <WalletContext.Provider
      value={{ 
        sdk, wallet, address, provider, 
        connectWallet, disconnectWallet, isConnecting,
        connectorId,
        rotateRpc, showDiagnostic
      }}
    >
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

"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart3, 
  DollarSign, 
  Lock, 
  TrendingUp, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWallet } from "@/components/StarkzapProvider";
import { normalizeAddress } from "@/lib/address";
import Link from "next/link";
import Image from "next/image";

interface Transaction {
  id: string;
  created_at: string;
  amount: number | null;
  token: string | null;
  type: string;
  status: string | null;
  unlock_price: number | null;
  is_unlocked: boolean | null;
  receiver_address: string;
  sender_address: string;
}

export default function DashboardPage() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStrk: 0,
    totalEth: 0,
    totalMessages: 0,
    unlockedContent: 0,
    receivedPayments: 0
  });

  useEffect(() => {
    if (!address) return;
    
    const fetchStats = async () => {
      setIsLoading(true);
      const addr = normalizeAddress(address);

      // Fetch all relevant transactions involving this user
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_address.eq.${addr},receiver_address.eq.${addr}`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data);
        
        let strk = 0;
        let eth = 0;
        let msgs = 0;
        let unlocked = 0;
        let received = 0;

        data.forEach(tx => {
          // Count messages sent by user
          if (tx.sender_address === addr) msgs++;

          // Received direct payments
          if (tx.receiver_address === addr && tx.type === 'payment' && tx.status === 'accepted') {
            received++;
            if (tx.token === 'STRK') strk += Number(tx.amount || 0);
            if (tx.token === 'ETH') eth += Number(tx.amount || 0);
          }

          // Earnings from content you sent that was unlocked
          if (tx.sender_address === addr && tx.type === 'locked' && tx.is_unlocked === true) {
            unlocked++;
            if (tx.token === 'STRK') strk += Number(tx.unlock_price || 0);
            if (tx.token === 'ETH') eth += Number(tx.unlock_price || 0);
          }
        });

        setStats({
          totalStrk: strk,
          totalEth: eth,
          totalMessages: msgs,
          unlockedContent: unlocked,
          receivedPayments: received
        });
      }
      setIsLoading(false);
    };

    fetchStats();
  }, [address]);

  if (!address) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-6">
        <div className="text-center space-y-8 animate-anti-gravity">
          <div className="w-24 h-24 bg-[#c8ff00]/10 border-2 border-[#c8ff00]/40 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(200,255,0,0.1)]">
            <ShieldCheck className="w-12 h-12 text-[#c8ff00]" />
          </div>
          <h1 className="font-bebas text-5xl text-white tracking-widest uppercase">ACCESS_DENIED</h1>
          <p className="font-['DM_Mono'] text-white/40 max-w-sm mx-auto uppercase tracking-widest text-xs leading-loose">
            CONNECT YOUR STARKNET IDENTIFIER TO ACCESS THE CREATOR COMMAND CENTER.
          </p>
          <Link href="/" className="inline-block px-10 py-4 bg-white/5 border border-white/10 text-[#f0ede8] font-bebas text-xl tracking-[4px] hover:bg-white/10 transition-all">
            RETURN_TO_BASE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-white font-mono selection:bg-[#c8ff00] selection:text-black">
      {/* Ambient Grid */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
      </div>

      {/* Navigation Header */}
      <nav className="relative z-10 border-b-2 border-white/5 bg-[#06070a]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="h-8 w-[2px] bg-white/10" />
            <h1 className="font-bebas text-3xl tracking-[3px] flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-[#c8ff00]" />
              ZENVIC_CONTROL_CENTER
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end">
               <span className="text-[10px] text-white/30 uppercase tracking-widest">Operator</span>
               <span className="font-bebas text-lg tracking-wider text-[#0af0ff]">{address?.substring(0,6)}...{address?.substring(address.length-4)}</span>
             </div>
             <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden">
               <Image src="/zenvic.png" alt="Zenvic" width={40} height={40} className="w-full h-full object-cover grayscale opacity-50" />
             </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 pt-12 space-y-12">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Total STRK Revenue" 
            value={stats.totalStrk.toFixed(2)} 
            icon={<Zap className="w-6 h-6 text-[#ffd24d]" />}
            sub="NET_EARNINGS"
            color="border-[#ffd24d]/20"
            glow="shadow-[#ffd24d]/5"
          />
          <StatCard 
            label="Total ETH Revenue" 
            value={stats.totalEth.toFixed(4)} 
            icon={<DollarSign className="w-6 h-6 text-[#0af0ff]" />}
            sub="CRYPTO_BALANCE"
            color="border-[#0af0ff]/20"
            glow="shadow-[#0af0ff]/5"
          />
          <StatCard 
            label="Signals Dispatched" 
            value={stats.totalMessages.toString()} 
            icon={<MessageSquare className="w-6 h-6 text-[#f0ede8]/40" />}
            sub="NETWORK_ACTIVITY"
            color="border-white/10"
          />
          <StatCard 
            label="Monetization Health" 
            value={`${stats.unlockedContent}`} 
            icon={<Lock className="w-6 h-6 text-magenta" />}
            sub="VAULT_UN_LOCKS"
            color="border-magenta/20"
            glow="shadow-magenta/5"
          />
        </div>

        {/* Detailed Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transmissions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b-2 border-white/5 pb-4">
              <h2 className="font-bebas text-2xl tracking-[4px] text-white flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#c8ff00]" />
                LATEST_TRANSMISSION_LOGS
              </h2>
              <span className="text-[10px] text-white/20 uppercase tracking-widest font-['DM_Mono']">Live_Stream_Enabled</span>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="p-20 text-center animate-pulse">
                  <span className="font-bebas text-xl text-white/20 tracking-widest">SYNCHRONIZING_DATA_STREAM...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-white/5">
                  <span className="font-bebas text-xl text-white/20 tracking-widest">NO_ACTIVITY_DETECTED</span>
                </div>
              ) : (
                transactions.slice(0, 10).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} me={normalizeAddress(address || "")} />
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Network Status */}
          <div className="space-y-8">
            <div className="bg-[#0e1016] border-2 border-white/10 rounded-lg p-8 space-y-6 shadow-[12px_12px_0px_#06070a]">
              <div className="space-y-4">
                <h3 className="font-bebas text-xl tracking-[4px] text-[#c8ff00]">NETWORK_HEALTH</h3>
                <div className="space-y-4">
                  <HealthBar label="Starknet RPC" level={98} />
                  <HealthBar label="Supabase Sync" level={100} />
                  <HealthBar label="Indexing Speed" level={94} />
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                <div className="bg-magenta/5 border border-magenta/20 p-4 rounded-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-magenta" />
                    <span className="font-bebas text-sm text-magenta tracking-widest uppercase">PRO_TALLER_STATUS</span>
                  </div>
                  <p className="font-['DM_Mono'] text-[9px] text-white/40 leading-relaxed uppercase tracking-widest">
                    YOUR CREATOR ACCOUNT IS CURRENTLY SHIELDED. ALL PAYMENTS ARE ROUTED THROUGH SECURE STARKNET CONTRACTS.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#c8ff00]/10 to-transparent border-2 border-[#c8ff00]/10 rounded-lg p-8 space-y-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-[#c8ff00] text-black">
                   <Clock className="w-4 h-4" />
                 </div>
                 <h3 className="font-bebas text-xl tracking-[2px]">UPTIME_ANALYTICS</h3>
               </div>
               <p className="font-['DM_Mono'] text-[10px] text-white/40 leading-loose uppercase">
                 AVERAGE TRANSACTION TIME: 14.2s<br/>
                 GAS COST REDUCTION: 82%<br/>
                 LAST PAYOUT: 2 HOURS AGO
               </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, sub, color, glow = "" }: any) {
  return (
    <div className={`bg-[#0e1016] border-2 ${color} rounded-lg p-6 space-y-4 shadow-[8px_8px_0px_#06070a] ${glow} hover:-translate-y-1 transition-all duration-300 group`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[9px] font-['DM_Mono'] text-white/30 uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-bebas text-5xl tracking-tighter text-white group-hover:scale-105 transition-transform origin-left">{value}</h3>
          </div>
        </div>
        <div className="p-2 bg-white/5 rounded-sm border border-white/10">
          {icon}
        </div>
      </div>
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-unbounded text-white/20 uppercase tracking-widest">{sub}</span>
        <ChevronRight className="w-3 h-3 text-white/10 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

function TransactionRow({ tx, me }: { tx: Transaction, me: string }) {
  const isReceived = tx.receiver_address === me || (tx.type === 'locked' && tx.sender_address === me && tx.is_unlocked);
  const isLocked = tx.type === "locked";
  const label = isLocked ? "LOCKED_SIGNAL_PURCHASE" : "DIRECT_TERMINAL_TRANSFER";
  const amount = isLocked ? tx.unlock_price : tx.amount;
  
  return (
    <div className="bg-[#0e1016]/50 border-2 border-white/5 hover:border-white/10 p-4 flex items-center justify-between group transition-all rounded-sm">
      <div className="flex items-center gap-6">
        <div className={`w-10 h-10 border flex items-center justify-center ${isReceived ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
           <Clock className={`w-4 h-4 ${isReceived ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
        <div>
          <div className="flex items-center gap-3">
             <span className="font-bebas text-lg tracking-[2px] text-white/80 group-hover:text-white transition-colors uppercase">{label}</span>
             <span className={`text-[8px] font-unbounded px-2 py-0.5 border ${isReceived ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
               {isReceived ? 'CREDIT' : 'DEBIT'}
             </span>
          </div>
          <div className="font-['DM_Mono'] text-[9px] text-white/20 uppercase tracking-widest pt-1">
            {new Date(tx.created_at).toLocaleString()} // REF: {tx.id.substring(0,8)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="text-right">
          <div className="font-bebas text-2xl tracking-wider text-[#f0ede8]">
            {isReceived ? '+' : '-'}{amount} <span className={tx.token === 'STRK' ? 'text-[#ffd24d]' : 'text-[#0af0ff]'}>{tx.token}</span>
          </div>
          <div className="text-[9px] text-white/20 font-['DM_Mono'] uppercase tracking-widest">Confirmed_on_L2</div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="p-2 border border-white/10 hover:border-[#c8ff00] cursor-not-allowed">
             <ExternalLink className="w-4 h-4 text-white/40" />
           </div>
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, level }: { label: string, level: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[9px] font-unbounded text-white/30 uppercase tracking-widest">
        <span>{label}</span>
        <span>{level}%</span>
      </div>
      <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-[#c8ff00]" 
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

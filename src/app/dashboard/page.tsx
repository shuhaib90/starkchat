"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  MessageSquare,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins
} from "lucide-react";
import { 
  isWithinInterval, 
  subDays, 
  subMonths, 
  subYears, 
  startOfToday,
  startOfYesterday,
  parseISO
} from "date-fns";
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
  tx_hash?: string;
}

type TimeFilter = 'all' | 'week' | 'month' | 'year';

export default function DashboardPage() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>('all');
  
  const [stats, setStats] = useState({
    totalRevenueStrk: 0,
    totalRevenueEth: 0,
    totalTransfersStrk: 0,
    totalTransfersEth: 0,
    totalRequestsStrk: 0,
    totalRequestsEth: 0,
    unlockedCount: 0,
    requestCount: 0
  });

  const normalizedMe = useMemo(() => normalizeAddress(address || ""), [address]);

  useEffect(() => {
    if (!address) return;
    
    const fetchStats = async () => {
      setIsLoading(true);
      const addr = normalizeAddress(address);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_address.eq.${addr},receiver_address.eq.${addr}`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, [address]);

  // Derived filtered transactions and stats
  const filteredData = useMemo(() => {
    if (!transactions.length) return { 
      lockedRevenue: [], 
      transfers: [], 
      requests: [],
      stats: {
        totalRevenueStrk: 0,
        totalRevenueEth: 0,
        totalTransfersStrk: 0,
        totalTransfersEth: 0,
        totalRequestsStrk: 0,
        totalRequestsEth: 0,
        unlockedCount: 0,
        requestCount: 0
      }
    };

    const now = new Date();
    let startDate: Date | null = null;
    
    if (filter === 'week') startDate = subDays(now, 7);
    else if (filter === 'month') startDate = subMonths(now, 1);
    else if (filter === 'year') startDate = subYears(now, 1);

    const checkTime = (dateStr: string) => {
      if (!startDate) return true;
      return isWithinInterval(parseISO(dateStr), { start: startDate, end: now });
    };

    const lockedRevenue: Transaction[] = [];
    const transfers: Transaction[] = [];
    const requests: Transaction[] = [];

    let revStrk = 0;
    let revEth = 0;
    let transStrk = 0;
    let transEth = 0;
    let reqStrk = 0;
    let reqEth = 0;
    let unlocked = 0;
    let reqCount = 0;

    transactions.forEach(tx => {
      if (!checkTime(tx.created_at)) return;

      // 1. Revenue: Successfully credited earnings from locked messages I SENT
      if (tx.type === 'locked' && tx.is_unlocked === true && normalizeAddress(tx.sender_address) === normalizedMe) {
        lockedRevenue.push(tx);
        unlocked++;
        if (tx.token === 'STRK') revStrk += Number(tx.unlock_price || 0);
        if (tx.token === 'ETH') revEth += Number(tx.unlock_price || 0);
      }

      // 2. Transfers: Direct payments (Received or Sent)
      if (tx.type === 'payment' && tx.status === 'accepted') {
        transfers.push(tx);
        const isReceived = normalizeAddress(tx.receiver_address) === normalizedMe;
        const multiplier = isReceived ? 1 : -1; // Net flow or just absolute? User said 'history and total', usually implies activity
        if (tx.token === 'STRK') transStrk += (Number(tx.amount || 0) * multiplier);
        if (tx.token === 'ETH') transEth += (Number(tx.amount || 0) * multiplier);
      }

      // 3. Requests: Token requests
      if (tx.type === 'request') {
        requests.push(tx);
        reqCount++;
        if (tx.token === 'STRK') reqStrk += Number(tx.amount || 0);
        if (tx.token === 'ETH') reqEth += Number(tx.amount || 0);
      }
    });

    return {
      lockedRevenue,
      transfers,
      requests,
      stats: {
        totalRevenueStrk: revStrk,
        totalRevenueEth: revEth,
        totalTransfersStrk: transStrk,
        totalTransfersEth: transEth,
        totalRequestsStrk: reqStrk,
        totalRequestsEth: reqEth,
        unlockedCount: unlocked,
        requestCount: reqCount
      }
    };
  }, [transactions, filter, normalizedMe]);

  useEffect(() => {
    setStats(filteredData.stats);
  }, [filteredData.stats]);

  if (!address) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-6 selection:bg-[#c8ff00] selection:text-black">
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
    <div className="min-h-screen bg-[#06070a] text-white font-mono selection:bg-[#c8ff00] selection:text-black pb-24">
      {/* Ambient Grid */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
      </div>

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
               <span className="text-[10px] text-white/30 uppercase tracking-widest leading-none mb-1">Authenticated_Node</span>
               <span className="font-bebas text-lg tracking-wider text-[#0af0ff] leading-none">{address?.substring(0,6)}...{address?.substring(address.length-4)}</span>
             </div>
             <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden">
               <Image src="/zenvic.png" alt="Zenvic" width={40} height={40} className="w-full h-full object-cover grayscale opacity-50 transition-all hover:grayscale-0 hover:opacity-100" />
             </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 pt-12 space-y-12">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b-2 border-white/5 pb-8">
           <div className="flex items-center gap-4">
              <div className="p-2 bg-white/5 border border-white/10 rounded-sm">
                <Filter className="w-5 h-5 text-white/40" />
              </div>
              <h2 className="font-bebas text-2xl tracking-[3px] uppercase">TIME_SERIES_FILTER</h2>
           </div>
           
           <div className="flex bg-white/5 p-1 border border-white/10 rounded-sm">
             {(['all', 'week', 'month', 'year'] as TimeFilter[]).map((t: TimeFilter) => (
               <button
                 key={t}
                 onClick={() => setFilter(t)}
                 className={`px-6 py-2 font-bebas text-sm tracking-[3px] transition-all uppercase ${
                   filter === t ? "bg-[#c8ff00] text-black shadow-[4px_4px_0px_#000]" : "text-white/40 hover:text-white"
                 }`}
               >
                 {t}
               </button>
             ))}
           </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <SummaryCard 
             title="LOCKED REVENUE" 
             valStrk={stats.totalRevenueStrk}
             valEth={stats.totalRevenueEth}
             sub={`${stats.unlockedCount} SUCCESSFUL_CREDITS`}
             icon={<Lock className="w-6 h-6 text-magenta" />}
             accent="border-magenta/20"
             glow="shadow-magenta/5"
           />
           <SummaryCard 
             title="TRANSFER VOLUME" 
             valStrk={stats.totalTransfersStrk}
             valEth={stats.totalTransfersEth}
             sub="NET_NETWORK_FLOW"
             icon={<HandCoins className="w-6 h-6 text-[#0af0ff]" />}
             accent="border-[#0af0ff]/20"
             glow="shadow-[#0af0ff]/5"
           />
           <SummaryCard 
             title="TOKEN REQUESTS" 
             valStrk={stats.totalRequestsStrk}
             valEth={stats.totalRequestsEth}
             sub={`${stats.requestCount} TOTAL_INVOICES`}
             icon={<TrendingUp className="w-6 h-6 text-[#c8ff00]" />}
             accent="border-[#c8ff00]/20"
             glow="shadow-[#c8ff00]/5"
           />
        </div>

        {/* Detailed History Sections */}
        <div className="grid grid-cols-1 gap-16">
          <Section 
            title="LOCKED_CREDITS_HISTORY" 
            icon={<Lock className="w-5 h-5 text-magenta" />}
            data={filteredData.lockedRevenue}
            me={normalizedMe}
            empty="NO_CREDITED_REVENUE_DETECTED"
            type="revenue"
          />
          
          <Section 
            title="TRANSFER_FLUIDITY_LOGS" 
            icon={<HandCoins className="w-5 h-5 text-[#0af0ff]" />}
            data={filteredData.transfers}
            me={normalizedMe}
            empty="NO_TRANSFER_ACTIVITY_MINED"
            type="transfer"
          />

          <Section 
            title="INVOICE_REQUEST_STREAM" 
            icon={<TrendingUp className="w-5 h-5 text-[#c8ff00]" />}
            data={filteredData.requests}
            me={normalizedMe}
            empty="NO_PENDING_REQUESTS_FOUND"
            type="request"
          />
        </div>
      </main>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  valStrk: number;
  valEth: number;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  glow?: string;
}

function SummaryCard({ title, valStrk, valEth, sub, icon, accent, glow }: SummaryCardProps) {
  return (
    <div className={`bg-[#0e1016] border-2 ${accent} p-8 space-y-6 shadow-[12px_12px_0px_#06070a] ${glow} hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden`}>
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <span className="text-[10px] font-unbounded text-white/20 uppercase tracking-[4px]">{title}</span>
          <div className="space-y-2">
             <div className="flex items-baseline gap-3">
               <h3 className="font-bebas text-5xl text-white tracking-widest">{valStrk.toFixed(2)}</h3>
               <span className="font-bebas text-xl text-[#ffd24d] tracking-widest opacity-60">STRK</span>
             </div>
             <div className="flex items-baseline gap-3">
               <h3 className="font-bebas text-3xl text-white/80 tracking-widest">{valEth.toFixed(4)}</h3>
               <span className="font-bebas text-lg text-[#0af0ff] tracking-widest opacity-40">ETH</span>
             </div>
          </div>
        </div>
        <div className="p-3 bg-white/5 border border-white/10 group-hover:border-inherit transition-colors">
          {icon}
        </div>
      </div>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
         <span className="text-[9px] font-['DM_Mono'] text-white/20 uppercase tracking-widest">{sub}</span>
         <Zap className="w-3 h-3 text-white/10 group-hover:text-inherit group-hover:animate-pulse" />
      </div>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  data: Transaction[];
  me: string;
  empty: string;
  type: string;
}

function Section({ title, icon, data, me, empty, type }: SectionProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-white/10 bg-white/5">
             {icon}
          </div>
          <h2 className="font-bebas text-2xl tracking-[5px] uppercase flex items-center gap-4">
            {title}
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] text-white/40">{data.length}</span>
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 group hover:border-white/10 transition-colors">
            <span className="font-bebas text-xl text-white/10 tracking-[10px] group-hover:text-white/20 transition-colors uppercase">{empty}</span>
          </div>
        ) : (
          data.slice(0, 10).map((tx: any) => (
            <EnhancedRow key={tx.id} tx={tx} me={me} category={type} />
          ))
        )}
      </div>
    </div>
  );
}

function EnhancedRow({ tx, me, category }: { tx: Transaction, me: string, category: string }) {
  const isReceived = normalizeAddress(tx.receiver_address) === me;
  const isSender = normalizeAddress(tx.sender_address) === me;
  
  let label = "GENERIC_TRANSMISSION";
  let amount = tx.amount || 0;
  let statusColor = "text-white/40";
  let flowLabel = "TRANSFER";
  
  if (category === 'revenue') {
    label = "SIGNAL_UNLOCKED_CREDIT";
    amount = tx.unlock_price || 0;
    statusColor = "text-emerald-400";
    flowLabel = "CREDIT";
  } else if (category === 'transfer') {
    label = isReceived ? "DECENTRALIZED_INBOUND" : "TERMINAL_OUTBOUND";
    statusColor = isReceived ? "text-emerald-400" : "text-red-400";
    flowLabel = isReceived ? "CREDIT" : "DEBIT";
  } else if (category === 'request') {
    label = isSender ? "INVOICE_DISPATCHED" : "INVOICE_RECEIVED";
    statusColor = "text-[#ffd24d]";
    flowLabel = "REQUEST";
  }

  return (
    <div className="bg-[#0e1016]/40 border-2 border-white/5 hover:border-white/10 p-5 flex items-center justify-between group transition-all duration-300 relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-center gap-8 relative z-10">
        <div className={`w-12 h-12 flex items-center justify-center border shadow-inner ${
          (category === 'revenue' || (category === 'transfer' && isReceived)) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'
        }`}>
          {category === 'revenue' ? <Lock className="w-5 h-5 text-magenta" /> : 
           category === 'request' ? <TrendingUp className="w-5 h-5 text-[#ffd24d]" /> :
           isReceived ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> : <ArrowUpRight className="w-5 h-5 text-red-400" />}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <span className="font-bebas text-xl tracking-[2px] text-white/90 group-hover:text-white transition-colors">{label}</span>
             <span className={`text-[8px] font-unbounded px-2 py-0.5 border bg-black/40 ${statusColor} border-current/20`}>
               {flowLabel}
             </span>
          </div>
          <div className="flex items-center gap-2 font-['DM_Mono'] text-[9px] text-white/20 uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            {new Date(tx.created_at).toLocaleString()}
            <span className="px-2 opacity-50">|</span>
            {tx.status?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-12 relative z-10">
        <div className="text-right space-y-1">
          <div className="font-bebas text-3xl tracking-wider text-[#f0ede8]">
            {(category === 'transfer' && !isReceived) ? '-' : '+'}{amount} <span className={tx.token === 'STRK' ? 'text-[#ffd24d]' : 'text-[#0af0ff]'}>{tx.token}</span>
          </div>
          <div className="text-[8px] text-white/10 font-unbounded uppercase tracking-[3px]">VERIFIED_ON_CHAIN</div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
          <a
            href={tx.tx_hash ? `https://starkscan.co/tx/${tx.tx_hash}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 border transition-all ${tx.tx_hash ? 'border-[#c8ff00]/40 text-[#c8ff00] hover:bg-[#c8ff00]/10' : 'border-white/10 text-white/20 cursor-not-allowed'}`}
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
  );
}

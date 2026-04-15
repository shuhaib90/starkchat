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
  HandCoins,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity
} from "lucide-react";
import { 
  isWithinInterval, 
  subDays, 
  subMonths, 
  subYears, 
  startOfToday,
  startOfYesterday,
  parseISO,
  format
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

function useCountUp(end: number, duration: number = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(end * ease);

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

type TimeFilter = 'all' | 'week' | 'month' | 'year';

export default function DashboardPage() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [activeTab, setActiveTab] = useState<'locked' | 'transfers' | 'requests'>('locked');
  
  const [stats, setStats] = useState({
    totalRevenueStrk: 0,
    totalRevenueEth: 0,
    totalTransfersStrk: 0,
    totalTransfersEth: 0,
    totalReceivedStrk: 0,
    totalReceivedEth: 0,
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
        totalReceivedStrk: 0,
        totalReceivedEth: 0,
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
    let receivedStrk = 0;
    let receivedEth = 0;
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
        const multiplier = isReceived ? 1 : -1;
        
        if (tx.token === 'STRK') {
          transStrk += (Number(tx.amount || 0) * multiplier);
          if (isReceived) receivedStrk += Number(tx.amount || 0);
        }
        if (tx.token === 'ETH') {
          transEth += (Number(tx.amount || 0) * multiplier);
          if (isReceived) receivedEth += Number(tx.amount || 0);
        }
      }

      // 3. Requests: Token requests (Only accepted/paid)
      if (tx.type === 'request' && tx.status === 'accepted') {
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
        totalReceivedStrk: receivedStrk,
        totalReceivedEth: receivedEth,
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
            <Link href="/" title="← Back to Chat" className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="h-8 w-[2px] bg-white/10" />
            <h1 className="font-bebas text-3xl tracking-[3px] flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-[#c8ff00]" />
              Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end">
               <span className="text-[10px] text-white/30 uppercase tracking-widest leading-none mb-1">Connected Wallet</span>
               <span className="font-bebas text-lg tracking-wider text-[#0af0ff] flex items-center gap-2 leading-none">
                 {address?.substring(0,6)}...{address?.substring(address.length-4)}
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
               </span>
             </div>
             <div className="w-10 h-10 rounded-full flex-shrink-0 border border-white/10 overflow-hidden bg-[#12151c] flex items-center justify-center">
               <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address || 'zenvic'}`} alt="Profile Avatar" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
             </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 pt-12 space-y-16">
        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <SummaryCard 
             title="Locked Earnings" 
             valStrk={stats.totalRevenueStrk}
             valEth={stats.totalRevenueEth}
             sub={`${stats.unlockedCount} payments received`}
             icon={<Lock className="w-5 h-5 text-magenta" />}
             accent="border-l-magenta"
           />
           <SummaryCard 
             title="Net Transfers" 
             valStrk={stats.totalTransfersStrk}
             valEth={stats.totalTransfersEth}
             sub={<span className="text-[#c8ff00] font-bold bg-[#c8ff00]/10 px-2 py-[2px] rounded-sm">{stats.totalReceivedStrk.toFixed(2)} STRK / {stats.totalReceivedEth.toFixed(4)} ETH TOTAL RECEIVED</span>}
             icon={<HandCoins className="w-5 h-5 text-[#0af0ff]" />}
             accent="border-l-[#0af0ff]"
           />
           <SummaryCard 
             title="Invoice Volume" 
             valStrk={stats.totalRequestsStrk}
             valEth={stats.totalRequestsEth}
             sub={`${stats.requestCount} total invoices`}
             icon={<TrendingUp className="w-5 h-5 text-[#c8ff00]" />}
             accent="border-l-[#c8ff00]"
           />
        </div>

        {/* Tabbed Activity Feed */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0">
              <button 
                onClick={() => setActiveTab('locked')}
                className={`py-2 flex items-center gap-3 transition-all ${activeTab === 'locked' ? 'border-b-2 border-magenta text-white' : 'border-b-2 border-transparent text-white/40 hover:text-white'}`}
              >
                <span className="font-bebas text-xl tracking-[1px]">Locked Credits</span>
                <span className="px-2 py-0.5 bg-white/5 text-[10px] font-unbounded text-white/50">{filteredData.lockedRevenue.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('transfers')}
                className={`py-2 flex items-center gap-3 transition-all ${activeTab === 'transfers' ? 'border-b-2 border-[#0af0ff] text-white' : 'border-b-2 border-transparent text-white/40 hover:text-white'}`}
              >
                <span className="font-bebas text-xl tracking-[1px]">Transfers</span>
                <span className="px-2 py-0.5 bg-white/5 text-[10px] font-unbounded text-white/50">{filteredData.transfers.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                className={`py-2 flex items-center gap-3 transition-all ${activeTab === 'requests' ? 'border-b-2 border-[#c8ff00] text-white' : 'border-b-2 border-transparent text-white/40 hover:text-white'}`}
              >
                <span className="font-bebas text-xl tracking-[1px]">Invoices</span>
                <span className="px-2 py-0.5 bg-white/5 text-[10px] font-unbounded text-white/50">{filteredData.requests.length}</span>
              </button>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs uppercase font-unbounded tracking-widest text-white/40">Show activity for:</span>
              <div className="flex bg-white/5 p-1 border border-white/10">
                {(['all', 'week', 'month', 'year'] as TimeFilter[]).map((t: TimeFilter) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-3 py-1 font-bebas text-sm tracking-[2px] transition-all uppercase ${
                      filter === t ? "bg-white/20 text-white" : "text-white/40 hover:text-white hover:border-white/10 border border-transparent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-white/5 border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  </div>
                ))}
              </div>
            ) : activeTab === 'locked' ? (
              <Section 
                data={filteredData.lockedRevenue}
                me={normalizedMe}
                empty="No Locked Earnings Yet"
                emptySub="Transactions will appear here once you receive STRK."
                type="revenue"
              />
            ) : activeTab === 'transfers' ? (
              <Section 
                data={filteredData.transfers}
                me={normalizedMe}
                empty="No Transfer History"
                emptySub="Transactions will appear here once you send or receive STRK."
                type="transfer"
              />
            ) : (
              <Section 
                data={filteredData.requests}
                me={normalizedMe}
                empty="No Invoices Yet"
                emptySub="Transactions will appear here once you send or receive invoices."
                type="request"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  valStrk: number;
  valEth: number;
  sub: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  glow?: string;
}

function SummaryCard({ title, valStrk, valEth, sub, icon, accent }: SummaryCardProps) {
  const animatedStrk = useCountUp(Math.abs(valStrk));
  const animatedEth = useCountUp(Math.abs(valEth));
  
  const isNegativeStrk = valStrk < 0;
  const isNegativeEth = valEth < 0;
  
  const strkColor = title === 'Net Transfers' ? (isNegativeStrk ? 'text-red-400' : 'text-emerald-400') : 'text-white';
  const ethColor = title === 'Net Transfers' ? (isNegativeEth ? 'text-red-400' : 'text-emerald-400') : 'text-white/80';

  return (
    <div className={`bg-[#0e1016] border border-white/5 ${accent} border-l-[3px] p-6 space-y-6 hover:bg-[#12151c] transition-all duration-300 relative overflow-hidden group`}>
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2 bg-white/5 border border-white/10 rounded-sm">
          {icon}
        </div>
        <span className="font-bebas text-xl tracking-[1px] text-white/80">{title}</span>
      </div>
      
      <div className="space-y-3 relative z-10">
         <div className="flex items-baseline gap-2">
           <h3 className={`font-bebas text-5xl tracking-widest ${strkColor}`}>
             {isNegativeStrk ? '-' : ''}{animatedStrk.toFixed(2)}
           </h3>
           <span className="font-bebas text-lg text-[#ffd24d] tracking-widest opacity-60">STRK</span>
         </div>
         <div className="flex items-baseline gap-2">
           <h3 className={`font-bebas text-3xl tracking-widest ${ethColor}`}>
             {isNegativeEth ? '-' : ''}{animatedEth.toFixed(4)}
           </h3>
           <span className="font-bebas text-sm text-[#0af0ff] tracking-widest opacity-40">ETH</span>
         </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center justify-between relative z-10 w-full overflow-hidden">
         <div className="font-['DM_Mono'] text-[11px] text-white/40 truncate pr-2">{sub}</div>
         <div className="flex items-end gap-[2px] h-4 text-white/10 flex-shrink-0 group-hover:text-white/30 transition-colors">
           {[40, 70, 30, 85, 100].map((h, i) => (
             <div key={i} className="w-[3px] bg-current transition-all duration-500" style={{ height: `${h}%` }} />
           ))}
         </div>
      </div>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
    </div>
  );
}

interface SectionProps {
  data: Transaction[];
  me: string;
  empty: string;
  emptySub: string;
  type: string;
}

function Section({ data, me, empty, emptySub, type }: SectionProps) {
  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-white/10 bg-white/[0.02]">
          <Activity className="w-8 h-8 text-white/10 mb-4" />
          <h3 className="font-bebas text-2xl tracking-[2px] text-white/40">{empty}</h3>
          <p className="font-['DM_Mono'] text-xs text-white/20 mt-2">{emptySub}</p>
        </div>
      ) : (
        data.map((tx: any) => (
          <EnhancedRow key={tx.id} tx={tx} me={me} category={type} />
        ))
      )}
    </div>
  );
}

function EnhancedRow({ tx, me, category }: { tx: Transaction, me: string, category: string }) {
  const isReceived = normalizeAddress(tx.receiver_address) === me;
  const isSender = normalizeAddress(tx.sender_address) === me;
  
  let label = "Unknown Transaction";
  let amount = tx.amount || 0;
  let statusColor = "text-white/40 border-white/20 bg-white/5";
  let flowLabel = "UNKNOWN";
  
  if (category === 'revenue') {
    label = "Locked Message Premium";
    amount = tx.unlock_price || 0;
    statusColor = "text-magenta border-magenta/20 bg-magenta/5";
    flowLabel = "CREDIT";
  } else if (category === 'transfer') {
    label = isReceived ? "Transfer Received" : "Transfer Sent";
    statusColor = isReceived ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" : "text-red-400 border-red-400/20 bg-red-400/10";
    flowLabel = isReceived ? "CREDIT" : "DEBIT";
  } else if (category === 'request') {
    label = isSender ? "Invoice Sent" : "Invoice Received";
    statusColor = "text-[#c8ff00] border-[#c8ff00]/20 bg-[#c8ff00]/10";
    flowLabel = "REQUEST";
  }

  const txDate = new Date(tx.created_at);
  const formattedDate = format(txDate, "MMM d, h:mm a");
  
  const isNegativeDisplay = category === 'transfer' && !isReceived;

  return (
    <div className="bg-[#0a0b0e] border border-white/5 hover:border-white/10 p-5 flex items-center justify-between group transition-all duration-300 relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-center gap-6 relative z-10">
        <div className={`w-10 h-10 flex items-center justify-center rounded-sm ${statusColor.split(' ')[0]} bg-white/5 border border-white/5`}>
          {category === 'revenue' ? <Lock className="w-4 h-4" /> : 
           category === 'request' ? <TrendingUp className="w-4 h-4" /> :
           isReceived ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <span className="font-bebas text-xl tracking-[1px] text-white/90 group-hover:text-white transition-colors">{label}</span>
             <span className={`text-[9px] font-bold px-2 py-0.5 border ${statusColor} rounded-sm`}>
               {flowLabel}
             </span>
          </div>
          <div className="flex items-center gap-2 font-['DM_Mono'] text-xs text-white/30 truncate">
            {formattedDate}
            <span className="px-1 opacity-20">•</span>
            {tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : 'Unknown'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 relative z-10">
        <div className="text-right">
          <div className={`font-bebas text-3xl tracking-wider ${isNegativeDisplay ? 'text-red-400' : 'text-emerald-400'}`}>
            {isNegativeDisplay ? '-' : '+'}{amount} <span className="text-lg opacity-60 ml-1">{tx.token}</span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1 font-['DM_Mono'] text-[10px] text-white/20 uppercase tracking-widest">
             {tx.tx_hash ? <CheckCircle2 className="w-3 h-3 text-emerald-400/60" /> : <Activity className="w-3 h-3 text-white/20" />}
             {tx.tx_hash ? 'On-chain' : 'Pending'}
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
          <a
            href={tx.tx_hash ? `https://starkscan.co/tx/${tx.tx_hash}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Starkscan"
            className={`p-2 block rounded-sm bg-white/5 transition-all ${tx.tx_hash ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-white/10 cursor-not-allowed'}`}
          >
            <ArrowUpRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}

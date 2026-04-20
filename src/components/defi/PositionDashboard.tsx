"use client";

import React from "react";
import { Activity, ShieldCheck, AlertTriangle, Skull } from "lucide-react";

interface PositionDashboardProps {
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  healthFactor: number | null;
  isLoading?: boolean;
}

export function PositionDashboard({
  totalSupplyUsd,
  totalBorrowUsd,
  healthFactor,
  isLoading = false
}: PositionDashboardProps) {
  const getHealthStatus = (hf: number | null) => {
    if (hf === null) return { label: "N/A", color: "text-white/20", icon: <Activity className="w-4 h-4" /> };
    if (hf > 2) return { label: "SAFE", color: "text-emerald-400", icon: <ShieldCheck className="w-4 h-4" /> };
    if (hf > 1.1) return { label: "RISKY", color: "text-[#ffd24d]", icon: <AlertTriangle className="w-4 h-4" /> };
    return { label: "DANGER", color: "text-red-500", icon: <Skull className="w-4 h-4" /> };
  };

  const status = getHealthStatus(healthFactor);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Supply */}
      <div className="bg-[#0e1016] border border-white/5 border-l-2 border-l-emerald-400 p-6 relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-400/10 border border-emerald-400/20 rounded-sm">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bebas text-lg tracking-[1px] text-white/60 uppercase">Net Assets Supplied</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bebas text-4xl tracking-widest text-white">
            ${isLoading ? "---" : totalSupplyUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] font-unbounded text-white/20 uppercase tracking-[2px]">USD</span>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 blur-[50px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
      </div>

      {/* Total Borrow */}
      <div className="bg-[#0e1016] border border-white/5 border-l-2 border-l-magenta p-6 relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-magenta/10 border border-magenta/20 rounded-sm">
            <Activity className="w-4 h-4 text-magenta" />
          </div>
          <span className="font-bebas text-lg tracking-[1px] text-white/60 uppercase">Total DebtValue</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bebas text-4xl tracking-widest text-white">
            ${isLoading ? "---" : totalBorrowUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] font-unbounded text-white/20 uppercase tracking-[2px]">USD</span>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-magenta/5 blur-[50px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
      </div>

      {/* Health Factor */}
      <div className="bg-[#0e1016] border border-white/5 border-l-2 border-l-[#0af0ff] p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/5 border border-white/10 rounded-sm ${status.color}`}>
              {status.icon}
            </div>
            <span className="font-bebas text-lg tracking-[1px] text-white/60 uppercase">Health_Factor</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 border ${status.color.replace('text-', 'border-').replace('text-', 'bg-').split(' ')[0]}/10 rounded-sm ${status.color}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-bebas text-4xl tracking-widest ${status.color}`}>
            {isLoading ? "---" : healthFactor === null ? "∞" : healthFactor.toFixed(2)}
          </span>
          <span className="text-[10px] font-unbounded text-white/20 uppercase tracking-[2px]">RATIO</span>
        </div>
        
        {/* Visual Progress Bar */}
        <div className="mt-4 h-1 bg-white/5 w-full rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${status.color.replace('text-', 'bg-')}`}
            style={{ width: `${Math.min((healthFactor || 0) * 33, 100)}%` }}
          />
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0af0ff]/5 blur-[50px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
      </div>
    </div>
  );
}

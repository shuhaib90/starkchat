import { StarkAgent } from "@/components/agent/StarkAgent";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

export default function AgentPage() {
  return (
    <main className="min-h-screen w-full flex flex-col p-4 sm:p-6 lg:p-8 bg-[#06070a] relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#0af0ff]/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c8ff00]/5 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col pt-12">
         {/* Navigation */}
         <div className="flex justify-between items-center mb-16">
            <Link 
              href="/"
              className="group flex items-center gap-4 text-white/30 hover:text-white transition-all"
            >
               <div className="w-10 h-10 border border-white/10 flex items-center justify-center group-hover:border-white transition-all">
                  <ArrowLeft className="w-5 h-5" />
               </div>
               <span className="font-bebas text-2xl tracking-[4px]">EXIT_TERMINAL</span>
            </Link>

            <div className="flex items-center gap-4">
               <Zap className="w-6 h-6 text-[#c8ff00] animate-pulse" />
               <div className="text-right">
                  <h2 className="text-2xl font-bebas tracking-tighter text-white leading-none">STARKAGENT_CORP</h2>
                  <p className="text-[10px] font-unbounded text-[#0af0ff] uppercase tracking-[3px] mt-1 opacity-60">AI_Decision_Gateway</p>
               </div>
            </div>
         </div>

         {/* Hero Title */}
         <div className="mb-12">
            <h1 className="text-7xl font-bebas tracking-tighter text-white leading-[0.8] mb-4">
               BRAIN_CORE <span className="text-[#0af0ff] text-2xl tracking-widest align-top ml-2">v.104</span>
            </h1>
            <p className="font-['DM_Mono'] text-[#f0ede8]/40 uppercase tracking-tighter text-xs max-w-xl leading-relaxed">
               Execute cross-protocol on-chain actions via direct neural interfacing (STARKAGENT). 
               No UI digging required. Type your intent, confirm the payload, and sign.
            </p>
         </div>

         {/* Main Agent Interface */}
         <div className="flex-1 flex flex-col justify-end pb-12">
            <StarkAgent />
         </div>
         
         {/* Footer Stats */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-8 border-t border-white/5 opacity-40">
            <div className="space-y-1">
               <p className="text-[8px] font-unbounded text-white tracking-widest uppercase">Protocol</p>
               <p className="font-bebas text-2xl text-white">STARKNET_MAINNET</p>
            </div>
            <div className="space-y-1">
               <p className="text-[8px] font-unbounded text-white tracking-widest uppercase">Encryption</p>
               <p className="font-bebas text-2xl text-white">SHA-256_ACTIVE</p>
            </div>
            <div className="space-y-1">
               <p className="text-[8px] font-unbounded text-white tracking-widest uppercase">Intelligence</p>
               <p className="font-bebas text-2xl text-white">STARKAGENT_CORE</p>
            </div>
            <div className="space-y-1">
               <p className="text-[8px] font-unbounded text-white tracking-widest uppercase">Latency</p>
               <p className="font-bebas text-2xl text-white">OPTIMIZED_EDGE</p>
            </div>
         </div>
      </div>
    </main>
  );
}

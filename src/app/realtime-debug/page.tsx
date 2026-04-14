"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Terminal, Shield, Globe, Power, Signal } from "lucide-react";

export default function RealtimeDebug() {
  const [status, setStatus] = useState("INITIALIZING...");
  const [logs, setLogs] = useState<string[]>([]);
  const [envCheck, setEnvCheck] = useState({ url: false, key: false });
  const [lastPing, setLastPing] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    addLog("Starting Production Diagnostic...");
    
    // 1. Check Env
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setEnvCheck({ url: !!url, key: !!key });
    addLog(`Env URL: ${url ? "DETECTED ✅" : "MISSING ❌"}`);
    addLog(`Env Key: ${key ? "DETECTED ✅" : "MISSING ❌"}`);

    // 2. Test Realtime
    addLog("Opening Test Channel: 'debug-channel'...");
    const channel = supabase
      .channel("debug-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          addLog(`RECEIVED REMOTE PING: ${payload.new.id}`);
          setLastPing(`Remote Ping Detected! Time: ${new Date().toLocaleTimeString()}`);
        }
      )
      .subscribe((status, err) => {
        setStatus(status.toUpperCase());
        addLog(`Connection Status: ${status}`);
        if (err) addLog(`ERROR: ${err.message}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendTestPing = async () => {
    addLog("Sending Local Ping to Database...");
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          content: "DIAGNOSTIC_PING",
          sender_address: "DEBUG_SENDER",
          receiver_address: "DEBUG_RECEIVER",
          type: "text"
        });

      if (error) {
        addLog(`SEND FAIL: ${error.message}`);
      } else {
        addLog("Local Ping SENT to Database. Waiting for Realtime reflected signal...");
      }
    } catch (e: any) {
      addLog(`UNCAUGHT ERROR: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-[#f0ede8] p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#c8ff00]/10 rounded-lg">
              <Terminal className="w-8 h-8 text-[#c8ff00]" />
            </div>
            <div>
              <h1 className="text-3xl font-bebas tracking-tighter">PRODUCTION DIAGNOSTIC</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[2px]">Bypassing Chat Logic - Raw Connection Test</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-sm border ${
            status === 'SUBSCRIBED' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-red-500/10 border-red-500/50'
          }`}>
            <span className="text-[10px] uppercase tracking-widest font-bold">WS_STATUS: {status}</span>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-[#c8ff00] uppercase">1. Environment</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="opacity-40">URL CONFIG:</span>
                <span className={envCheck.url ? "text-emerald-400" : "text-red-400"}>{envCheck.url ? "OK" : "MISSING"}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="opacity-40">KEY CONFIG:</span>
                <span className={envCheck.key ? "text-emerald-400" : "text-red-400"}>{envCheck.key ? "OK" : "MISSING"}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-sky-400 uppercase">2. Handshake</h3>
            <div className="flex items-center gap-3">
              <Signal className={status === 'SUBSCRIBED' ? "text-emerald-400" : "text-red-400"} />
              <span className="text-xs">{status}</span>
            </div>
            <p className="text-[9px] opacity-40 leading-relaxed uppercase">
              If this says "CHANNEL_ERROR" or stays at "JOINING", Vercel is blocking the WebSocket connection.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
            <h3 className="text-xs font-bold text-pink-500 uppercase">3. Round-Trip</h3>
            <button 
              onClick={sendTestPing}
              className="w-full py-2 bg-[#c8ff00] text-[#06070a] text-[10px] font-bold uppercase rounded-sm hover:scale-105 transition-transform"
            >
              Send Test Pulse
            </button>
            <div className="text-[9px] text-[#0af0ff] font-bold text-center animate-pulse">
              {lastPing || "AWAITING SIGNAL..."}
            </div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Connection Logs</span>
            <span className="w-2 h-2 bg-[#c8ff00] rounded-full animate-ping" />
          </div>
          <div className="h-64 overflow-y-auto p-4 text-[11px] space-y-1 font-['DM_Mono']">
            {logs.map((log, i) => (
              <div key={i} className={log.includes("ERROR") ? "text-red-400" : "text-white/60"}>
                {log}
              </div>
            ))}
            {logs.length === 0 && <span className="opacity-20 italic">No output yet...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

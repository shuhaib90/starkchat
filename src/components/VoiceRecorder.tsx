"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface VoiceRecorderProps {
  onSendVoice: (audioUrl: string) => void;
}

export function VoiceRecorder({ onSendVoice }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelRef = useRef(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      cancelRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (cancelRef.current) {
          cancelRef.current = false; // Reset
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or unavailable", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleUpload = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const fileName = `audio-${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("voice-messages")
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        onSendVoice(data.publicUrl);
      }
    } catch (error) {
      console.error("Failed to upload audio", error);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (isUploading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 rounded-lg text-[#0af0ff] flex-shrink-0">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-bebas tracking-widest text-sm">ENCODING_</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center justify-between gap-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex-shrink-0">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-mono text-red-500 text-sm font-bold">{formatTime(duration)}</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button 
            type="button"
            onClick={cancelRecording}
            className="p-1 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 rounded transition-colors"
            title="Cancel Recording"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-red-500/20 mx-0.5" />
          <button 
            type="button"
            onClick={stopRecording}
            className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
            title="Send Recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      className="p-3 bg-white/5 border border-white/10 hover:bg-[#0af0ff]/10 hover:border-[#0af0ff]/30 text-[#0af0ff] rounded-lg transition-all active:scale-95 flex-shrink-0 group"
      title="Send Voice Message"
    >
      <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
    </button>
  );
}

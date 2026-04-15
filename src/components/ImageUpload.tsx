"use client";

import React, { useState, useRef } from "react";
import { Image as ImageIcon, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ImageUploadProps {
  onSendImage: (imageUrl: string) => void;
  variant?: 'compact' | 'modal';
}

export function ImageUpload({ onSendImage, variant = 'compact' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert("File size too large (max 10MB).");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `img-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("chat-images")
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        onSendImage(data.publicUrl);
      }
    } catch (error) {
      console.error("Failed to upload image", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  if (variant === 'modal') {
    return (
      <div className="w-full">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <button
          type="button"
          onClick={triggerInput}
          disabled={isUploading}
          className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 bg-black/40 hover:border-magenta/40 hover:bg-magenta/5 transition-all rounded-sm group relative overflow-hidden"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-magenta" />
              <span className="font-bebas tracking-widest text-[#f0ede8]">UPLOADING_STREAM_</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-magenta/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-magenta" />
              </div>
              <span className="font-bebas tracking-widest text-xl text-white/40 group-hover:text-white uppercase">SELECT_VAULT_ASSET</span>
              <span className="font-mono text-[9px] text-white/10 uppercase mt-2 tracking-[2px]">Max 10MB / JPG / PNG / WEBP / GIF</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <button
        type="button"
        onClick={triggerInput}
        disabled={isUploading}
        className="p-3 bg-white/5 border border-white/10 hover:bg-[#c8ff00]/10 hover:border-[#c8ff00]/30 text-[#c8ff00] rounded-lg transition-all active:scale-95 group shadow-lg"
        title="Send Image"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
      </button>
    </div>
  );
}

"use client";

import React, { useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { supabase } from "@/lib/supabase";
import { useWallet } from "./StarkzapProvider";
import { Loader2, Camera } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface AvatarPickerProps {
  size?: number;
}

export function AvatarPicker({ size = 10 }: AvatarPickerProps) {
  const { address } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { updateCache } = useProfile(address || undefined);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !address) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${address.toLowerCase()}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      setIsUploading(true);

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Upsert into profiles DB
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ 
          address: address.toLowerCase(), 
          avatar_url: publicUrl 
        });

      if (dbError) throw dbError;

      // Update UI caching so it redraws
      updateCache(publicUrl);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="relative group cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <div className={`relative w-${size} h-${size}`}>
        <UserAvatar address={address || undefined} size={size} className="w-full h-full" />
        
        {/* Hover Overlay - Brutalist Style */}
        <div className={`absolute inset-0 rounded-lg bg-[#c8ff00]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${address ? '' : 'hidden'}`}>
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-black animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-black" />
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Global cache to prevent repeated database fetches for identical addresses in a chat list!
const profileCache = new Map<string, string | null>();

export function useProfile(address?: string) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(address && profileCache.has(address.toLowerCase()) ? profileCache.get(address.toLowerCase()) || null : null);

  useEffect(() => {
    if (!address) return;
    const addr = address.toLowerCase();

    if (profileCache.has(addr)) {
      setAvatarUrl(profileCache.get(addr) || null);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('address', addr)
        .single();
      
      const url = data && !error ? data.avatar_url : null;
      profileCache.set(addr, url);
      setAvatarUrl(url);
    };

    fetchProfile();
  }, [address]);

  const updateCache = (newUrl: string) => {
    if (!address) return;
    const addr = address.toLowerCase();
    profileCache.set(addr, newUrl);
    setAvatarUrl(newUrl);
  };

  return { avatarUrl, updateCache };
}

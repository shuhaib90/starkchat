import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const sanitize = (val: string | undefined) => val?.trim().replace(/^["'](.+)["']$/, '$1').replace(/\/$/, '');
  
  // Try modern key first, then legacy
  const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (typeof window !== 'undefined' && url) {
    const projectRef = url.match(/https:\/\/(.+)\.supabase/)?.[1];
    console.log(`%c[StarkChat] Production Sync Init`, "color: #00ff00; font-weight: bold;");
    console.log(`[Diagnostic] Domain: ${window.location.hostname}`);
    console.log(`[Diagnostic] Project: ${projectRef || "UNKNOWN"}`);
    if (key) {
      const isModern = key.startsWith('sb_publishable_');
      console.log(`[Diagnostic] Key Type: ${isModern ? "MODERN ✅" : "LEGACY ⚠️"}`);
      console.log(`[Diagnostic] Key Signature: ${key.length} chars | ${key.substring(0, 5)}...${key.substring(key.length - 5)}`);
    } else {
      console.log(`[Diagnostic] Key Status: MISSING ❌`);
    }
  }

  return { url, key };
};

const { url: finalUrl, key: finalKey } = getSupabaseConfig();

export const supabase = createClient(
  finalUrl || 'https://placeholder.supabase.co', 
  finalKey || 'placeholder',
  {
    global: {
      headers: { 'x-application-name': 'starkchat-prod' }
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      }
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

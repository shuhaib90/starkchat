import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const sanitize = (val: string | undefined) => val?.trim().replace(/^["'](.+)["']$/, '$1').replace(/\/$/, '');
  const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (typeof window !== 'undefined' && url) {
    const projectRef = url.match(/https:\/\/(.+)\.supabase/)?.[1];
    console.log(`[Diagnostic] Supabase Init - Domain: ${window.location.hostname}`);
    console.log(`[Diagnostic] Supabase Init - Project Ref: ${projectRef || "UNKNOWN"}`);
    console.log(`[Diagnostic] Supabase Init - Key Present: ${key ? "YES" : "NO"}`);
    if (key) {
      console.log(`[Diagnostic] Key Signature: ${key.length} chars | ${key.substring(0, 5)}...${key.substring(key.length - 5)}`);
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

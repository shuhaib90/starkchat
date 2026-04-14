import { createClient } from '@supabase/supabase-js';

const sanitize = (val: string | undefined) => val?.trim().replace(/^["'](.+)["']$/, '$1').replace(/\/$/, '');

const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[StarkChat] Supabase environment variables are MISSING. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment (Local or Vercel).");
}

// [DIAGNOSTIC] Log current connection parameters on production
if (typeof window !== 'undefined') {
  console.log(`[StarkChat Environment] Domain: ${window.location.hostname}`);
  console.log(`[StarkChat Environment] Supabase URL: ${supabaseUrl ? "Detected ✅" : "Missing ❌"}`);
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
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

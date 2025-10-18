"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnon) {
  // Soft warn in client; avoid breaking the UI during local dev
  // eslint-disable-next-line no-console
  console.warn("Supabase env not set. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
  console.warn("Current values:", { supabaseUrl: !!supabaseUrl, supabaseAnon: !!supabaseAnon });
}

export const supabaseClient = createClient(supabaseUrl ?? "", supabaseAnon ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Test connection on initialization
supabaseClient.from('templates').select('count').limit(1).then(({ error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.log('Supabase connection successful');
  }
});



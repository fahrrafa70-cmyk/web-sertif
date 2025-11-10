import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE as string | undefined;

export const supabaseServer = createClient(supabaseUrl ?? "", (supabaseService ?? supabaseAnon ?? ""), {
  auth: { persistSession: false },
});



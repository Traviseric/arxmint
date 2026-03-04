// ============================================================
// ArxMint — Supabase Client
// Server-side client for API routes. Uses service role key
// for full table access (RLS bypassed).
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ncddvxglmnnfagyyupeu.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

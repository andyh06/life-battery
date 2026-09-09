import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment."
  );
}

/**
 * The single Supabase client for this app. Uses the publishable/anon key —
 * every table this app reads has a "public read" RLS policy, and estimates
 * is insert-only, so the anon key is sufficient and appropriately scoped.
 * The secret key (scripts/seed.py only) must never be imported here.
 */
export const supabase = createClient(url, anonKey);

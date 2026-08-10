import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A single shared client for the whole app.
export const supabase =
  url && key
    ? createClient(url, key)
    : null; // null until env vars are set, so the app can show a friendly notice

export const hasSupabase = Boolean(url && key);

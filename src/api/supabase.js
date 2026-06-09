import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This will tell you exactly what's missing
if (!SUPABASE_URL) console.error("❌ VITE_SUPABASE_URL is missing from .env");
if (!SUPABASE_ANON_KEY) console.error("❌ VITE_SUPABASE_ANON_KEY is missing from .env");

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
import { createClient } from "@supabase/supabase-js";
const URL =
  import.meta.env?.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL : "") ||
  "https://placeholder.supabase.co";
const KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_ANON_KEY : "") ||
  "placeholder-key";
const supabase = createClient(URL, KEY);

export { supabase };

/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Haal de sleutels op en vertel TypeScript dat het strings zijn
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Veiligheidscheck voor de console
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ LET OP: Supabase keys ontbreken in .env.local!");
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
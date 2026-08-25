import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local and rebuild.'
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey);
  }
  return client;
}

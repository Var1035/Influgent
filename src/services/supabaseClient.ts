import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://unowbqmjwzofklnhbkbc.supabase.co';

// Vite environment variable: VITE_SUPABASE_ANON_KEY
export const SUPABASE_ANON_KEY =
  ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) ||
  '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('your_')
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

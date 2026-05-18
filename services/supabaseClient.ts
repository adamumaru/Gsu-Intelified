import { createClient } from '@supabase/supabase-js';

// Fallbacks are set to standard Supabase local development credentials.
// These will be automatically swapped with the exact ones printed when Supabase starts.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZmVyZW5jZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE2MDQ3MjAwLCJleHAiOjIwMzE2MjMyMDB9.placeholder_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

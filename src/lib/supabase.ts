import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Initialize the Supabase client.
// This client is safe to use in both Client Components and Server Actions.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

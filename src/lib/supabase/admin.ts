import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient<any, any, any> | null = null;

export function getSupabaseAdmin(): SupabaseClient<any, any, any> {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    supabaseAdminInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co', 
      supabaseKey || 'placeholder-key'
    ) as SupabaseClient<any, any, any>;
  }
  return supabaseAdminInstance;
}

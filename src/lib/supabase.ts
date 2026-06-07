import { createClient } from './supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient<any, any, any> | null = null;

export const supabase = new Proxy({} as SupabaseClient<any, any, any>, {
  get(target, prop, receiver) {
    if (!supabaseInstance) {
      supabaseInstance = createClient() as SupabaseClient<any, any, any>;
    }
    return Reflect.get(supabaseInstance, prop, receiver);
  }
});

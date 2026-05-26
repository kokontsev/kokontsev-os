/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Client for public operations (browser-safe)
export const supabasePublic = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Client for server-side operations (requires service role key)
export const supabaseServer = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
      },
    }
  );
};

export default supabasePublic;

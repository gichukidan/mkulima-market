const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';

function getSupabaseClient() {
  if (!supabaseUrl || !(supabaseServiceKey || supabaseAnonKey)) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

module.exports = {
  supabaseUrl,
  databaseUrl,
  supabaseAnonKey,
  supabaseServiceKey,
  mode: databaseUrl || supabaseUrl ? 'supabase' : 'sqlite',
  isSupabaseConfigured: Boolean(databaseUrl || (supabaseUrl && (supabaseServiceKey || supabaseAnonKey))),
  getSupabaseClient
};

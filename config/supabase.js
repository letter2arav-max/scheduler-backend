const { createClient } = require('@supabase/supabase-js');

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let cached;

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseClient() {
  if (!cached) {
    cached = createSupabaseClient();
  }
  return cached;
}

module.exports = {
  createSupabaseClient,
  getSupabaseClient,
};

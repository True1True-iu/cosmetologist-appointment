const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in backend .env");
}

const adminKey = supabaseServiceRoleKey || supabaseAnonKey;
if (!supabaseServiceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Backend will run with anon key and may be limited by RLS."
  );
}

const supabaseAdmin = createClient(supabaseUrl, adminKey, {
  auth: { persistSession: false }
});

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

module.exports = {
  supabaseAdmin,
  supabaseAuth
};

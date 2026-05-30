// ============================================================
//  CineStream — Supabase Configuration
//  Fill in your project URL and anon key from:
//  https://supabase.com/dashboard/project/_/settings/api
// ============================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Initialize Supabase client (loaded via CDN in index.html)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Export for use across modules
window.sb = supabaseClient;

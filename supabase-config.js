// ============================================
// KONFIGURASI SUPABASE
// ============================================

const SUPABASE_URL = 'https://iupdthqyrjgwnqrkfsim.supabase.co';

// PENTING: Ganti string di bawah ini dengan anon/public key resmi (format JWT: eyJhbGci...)
// yang diambil dari Supabase Dashboard: Settings > API
const SUPABASE_ANON_KEY = 'sb_publishable_R0yJvJqRhX4Aq3cVZp9BMA_8XSeQqBp'; 

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

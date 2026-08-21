// ============================================
// KONFIGURASI SUPABASE
// ============================================
// Ambil 2 nilai ini dari Supabase Dashboard:
// Project Settings > API > Project URL & anon public key
//
// PENTING: anon key ini AMAN untuk ditaruh di kode frontend
// (bukan rahasia), karena akses data tetap dijaga oleh RLS
// yang sudah kita buat di database/schema.sql

const SUPABASE_URL = 'https://iupdthqyrjgwnqrkfsim.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R0yJvJqRhX4Aq3cVZp9BMA_8XSeQqBp';

// Membuat satu client Supabase yang dipakai di semua halaman
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

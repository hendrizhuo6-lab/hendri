// supabase-config.js
const SUPABASE_URL = 'https://iupdthqyrjgwnqrkfsim.supabase.co';
// ✅ supabase.co (bukan subabase.co)

const SUPABASE_ANON_KEY = 'sb_publishable_R0yJvJqRhX4Aq3cVZp9BMA_8XSeQqBp';

// Pastikan supabase sudah tersedia dari CDN
if (typeof supabase === 'undefined') {
  // ✅ supabase (bukan subabase)
  console.error('Supabase library not loaded!');
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ✅ supabaseClient (bukan subabaseClient)

// console.log('✅ Supabase connected!');

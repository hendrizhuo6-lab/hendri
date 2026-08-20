// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL = 'https://iupdthqyrjgwnqrkfsim.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R0yJvJqRhX4Aq3cVZp9BMA_8XSeQqBp';

if (typeof window.supabase === 'undefined') {
  console.error('❌ Supabase library not loaded!');
  alert('Error: Library Supabase tidak ditemukan.');
  throw new Error('Supabase library tidak ditemukan!');
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test koneksi
(async function testConnection() {
  try {
    const { error } = await supabaseClient.from('notes').select('count', { count: 'exact', head: true });
    if (error) {
      console.warn('⚠️ Supabase connection test:', error.message);
    } else {
      console.log('✅ Supabase connected successfully!');
    }
  } catch (error) {
    console.warn('⚠️ Supabase connection test failed:', error.message);
  }
})();

window.supabaseClient = supabaseClient;

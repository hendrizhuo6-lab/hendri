// ============================================
// AUTH.JS - FIX VERSION
// ============================================

if (typeof supabaseClient === 'undefined') {
  console.error('❌ supabaseClient not found!');
  alert('Error: Supabase tidak terhubung.');
  throw new Error('supabaseClient tidak ditemukan!');
}

let currentUserSession = null;

async function checkAuth(redirectOnFail = false) {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.warn('⚠️ Session fetch error:', error.message);
      return false;
    }

    if (!session) {
      console.warn('⚠️ No active session');
      
      if (redirectOnFail) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://hendrizhuo6-lab.github.io/login/login.html?return=${returnUrl}`;
      }
      
      return false;
    }

    currentUserSession = session;
    console.log('✅ User authenticated:', session.user.email);
    return true;

  } catch (error) {
    console.error('❌ Auth check error:', error);
    return false;
  }
}

function getCurrentUser() {
  if (!currentUserSession) {
    return null;
  }
  
  return {
    id: currentUserSession.user.id,
    email: currentUserSession.user.email,
    name: currentUserSession.user.user_metadata?.name || currentUserSession.user.email
  };
}

async function handleLogout() {
  if (!confirm('Apakah Anda yakin ingin keluar?')) return;
  
  try {
    await supabaseClient.auth.signOut();
    currentUserSession = null;
    window.location.href = 'https://hendrizhuo6-lab.github.io/login/login.html';
  } catch (error) {
    console.error('❌ Logout error:', error);
    alert('Gagal logout. Silakan coba lagi.');
  }
}

window.auth = {
  checkAuth,
  getCurrentUser,
  handleLogout,
  supabaseClient
};

console.log('✅ Auth module loaded');

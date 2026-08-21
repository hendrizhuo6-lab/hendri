document.addEventListener('DOMContentLoaded', async function () {

  // ============================================
  // CEK SUPABASE SUDAH TERHUBUNG
  // ============================================

  if (typeof supabaseClient === 'undefined') {
    console.error('❌ Supabase client tidak ditemukan. Cek supabase-config.js');
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // ============================================
  // JIKA SUDAH LOGIN, JANGAN TAMPILKAN HALAMAN LOGIN/REGISTER LAGI
  // ============================================

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session && (loginForm || registerForm)) {
    console.log('✅ Sudah login sebagai:', session.user.email);
    window.location.href = 'dashboard.html';
    return;
  }

  // ============================================
  // HELPER: tampilkan pesan error/sukses di form
  // ============================================

  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + (type === 'error' ? 'form-message-error' : 'form-message-success');
    el.classList.remove('hidden');
  }

  function setLoading(button, isLoading, loadingText, normalText) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : normalText;
  }

  // ============================================
  // LOGIN
  // ============================================

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const messageEl = document.getElementById('login-message');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      messageEl.classList.add('hidden');
      setLoading(submitBtn, true, '⏳ Masuk...', 'Masuk');

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      setLoading(submitBtn, false, '⏳ Masuk...', 'Masuk');

      if (error) {
        // Supabase mengembalikan pesan error dalam bahasa Inggris,
        // kita terjemahkan pesan yang paling umum supaya lebih ramah.
        let pesan = 'Email atau password salah.';

        if (error.message.includes('Email not confirmed')) {
          pesan = 'Email belum diverifikasi. Cek inbox email kamu.';
        }

        showMessage(messageEl, '❌ ' + pesan, 'error');
        return;
      }

      showMessage(messageEl, '✅ Berhasil masuk! Mengalihkan...', 'success');

      // Tahap berikutnya kita akan buat dashboard.html
      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 800);
    });
  }

  // ============================================
  // REGISTER
  // ============================================

  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      const messageEl = document.getElementById('register-message');
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      messageEl.classList.add('hidden');

      // Validasi sederhana di sisi frontend
      if (password.length < 6) {
        showMessage(messageEl, '❌ Password minimal 6 karakter.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showMessage(messageEl, '❌ Konfirmasi password tidak cocok.', 'error');
        return;
      }

      setLoading(submitBtn, true, '⏳ Mendaftar...', 'Daftar');

      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
      });

      setLoading(submitBtn, false, '⏳ Mendaftar...', 'Daftar');

      if (error) {
        showMessage(messageEl, '❌ ' + error.message, 'error');
        return;
      }

      showMessage(
        messageEl,
        '✅ Akun berhasil dibuat! Cek email kamu untuk verifikasi, lalu login.',
        'success'
      );

      registerForm.reset();
    });
  }

  // ============================================
  // LOGOUT (dipakai nanti di dashboard.js)
  // ============================================

  window.handleLogout = async function () {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
  };

});

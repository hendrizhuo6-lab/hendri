document.addEventListener('DOMContentLoaded', async function () {

  // ============================================
  // CEK SUPABASE SUDAH TERHUBUNG
  // ============================================

  if (typeof supabaseClient === 'undefined') {
    console.error('❌ Supabase client tidak ditemukan. Cek supabase-config.js');
    return;
  }

  console.log('✅ Supabase client terhubung');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // ============================================
  // CEK SESSION
  // ============================================

  async function checkSession() {
    const { data: { session }, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error('❌ Gagal mengecek session:', error.message);
      return;
    }

    if (session) {
      console.log('✅ User sudah login:', session.user);

      // Jika sudah login, langsung ke dashboard
      if (window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
      }
    } else {
      console.log('ℹ️ User belum login');
    }
  }

  await checkSession();

  // ============================================
  // HELPER
  // ============================================

  function showMessage(el, text, type) {
    if (!el) return;

    el.textContent = text;
    el.className =
      'form-message ' +
      (type === 'error'
        ? 'form-message-error'
        : 'form-message-success');

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

      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const messageEl = document.getElementById('login-message');
      const submitBtn =
        loginForm.querySelector('button[type="submit"]');

      if (!emailInput || !passwordInput) {
        console.error('❌ Input login tidak ditemukan.');
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (messageEl) {
        messageEl.classList.add('hidden');
      }

      setLoading(
        submitBtn,
        true,
        '⏳ Masuk...',
        'Masuk'
      );

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

      setLoading(
        submitBtn,
        false,
        '⏳ Masuk...',
        'Masuk'
      );

      if (error) {
        console.error('❌ Login gagal:', error);

        let pesan = error.message;

        if (error.message.includes('Invalid login credentials')) {
          pesan = 'Email atau password salah.';
        }

        if (error.message.includes('Email not confirmed')) {
          pesan = 'Email belum diverifikasi. Cek inbox email kamu.';
        }

        showMessage(
          messageEl,
          '❌ ' + pesan,
          'error'
        );

        return;
      }

      console.log('✅ Login berhasil:', data.user);

      showMessage(
        messageEl,
        '✅ Berhasil masuk! Mengalihkan...',
        'success'
      );

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

      const emailInput =
        document.getElementById('register-email');

      const passwordInput =
        document.getElementById('register-password');

      const confirmPasswordInput =
        document.getElementById('register-confirm-password');

      const messageEl =
        document.getElementById('register-message');

      const submitBtn =
        registerForm.querySelector('button[type="submit"]');

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      messageEl.classList.add('hidden');

      if (password.length < 6) {
        showMessage(
          messageEl,
          '❌ Password minimal 6 karakter.',
          'error'
        );
        return;
      }

      if (password !== confirmPassword) {
        showMessage(
          messageEl,
          '❌ Konfirmasi password tidak cocok.',
          'error'
        );
        return;
      }

      setLoading(
        submitBtn,
        true,
        '⏳ Mendaftar...',
        'Daftar'
      );

      const { data, error } =
        await supabaseClient.auth.signUp({
          email: email,
          password: password
        });

      setLoading(
        submitBtn,
        false,
        '⏳ Mendaftar...',
        'Daftar'
      );

      if (error) {
        console.error('❌ Register gagal:', error);

        showMessage(
          messageEl,
          '❌ ' + error.message,
          'error'
        );

        return;
      }

      console.log('✅ Register berhasil:', data);

      showMessage(
        messageEl,
        '✅ Akun berhasil dibuat! Cek email kamu untuk verifikasi, lalu login.',
        'success'
      );

      registerForm.reset();
    });
  }

  // ============================================
  // LOGOUT
  // ============================================

  window.handleLogout = async function () {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      console.error('❌ Logout gagal:', error.message);
      return;
    }

    window.location.href = 'login.html';
  };

});

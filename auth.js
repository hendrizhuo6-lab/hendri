// auth.js - Khusus Proteksi Akses & Fitur Logout

// Inisialisasi Supabase Client Global
const SUPABASE_URL = "https://iupdthqyrjgwnqrkfsim.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_R0yJvJqRhX4Aq3cVZp9BMA_8XSeQqBp"; // Isi dengan JWT Key kamu

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable global untuk menyimpan session user aktif
let currentUserSession = null;

// Fungsi untuk mengecek status login
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    alert("Akses ditolak! Silakan login terlebih dahulu.");
    window.location.href = "https://hendrizhuo6-lab.github.io/"; 
    return;
  }

  currentUserSession = session;
}

// Fungsi Logout (Bisa dipanggil oleh tombol logout di HTML)
async function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    await supabaseClient.auth.signOut();
    window.location.href = "https://hendrizhuo6-lab.github.io/";
  }
}

// Event handler untuk tombol logout jika ada di HTML (id="btn-logout")
document.addEventListener("DOMContentLoaded", function () {
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }
});

// Jalankan proteksi keamanan langsung saat file ini dimuat
checkAuth();
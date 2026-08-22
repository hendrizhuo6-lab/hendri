 const note = document.getElementById('stickyNote');
    const editor = document.getElementById('editor');
    const colorPicker = document.getElementById('bgColorPicker');

    // Muat data dari LocalStorage saat halaman pertama dibuka
    window.addEventListener('DOMContentLoaded', () => {
      const savedContent = localStorage.getItem('stickyNote_content');
      const savedColor = localStorage.getItem('stickyNote_color');

      if (savedContent) {
        editor.innerHTML = savedContent;
      }
      if (savedColor) {
        note.style.setProperty('--bg-color', savedColor);
        colorPicker.value = savedColor;
      }
    });

    // Format Teks
    function formatDoc(cmd, value = null) {
      document.execCommand(cmd, false, value);
      editor.focus();
    }

    // Ubah Warna Catatan
    colorPicker.addEventListener('input', (e) => {
      note.style.setProperty('--bg-color', e.target.value);
    });

    // Sisipkan Gambar
    function insertImage(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const imgHtml = `<br><img src="${e.target.result}" alt="Uploaded Image"><br>`;
          document.execCommand('insertHTML', false, imgHtml);
        };
        reader.readAsDataURL(file);
      }
    }

    // Fungsi Save (Simpan Teks & Gambar ke LocalStorage)
    function saveNote() {
      localStorage.setItem('stickyNote_content', editor.innerHTML);
      localStorage.setItem('stickyNote_color', colorPicker.value);
      alert('Catatan berhasil disimpan!');
    }

    // Fungsi Cancel (Mengembalikan/Mengosongkan Isian Editor)
    function cancelNote() {
      if (confirm('Batalkan perubahan dan kosongkan editor?')) {
        editor.innerHTML = '';
      }
    }

    // Bersihkan Isian Editor (Tombol Sampah)
    function clearContent() {
      editor.innerHTML = '';
      localStorage.removeItem('stickyNote_content');
    }

    // Clear Placeholder Text saat fokus pertama kali
    editor.addEventListener('focus', function clearPlaceholder() {
      if (editor.innerText.trim() === 'Tulis catatanmu di sini...') {
        editor.innerText = '';
      }
      editor.removeEventListener('focus', clearPlaceholder);
    });

    // Minimize Toggle
    document.getElementById('btnMinimize').addEventListener('click', () => {
      note.classList.toggle('minimized');
    });
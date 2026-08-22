(function () {
  // Gunakan nama variabel lokal khusus agar tidak bentrok dengan dashboard.js
  const noteSticky = document.getElementById('stickyNote');
  const stickyEditor = document.getElementById('editor');
  const colorPicker = document.getElementById('bgColorPicker');

  if (!stickyEditor) return; // Mencegah error jika elemen tidak ditemukan

  // Muat data dari LocalStorage saat pertama dibuka
  const savedContent = localStorage.getItem('stickyNote_content');
  const savedColor = localStorage.getItem('stickyNote_color');

  if (savedContent) {
    stickyEditor.innerHTML = savedContent;
  }
  if (savedColor && noteSticky && colorPicker) {
    noteSticky.style.setProperty('--bg-color', savedColor);
    colorPicker.value = savedColor;
  }

  // Format Teks
  window.formatDoc = function (cmd, value = null) {
    document.execCommand(cmd, false, value);
    stickyEditor.focus();
  };

  // Ubah Warna Catatan
  if (colorPicker && noteSticky) {
    colorPicker.addEventListener('input', (e) => {
      noteSticky.style.setProperty('--bg-color', e.target.value);
    });
  }

  // Sisipkan Gambar
  window.insertImage = function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const imgHtml = `<br><img src="${e.target.result}" alt="Uploaded Image"><br>`;
        document.execCommand('insertHTML', false, imgHtml);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fungsi Save ke LocalStorage
  window.saveNote = function () {
    localStorage.setItem('stickyNote_content', stickyEditor.innerHTML);
    if (colorPicker) localStorage.setItem('stickyNote_color', colorPicker.value);
    alert('Catatan berhasil disimpan!');
  };

  // Fungsi Cancel (Kosongkan Editor)
  window.cancelNote = function () {
    if (confirm('Batalkan perubahan dan kosongkan editor?')) {
      stickyEditor.innerHTML = '';
    }
  };

  // Bersihkan Isian Editor
  window.clearContent = function () {
    stickyEditor.innerHTML = '';
    localStorage.removeItem('stickyNote_content');
  };

  // Clear Placeholder Text saat fokus pertama kali
  stickyEditor.addEventListener('focus', function clearPlaceholder() {
    if (stickyEditor.innerText.trim() === 'Tulis catatanmu di sini...') {
      stickyEditor.innerText = '';
    }
    stickyEditor.removeEventListener('focus', clearPlaceholder);
  });

  // Minimize Toggle
  const btnMinimize = document.getElementById('btnMinimize');
  if (btnMinimize && noteSticky) {
    btnMinimize.addEventListener('click', () => {
      noteSticky.classList.toggle('minimized');
    });
  }
})();

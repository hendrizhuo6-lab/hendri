// ============================================
// MAIN.JS - FINAL VERSION
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
  // ============================================
  // STEP 1: CEK KONEKSI
  // ============================================
  if (typeof supabaseClient === 'undefined') {
    console.error('❌ Supabase client not found!');
    alert('Error: Supabase tidak terhubung.');
    return;
  }

  // ============================================
  // STEP 2: CEK AUTHENTIKASI
  // ============================================
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('❌ Session error:', error);
      throw error;
    }

    if (!session) {
      console.warn('⚠️ No session found, redirecting to login...');
      alert('🔒 Akses ditolak! Anda harus login terlebih dahulu.');
      window.location.href = 'https://hendrizhuo6-lab.github.io/login/login.html';
      return;
    }

    // ============================================
    // STEP 3: AUTH BERHASIL - LANJUTKAN APLIKASI
    // ============================================
    const currentUserId = session.user.id;
    console.log('✅ User authenticated:', session.user.email);

    // ============================================
    // DOM ELEMENTS
    // ============================================
    const btnAddNote = document.getElementById('btn-add-note');
    const noteFormSection = document.getElementById('note-form-section');
    const cancelBtn = document.getElementById('cancel-btn');
    const noteForm = document.getElementById('note-form');
    const noteList = document.getElementById('recent-note-list');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    const noteModal = document.getElementById('note-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalEditBtn = document.getElementById('modal-edit-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-note-form');
    const editTitle = document.getElementById('edit-title');
    const editContent = document.getElementById('edit-content');
    const editImportant = document.getElementById('edit-important');
    const editCancelBtn = document.getElementById('edit-cancel-btn');

    let activeNoteElement = null;
    let activeNoteId = null;

    // ============================================
    // CRUD FUNCTIONS
    // ============================================

    async function fetchNotes() {
      try {
        const { data, error } = await supabaseClient
          .from('notes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching notes:', error);
        return [];
      }
    }

    async function addNote(title, content, is_important) {
      try {
        const { data, error } = await supabaseClient
          .from('notes')
          .insert([
            {
              title: title,
              content: content,
              is_important: is_important,
              user_id: currentUserId,
              created_at: new Date().toISOString(),
            },
          ])
          .select();

        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error adding note:', error);
        return null;
      }
    }

    async function updateNote(id, title, content, is_important) {
      try {
        const { data, error } = await supabaseClient
          .from('notes')
          .update({
            title: title,
            content: content,
            is_important: is_important,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select();

        if (error) throw error;
        return data[0];
      } catch (error) {
        console.error('Error updating note:', error);
        return null;
      }
    }

    async function deleteNote(id) {
      try {
        const { error } = await supabaseClient
          .from('notes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error deleting note:', error);
        return false;
      }
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function createNoteElement(title, content, isImportant, id) {
      const noteArticle = document.createElement('article');
      noteArticle.classList.add('note-item');
      if (isImportant) noteArticle.classList.add('important');

      noteArticle.dataset.title = title;
      noteArticle.dataset.content = content;
      noteArticle.dataset.id = id;

      noteArticle.innerHTML = `
        <div class="note-content-preview">
          <h3 class="note-title">${escapeHtml(title)}</h3>
          <p class="note-body">${escapeHtml(content)}</p>
          ${isImportant ? '<span class="badge-important">⭐ Penting</span>' : ''}
        </div>
        <div class="note-actions">
          <button type="button" class="btn-delete" title="Hapus catatan">🗑️</button>
        </div>
      `;

      noteArticle
        .querySelector('.note-content-preview')
        .addEventListener('click', () => {
          openModal(noteArticle);
        });

      noteArticle
        .querySelector('.btn-delete')
        .addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Yakin ingin menghapus catatan ini?')) {
            const success = await deleteNote(id);
            if (success) {
              noteArticle.remove();
              if (document.querySelectorAll('.note-item').length === 0) {
                noteList.innerHTML =
                  '<p style="text-align:center;color:#666;">📭 Belum ada catatan. Tambahkan catatan baru!</p>';
              }
            } else {
              alert('Gagal menghapus catatan.');
            }
          }
        });

      return noteArticle;
    }

    function openModal(noteElement) {
      activeNoteElement = noteElement;
      activeNoteId = noteElement.dataset.id;
      modalTitle.textContent = noteElement.dataset.title;
      modalBody.textContent = noteElement.dataset.content;
      noteModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      noteModal.classList.remove('active');
      activeNoteElement = null;
      activeNoteId = null;
      document.body.style.overflow = '';
    }

    function openEditModal() {
      if (!activeNoteElement || !activeNoteId) return;
      editTitle.value = activeNoteElement.dataset.title;
      editContent.value = activeNoteElement.dataset.content;
      editImportant.checked = activeNoteElement.classList.contains('important');
      noteModal.classList.remove('active');
      editModal.classList.add('active');
    }

    function closeEditModal() {
      editModal.classList.remove('active');
      noteModal.classList.add('active');
    }

    async function loadNotes() {
      const notes = await fetchNotes();
      noteList.innerHTML = '';

      if (notes.length === 0) {
        noteList.innerHTML =
          '<p style="text-align:center;color:#666;">📭 Belum ada catatan. Tambahkan catatan baru!</p>';
        return;
      }

      notes.forEach((note) => {
        const noteElement = createNoteElement(
          note.title,
          note.content,
          note.is_important,
          note.id
        );
        noteList.appendChild(noteElement);
      });
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    btnAddNote.addEventListener('click', function () {
      noteFormSection.classList.toggle('hidden');
      if (!noteFormSection.classList.contains('hidden')) {
        document.getElementById('title').focus();
      }
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        noteFormSection.classList.add('hidden');
        noteForm.reset();
      });
    }

    noteForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const title = document.getElementById('title').value.trim();
      const content = document.getElementById('note-content').value.trim();
      const isFavorite = document.getElementById('note-favorite').checked;

      if (!title || !content) {
        alert('Judul dan isi catatan harus diisi!');
        return;
      }

      const submitBtn = this.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Menyimpan...';

      const newNote = await addNote(title, content, isFavorite);

      if (newNote) {
        const noteElement = createNoteElement(
          newNote.title,
          newNote.content,
          newNote.is_important,
          newNote.id
        );
        noteList.prepend(noteElement);

        const emptyMessage = noteList.querySelector('p');
        if (emptyMessage && emptyMessage.style.textAlign === 'center') {
          emptyMessage.remove();
        }

        noteForm.reset();
        noteFormSection.classList.add('hidden');
      } else {
        alert('Gagal menyimpan catatan. Silakan coba lagi.');
      }

      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Simpan Catatan';
    });

    modalEditBtn.addEventListener('click', openEditModal);
    modalCloseBtn.addEventListener('click', closeModal);

    noteModal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (editModal.classList.contains('active')) {
          closeEditModal();
        } else if (noteModal.classList.contains('active')) {
          closeModal();
        }
      }
    });

    editCancelBtn.addEventListener('click', closeEditModal);

    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newTitle = editTitle.value.trim();
      const newContent = editContent.value.trim();
      const newImportant = editImportant.checked;

      if (!newTitle || !newContent) {
        alert('Judul dan isi catatan harus diisi!');
        return;
      }

      const updatedNote = await updateNote(
        activeNoteId,
        newTitle,
        newContent,
        newImportant
      );

      if (!updatedNote) {
        alert('Gagal mengupdate catatan.');
        return;
      }

      activeNoteElement.dataset.title = updatedNote.title;
      activeNoteElement.dataset.content = updatedNote.content;
      activeNoteElement.querySelector('.note-title').textContent = updatedNote.title;
      activeNoteElement.querySelector('.note-body').textContent = updatedNote.content;

      const previewDiv = activeNoteElement.querySelector('.note-content-preview');
      let existingBadge = previewDiv.querySelector('.badge-important');

      if (updatedNote.is_important) {
        if (!existingBadge) {
          const badge = document.createElement('span');
          badge.className = 'badge-important';
          badge.textContent = '⭐ Penting';
          previewDiv.appendChild(badge);
        }
        activeNoteElement.classList.add('important');
      } else {
        if (existingBadge) {
          existingBadge.remove();
        }
        activeNoteElement.classList.remove('important');
      }

      editModal.classList.remove('active');
      modalTitle.textContent = updatedNote.title;
      modalBody.textContent = updatedNote.content;
      noteModal.classList.add('active');
    });

    searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const keyword = searchInput.value.toLowerCase().trim();

      if (!keyword) {
        document.querySelectorAll('.note-item').forEach((note) => (note.style.display = ''));
        return;
      }

      let found = false;
      document.querySelectorAll('.note-item').forEach((note) => {
        const title = note.dataset.title.toLowerCase();
        const content = note.dataset.content.toLowerCase();
        const match = title.includes(keyword) || content.includes(keyword);
        note.style.display = match ? '' : 'none';
        if (match) found = true;
      });

      let noResultMsg = document.getElementById('no-search-result');
      if (!found) {
        if (!noResultMsg) {
          noResultMsg = document.createElement('p');
          noResultMsg.id = 'no-search-result';
          noResultMsg.style.cssText = 'text-align:center;color:#666;padding:20px;';
          noResultMsg.textContent = `🔍 Tidak ada catatan dengan kata "${keyword}"`;
          noteList.appendChild(noResultMsg);
        }
      } else if (noResultMsg) {
        noResultMsg.remove();
      }
    });

    // ============================================
    // LOGOUT BUTTON
    // ============================================
    document.getElementById('btn-logout').addEventListener('click', async function () {
      if (confirm('Apakah Anda yakin ingin keluar?')) {
        try {
          await supabaseClient.auth.signOut();
          window.location.href = 'https://hendrizhuo6-lab.github.io/login/login.html';
        } catch (error) {
          console.error('❌ Logout error:', error);
          alert('Gagal logout. Silakan coba lagi.');
        }
      }
    });

    // ============================================
    // LOAD DATA
    // ============================================
    await loadNotes();
    console.log('✅ Notes loaded successfully');

  } catch (error) {
    console.error('❌ Application error:', error);
    alert('Terjadi kesalahan. Silakan refresh halaman.');
    window.location.href = 'https://hendrizhuo6-lab.github.io/login/login.html';
  }
});

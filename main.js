document.addEventListener('DOMContentLoaded', async function () {
  // ============================================
  // CEK SUPABASE
  // ============================================

  if (typeof supabaseClient === 'undefined') {
    console.error('❌ Supabase client not found!');
    alert('Error: Supabase tidak terhubung.');
    return;
  }

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

      return data || [];
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }

  async function addNote(title, content, isImportant) {
    try {
      const { data, error } = await supabaseClient
        .from('notes')
        .insert([
          {
            title: title,
            content: content,
            is_important: isImportant,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      return data?.[0] || null;
    } catch (error) {
      console.error('Error adding note:', error);
      return null;
    }
  }

  async function updateNote(id, title, content, isImportant) {
    try {
      const { data, error } = await supabaseClient
        .from('notes')
        .update({
          title: title,
          content: content,
          is_important: isImportant,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      return data?.[0] || null;
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
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function createNoteElement(title, content, isImportant, id) {
    const noteArticle = document.createElement('article');

    noteArticle.classList.add('note-item');

    if (isImportant) {
      noteArticle.classList.add('important');
    }

    noteArticle.dataset.title = title;
    noteArticle.dataset.content = content;
    noteArticle.dataset.id = id;

    noteArticle.innerHTML = `
      <div class="note-content-preview">
        <h3 class="note-title">${escapeHtml(title)}</h3>

        <p class="note-body">
          ${escapeHtml(content)}
        </p>

        ${
          isImportant
            ? '<span class="badge-important">⭐ Penting</span>'
            : ''
        }
      </div>

      <div class="note-actions">
        <button
          type="button"
          class="btn-delete"
          title="Hapus catatan"
        >
          🗑️
        </button>
      </div>
    `;

    // Buka detail
    noteArticle
      .querySelector('.note-content-preview')
      .addEventListener('click', () => {
        openModal(noteArticle);
      });

    // Hapus
    noteArticle
      .querySelector('.btn-delete')
      .addEventListener('click', async function (e) {
        e.stopPropagation();

        const yakin = confirm(
          'Yakin ingin menghapus catatan ini?'
        );

        if (!yakin) return;

        const success = await deleteNote(id);

        if (success) {
          noteArticle.remove();

          if (
            document.querySelectorAll('.note-item').length === 0
          ) {
            noteList.innerHTML = `
              <p style="text-align:center;color:#666;">
                📭 Belum ada catatan. Tambahkan catatan baru!
              </p>
            `;
          }
        } else {
          alert('Gagal menghapus catatan.');
        }
      });

    return noteArticle;
  }

  // ============================================
  // MODAL
  // ============================================

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

    editImportant.checked =
      activeNoteElement.classList.contains('important');

    noteModal.classList.remove('active');
    editModal.classList.add('active');
  }

  function closeEditModal() {
    editModal.classList.remove('active');
    noteModal.classList.add('active');
  }

  // ============================================
  // LOAD NOTES
  // ============================================

  async function loadNotes() {
    const notes = await fetchNotes();

    noteList.innerHTML = '';

    if (notes.length === 0) {
      noteList.innerHTML = `
        <p style="text-align:center;color:#666;">
          📭 Belum ada catatan. Tambahkan catatan baru!
        </p>
      `;

      return;
    }

    notes.forEach(function (note) {
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
  // TAMBAH CATATAN
  // ============================================

  if (btnAddNote) {
    btnAddNote.addEventListener('click', function () {
      noteFormSection.classList.toggle('hidden');

      if (!noteFormSection.classList.contains('hidden')) {
        const titleInput = document.getElementById('title');

        if (titleInput) {
          titleInput.focus();
        }
      }
    });
  }

  // ============================================
  // BATAL TAMBAH CATATAN
  // ============================================

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      noteFormSection.classList.add('hidden');

      if (noteForm) {
        noteForm.reset();
      }
    });
  }

  // ============================================
  // SUBMIT CATATAN
  // ============================================

  if (noteForm) {
    noteForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const titleInput = document.getElementById('title');
      const contentInput = document.getElementById('note-content');
      const favoriteInput =
        document.getElementById('note-favorite');

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      const isImportant = favoriteInput
        ? favoriteInput.checked
        : false;

      if (!title || !content) {
        alert('Judul dan isi catatan harus diisi!');
        return;
      }

      const submitBtn = this.querySelector(
        'button[type="submit"]'
      );

      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Menyimpan...';

      const newNote = await addNote(
        title,
        content,
        isImportant
      );

      if (newNote) {
        const noteElement = createNoteElement(
          newNote.title,
          newNote.content,
          newNote.is_important,
          newNote.id
        );

        // Hapus pesan kosong
        const emptyMessage = noteList.querySelector('p');

        if (emptyMessage) {
          emptyMessage.remove();
        }

        noteList.prepend(noteElement);

        noteForm.reset();
        noteFormSection.classList.add('hidden');
      } else {
        alert(
          'Gagal menyimpan catatan. Silakan coba lagi.'
        );
      }

      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Simpan Catatan';
    });
  }

  // ============================================
  // EDIT
  // ============================================

  if (modalEditBtn) {
    modalEditBtn.addEventListener(
      'click',
      openEditModal
    );
  }

  // ============================================
  // CLOSE MODAL
  // ============================================

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener(
      'click',
      closeModal
    );
  }

  if (noteModal) {
    noteModal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeModal();
      }
    });
  }

  // ============================================
  // ESCAPE
  // ============================================

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    if (
      editModal &&
      editModal.classList.contains('active')
    ) {
      closeEditModal();
    } else if (
      noteModal &&
      noteModal.classList.contains('active')
    ) {
      closeModal();
    }
  });

  // ============================================
  // BATAL EDIT
  // ============================================

  if (editCancelBtn) {
    editCancelBtn.addEventListener(
      'click',
      closeEditModal
    );
  }

  // ============================================
  // UPDATE CATATAN
  // ============================================

  if (editForm) {
    editForm.addEventListener(
      'submit',
      async function (e) {
        e.preventDefault();

        const newTitle = editTitle.value.trim();
        const newContent = editContent.value.trim();
        const newImportant = editImportant.checked;

        if (!newTitle || !newContent) {
          alert(
            'Judul dan isi catatan harus diisi!'
          );
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

        // Update data
        activeNoteElement.dataset.title =
          updatedNote.title;

        activeNoteElement.dataset.content =
          updatedNote.content;

        // Update tampilan
        activeNoteElement.querySelector(
          '.note-title'
        ).textContent = updatedNote.title;

        activeNoteElement.querySelector(
          '.note-body'
        ).textContent = updatedNote.content;

        const previewDiv =
          activeNoteElement.querySelector(
            '.note-content-preview'
          );

        let existingBadge =
          previewDiv.querySelector(
            '.badge-important'
          );

        if (updatedNote.is_important) {
          if (!existingBadge) {
            const badge =
              document.createElement('span');

            badge.className = 'badge-important';
            badge.textContent = '⭐ Penting';

            previewDiv.appendChild(badge);
          }

          activeNoteElement.classList.add(
            'important'
          );
        } else {
          if (existingBadge) {
            existingBadge.remove();
          }

          activeNoteElement.classList.remove(
            'important'
          );
        }

        // Kembali ke modal detail
        editModal.classList.remove('active');

        modalTitle.textContent =
          updatedNote.title;

        modalBody.textContent =
          updatedNote.content;

        noteModal.classList.add('active');
      }
    );
  }

  // ============================================
  // SEARCH
  // ============================================

  if (searchForm) {
    searchForm.addEventListener(
      'submit',
      function (event) {
        event.preventDefault();

        const keyword =
          searchInput.value
            .toLowerCase()
            .trim();

        const notes =
          document.querySelectorAll('.note-item');

        let found = false;

        notes.forEach(function (note) {
          const title =
            note.dataset.title.toLowerCase();

          const content =
            note.dataset.content.toLowerCase();

          const match =
            !keyword ||
            title.includes(keyword) ||
            content.includes(keyword);

          note.style.display =
            match ? '' : 'none';

          if (match) {
            found = true;
          }
        });

        let noResultMsg =
          document.getElementById(
            'no-search-result'
          );

        if (keyword && !found) {
          if (!noResultMsg) {
            noResultMsg =
              document.createElement('p');

            noResultMsg.id =
              'no-search-result';

            noResultMsg.style.cssText =
              'text-align:center;color:#666;padding:20px;';

            noResultMsg.textContent =
              `🔍 Tidak ada catatan dengan kata "${keyword}"`;

            noteList.appendChild(noResultMsg);
          }
        } else if (noResultMsg) {
          noResultMsg.remove();
        }
      }
    );
  }

  // ============================================
  // LOAD DATA
  // ============================================

  await loadNotes();

  console.log(
    '✅ Mode catatan aktif - tanpa login/auth'
  );
});

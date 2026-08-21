document.addEventListener('DOMContentLoaded', async function () {

  // ============================================
  // CEK SUPABASE SUDAH TERHUBUNG
  // ============================================

  if (typeof supabaseClient === 'undefined') {
    console.error('❌ Supabase client tidak ditemukan. Cek supabase-config.js');
    return;
  }

  // ============================================
  // CEK SESI LOGIN — kalau belum login, tendang ke login.html
  // ============================================

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const currentUser = session.user;

  // Pantau perubahan sesi (misalnya token expired / logout dari tab lain)
  supabaseClient.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT' || !newSession) {
      window.location.href = 'login.html';
    }
  });

  // ============================================
  // ELEMEN-ELEMEN DOM
  // ============================================

  const userEmailEl = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');

  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const importantFilter = document.getElementById('important-filter');
  const newNoteBtn = document.getElementById('new-note-btn');

  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const errorState = document.getElementById('error-state');
  const notesGrid = document.getElementById('notes-grid');

  const noteModal = document.getElementById('note-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const noteForm = document.getElementById('note-form');
  const noteIdInput = document.getElementById('note-id');
  const noteTitleInput = document.getElementById('note-title');
  const noteCategoryInput = document.getElementById('note-category');
  const noteContentInput = document.getElementById('note-content');
  const noteImportantInput = document.getElementById('note-important');
  const categorySuggestions = document.getElementById('category-suggestions');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  const deleteModal = document.getElementById('delete-modal');
  const deleteNoteTitle = document.getElementById('delete-note-title');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

  // State lokal: semua catatan hasil fetch, sebelum difilter
  let allNotes = [];
  let noteIdPendingDelete = null;

  userEmailEl.textContent = currentUser.email;

  // ============================================
  // HELPER
  // ============================================

  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + (type === 'error' ? 'form-message-error' : 'form-message-success');
    el.classList.remove('hidden');
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================
  // LOGOUT
  // ============================================

  logoutBtn.addEventListener('click', async function () {
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Keluar...';
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
  });

  // ============================================
  // MUAT CATATAN DARI SUPABASE
  // ============================================

  async function loadNotes() {
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    notesGrid.innerHTML = '';

    const { data, error } = await supabaseClient
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    loadingState.classList.add('hidden');

    if (error) {
      errorState.textContent = '❌ Gagal memuat catatan: ' + error.message;
      errorState.classList.remove('hidden');
      return;
    }

    allNotes = data || [];
    populateCategoryFilter();
    renderNotes();
  }

  // Isi dropdown filter kategori berdasarkan kategori yang benar-benar dipakai
  function populateCategoryFilter() {
    const selected = categoryFilter.value;
    const categories = Array.from(
      new Set(allNotes.map(n => (n.category || 'Umum').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    categoryFilter.innerHTML = '<option value="">Semua Kategori</option>' +
      categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    categoryFilter.value = categories.includes(selected) ? selected : '';

    categorySuggestions.innerHTML = categories
      .map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
  }

  // ============================================
  // RENDER CATATAN (dengan filter search/kategori/penting)
  // ============================================

  function renderNotes() {
    const keyword = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const onlyImportant = importantFilter.checked;

    const filtered = allNotes.filter(function (note) {
      const matchKeyword = !keyword ||
        note.title.toLowerCase().includes(keyword) ||
        note.content.toLowerCase().includes(keyword);
      const matchCategory = !category || (note.category || 'Umum') === category;
      const matchImportant = !onlyImportant || note.is_important;
      return matchKeyword && matchCategory && matchImportant;
    });

    notesGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.textContent = allNotes.length === 0
        ? 'Belum ada catatan. Yuk buat catatan pertamamu!'
        : 'Tidak ada catatan yang cocok dengan pencarian/filter ini.';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    filtered.forEach(function (note) {
      const card = document.createElement('div');
      card.className = 'note-card' + (note.is_important ? ' note-card-important' : '');
      card.innerHTML = `
        <div class="note-card-top">
          <span class="note-card-title">${escapeHtml(note.title)}</span>
          ${note.is_important ? '<span class="note-star" title="Penting">⭐</span>' : ''}
        </div>
        <span class="note-category-badge">${escapeHtml(note.category || 'Umum')}</span>
        <div class="note-card-content">${escapeHtml(note.content)}</div>
        <div class="note-card-footer">
          <span class="note-date">${formatDate(note.updated_at || note.created_at)}</span>
          <div class="note-card-actions">
            <button class="note-action-btn edit-btn" title="Edit" data-id="${note.id}">✏️</button>
            <button class="note-action-btn delete-btn" title="Hapus" data-id="${note.id}">🗑️</button>
          </div>
        </div>
      `;
      notesGrid.appendChild(card);
    });

    // Pasang event listener untuk tombol edit & hapus di setiap kartu
    notesGrid.querySelectorAll('.edit-btn').forEach(function (btn) {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    notesGrid.querySelectorAll('.delete-btn').forEach(function (btn) {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
  }

  searchInput.addEventListener('input', renderNotes);
  categoryFilter.addEventListener('change', renderNotes);
  importantFilter.addEventListener('change', renderNotes);

  // ============================================
  // MODAL TAMBAH / EDIT CATATAN
  // ============================================

  function openNewModal() {
    modalTitle.textContent = 'Catatan Baru';
    noteForm.reset();
    noteIdInput.value = '';
    modalMessage.classList.add('hidden');
    modalSaveBtn.textContent = 'Simpan';
    noteModal.classList.remove('hidden');
    noteTitleInput.focus();
  }

  function openEditModal(id) {
    const note = allNotes.find(n => String(n.id) === String(id));
    if (!note) return;

    modalTitle.textContent = 'Edit Catatan';
    noteIdInput.value = note.id;
    noteTitleInput.value = note.title;
    noteCategoryInput.value = note.category || '';
    noteContentInput.value = note.content;
    noteImportantInput.checked = !!note.is_important;
    modalMessage.classList.add('hidden');
    modalSaveBtn.textContent = 'Simpan Perubahan';
    noteModal.classList.remove('hidden');
    noteTitleInput.focus();
  }

  function closeNoteModal() {
    noteModal.classList.add('hidden');
  }

  newNoteBtn.addEventListener('click', openNewModal);
  modalCloseBtn.addEventListener('click', closeNoteModal);
  modalCancelBtn.addEventListener('click', closeNoteModal);
  noteModal.addEventListener('click', function (e) {
    if (e.target === noteModal) closeNoteModal();
  });

  // ============================================
  // SIMPAN CATATAN (insert / update)
  // ============================================

  noteForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const id = noteIdInput.value;
    const payload = {
      title: noteTitleInput.value.trim(),
      category: noteCategoryInput.value.trim() || 'Umum',
      content: noteContentInput.value.trim(),
      is_important: noteImportantInput.checked,
      updated_at: new Date().toISOString()
    };

    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = 'Menyimpan...';

    let error;

    if (id) {
      // UPDATE catatan yang sudah ada
      ({ error } = await supabaseClient
        .from('notes')
        .update(payload)
        .eq('id', id));
    } else {
      // INSERT catatan baru — user_id wajib diisi manual sesuai RLS
      ({ error } = await supabaseClient
        .from('notes')
        .insert({ ...payload, user_id: currentUser.id }));
    }

    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = id ? 'Simpan Perubahan' : 'Simpan';

    if (error) {
      showMessage(modalMessage, '❌ Gagal menyimpan: ' + error.message, 'error');
      return;
    }

    closeNoteModal();
    await loadNotes();
  });

  // ============================================
  // HAPUS CATATAN
  // ============================================

  function openDeleteModal(id) {
    const note = allNotes.find(n => String(n.id) === String(id));
    if (!note) return;

    noteIdPendingDelete = id;
    deleteNoteTitle.textContent = note.title;
    deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    noteIdPendingDelete = null;
  }

  deleteCancelBtn.addEventListener('click', closeDeleteModal);
  deleteModal.addEventListener('click', function (e) {
    if (e.target === deleteModal) closeDeleteModal();
  });

  deleteConfirmBtn.addEventListener('click', async function () {
    if (!noteIdPendingDelete) return;

    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = 'Menghapus...';

    const { error } = await supabaseClient
      .from('notes')
      .delete()
      .eq('id', noteIdPendingDelete);

    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = 'Ya, Hapus';

    if (error) {
      errorState.textContent = '❌ Gagal menghapus: ' + error.message;
      errorState.classList.remove('hidden');
      closeDeleteModal();
      return;
    }

    closeDeleteModal();
    await loadNotes();
  });

  // ============================================
  // MULAI: muat catatan pertama kali
  // ============================================

  await loadNotes();

});

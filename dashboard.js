document.addEventListener("DOMContentLoaded", async function () {
  if (typeof supabaseClient === "undefined") {
    console.error("❌ Supabase client tidak ditemukan. Cek supabase-config.js");
    return;
  }

  // SESI LOGIN
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  const currentUser = session.user;

  supabaseClient.auth.onAuthStateChange((event, newSession) => {
    if (event === "SIGNED_OUT" || !newSession) {
      window.location.href = "login.html";
    }
  });

  // ELEMEN MAIN DASHBOARD
  const userEmailEl = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout-btn");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const importantFilter = document.getElementById("important-filter");
  const newNoteBtn = document.getElementById("new-note-btn");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const errorState = document.getElementById("error-state");
  const notesGrid = document.getElementById("notes-grid");
  const categorySuggestions = document.getElementById("category-suggestions");

  // ELEMEN MODAL TAMBAH
  const addNoteModal = document.getElementById("add-note-modal");
  const addNoteForm = document.getElementById("add-note-form");
  const addNoteTitleInput = document.getElementById("add-note-title");
  const addNoteCategoryInput = document.getElementById("add-note-category");
  const addNoteContentInput = document.getElementById("add-note-content");
  const addNoteImportantInput = document.getElementById("add-note-important");
  const addModalMessage = document.getElementById("add-modal-message");
  const addModalCloseBtn = document.getElementById("add-modal-close-btn");
  const addModalCancelBtn = document.getElementById("add-modal-cancel-btn");
  const addModalSaveBtn = document.getElementById("add-modal-save-btn");

  // ELEMEN MODAL EDIT
  const editNoteModal = document.getElementById("edit-note-modal");
  const editNoteForm = document.getElementById("edit-note-form");
  const editNoteIdInput = document.getElementById("edit-note-id");
  const editNoteTitleInput = document.getElementById("edit-note-title");
  const editNoteCategoryInput = document.getElementById("edit-note-category");
  const editNoteContentInput = document.getElementById("editor");
  const editNoteImportantInput = document.getElementById("edit-note-important");
  const editBgColorPicker = document.getElementById("bgColorPicker");
  const editModalMessage = document.getElementById("edit-modal-message");
  const editModalCloseBtn = document.getElementById("edit-close-btn");
  const editModalCancelBtn = document.getElementById("modal-cancel-btn");
  const editModalSaveBtn = document.getElementById("modal-save-btn");
  const editBtnDelete = document.getElementById("edit-delete-btn");
  const editBtnMinimize = document.getElementById("btnMinimize");
  const editModalNewBtn = document.getElementById("modal-new-btn");

  // TOOLBAR FORMATTING EDIT
  const btnFmtBold = document.getElementById("btn-bold");
  const btnFmtItalic = document.getElementById("btn-italic");
  const btnFmtUnderline = document.getElementById("btn-underline");
  const btnFmtStrike = document.getElementById("btn-strike");
  const btnFmtList = document.getElementById("btn-list");
  const btnFmtImage = document.getElementById("btn-image");
  const editImageInput = document.getElementById("imageInput");

  // ELEMEN MODAL HAPUS
  const deleteModal = document.getElementById("delete-modal");
  const deleteNoteTitle = document.getElementById("delete-note-title");
  const deleteCancelBtn = document.getElementById("delete-cancel-btn");
  const deleteConfirmBtn = document.getElementById("delete-confirm-btn");

  // STATE LOKAL
  let allNotes = [];
  let noteIdPendingDelete = null;

  userEmailEl.textContent = currentUser.email;

  // HELPER
  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className =
      "form-message " +
      (type === "error" ? "form-message-error" : "form-message-success");
    el.classList.remove("hidden");
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function executeCmd(command, value = null) {
    document.execCommand(command, false, value);
  }

  // LOGOUT
  logoutBtn.addEventListener("click", async function () {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Keluar...";
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });

  // LOAD NOTES
  async function loadNotes() {
    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");
    errorState.classList.add("hidden");
    notesGrid.innerHTML = "";

    const { data, error } = await supabaseClient
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    loadingState.classList.add("hidden");

    if (error) {
      errorState.textContent = "❌ Gagal memuat catatan: " + error.message;
      errorState.classList.remove("hidden");
      return;
    }

    allNotes = data || [];
    populateCategoryFilter();
    renderNotes();
  }

  function populateCategoryFilter() {
    const selected = categoryFilter.value;
    const categories = Array.from(
      new Set(
        allNotes.map((n) => (n.category || "Umum").trim()).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    categoryFilter.innerHTML =
      '<option value="">Semua Kategori</option>' +
      categories
        .map(
          (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`,
        )
        .join("");

    categoryFilter.value = categories.includes(selected) ? selected : "";

    if (categorySuggestions) {
      categorySuggestions.innerHTML = categories
        .map((c) => `<option value="${escapeHtml(c)}"></option>`)
        .join("");
    }
  }

  // RENDER NOTES
  function renderNotes() {
    const keyword = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const onlyImportant = importantFilter.checked;

    const filtered = allNotes.filter(function (note) {
      const titleMatch = note.title ? note.title.toLowerCase().includes(keyword) : false;
      const contentMatch = note.content ? note.content.toLowerCase().includes(keyword) : false;
      const matchKeyword = !keyword || titleMatch || contentMatch;
      const matchCategory = !category || (note.category || "Umum") === category;
      const matchImportant = !onlyImportant || note.is_important;
      return matchKeyword && matchCategory && matchImportant;
    });

    notesGrid.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.textContent =
        allNotes.length === 0
          ? "Belum ada catatan. Yuk buat catatan pertamamu!"
          : "Tidak ada catatan yang cocok dengan pencarian/filter ini.";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    filtered.forEach(function (note) {
      const card = document.createElement("div");
      card.className =
        "note-card" + (note.is_important ? " note-card-important" : "");
      if (note.color) card.style.backgroundColor = note.color;

      card.innerHTML = `
        <div class="note-card-top">
          <span class="note-card-title">${escapeHtml(note.title || "Catatan")}</span>
          ${note.is_important ? '<span class="note-star" title="Penting">⭐</span>' : ""}
        </div>
        <span class="note-category-badge">${escapeHtml(note.category || "Umum")}</span>
        <div class="note-card-content">${note.content}</div>
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

    notesGrid.querySelectorAll(".edit-btn").forEach(function (btn) {
      btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    notesGrid.querySelectorAll(".delete-btn").forEach(function (btn) {
      btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
    });
  }

  searchInput.addEventListener("input", renderNotes);
  categoryFilter.addEventListener("change", renderNotes);
  importantFilter.addEventListener("change", renderNotes);

  // KONTROL MODAL TAMBAH
  function openAddModal() {
    addNoteForm.reset();
    addModalMessage.classList.add("hidden");
    addNoteModal.classList.remove("hidden");
    addNoteTitleInput.focus();
  }

  function closeAddModal() {
    addNoteModal.classList.add("hidden");
  }

  newNoteBtn.addEventListener("click", openAddModal);
  addModalCloseBtn.addEventListener("click", closeAddModal);
  addModalCancelBtn.addEventListener("click", closeAddModal);
  addNoteModal.addEventListener("click", (e) => {
    if (e.target === addNoteModal) closeAddModal();
  });

  addNoteForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const payload = {
      title: addNoteTitleInput.value.trim(),
      category: addNoteCategoryInput.value.trim() || "Umum",
      content: addNoteContentInput.value.trim(),
      is_important: addNoteImportantInput.checked,
      user_id: currentUser.id,
    };

    addModalSaveBtn.disabled = true;
    addModalSaveBtn.textContent = "Menyimpan...";

    const { error } = await supabaseClient.from("notes").insert(payload);

    addModalSaveBtn.disabled = false;
    addModalSaveBtn.textContent = "Simpan";

    if (error) {
      showMessage(
        addModalMessage,
        "❌ Gagal menyimpan: " + error.message,
        "error",
      );
      return;
    }

    closeAddModal();
    await loadNotes();
  });

  // KONTROL MODAL EDIT
  function openEditModal(id) {
    const note = allNotes.find((n) => String(n.id) === String(id));
    if (!note) return;

    editNoteIdInput.value = note.id;

    if (editNoteTitleInput) {
      editNoteTitleInput.value = note.title || "catatan";
    }

    if (editNoteCategoryInput) {
      editNoteCategoryInput.value = note.category || "";
    }

    editNoteContentInput.innerHTML = note.content || "";
    editNoteImportantInput.checked = !!note.is_important;
    editBgColorPicker.value = note.color || "#fff7d1";

    const stickyEl = editNoteModal.querySelector(".sticky-note");
    if (stickyEl) {
      stickyEl.style.setProperty("--bg-color", note.color || "#fff7d1");
      stickyEl.classList.remove("minimized");
    }

    editModalMessage.classList.add("hidden");
    editNoteModal.classList.remove("hidden");
    
    editNoteContentInput.focus();
  }

  function closeEditModal() {
    editNoteModal.classList.add("hidden");
  }

  editModalCloseBtn.addEventListener("click", closeEditModal);
  editModalCancelBtn.addEventListener("click", closeEditModal);

  // AMAN DARI AUTO-CLOSE SAAT RESIZE / DRAG
  let isDragging = false;
  editNoteModal.addEventListener("mousedown", (e) => {
    isDragging = e.target !== editNoteModal;
  });
  editNoteModal.addEventListener("click", (e) => {
    if (e.target === editNoteModal && !isDragging) closeEditModal();
  });

  if (editBtnMinimize) {
    editBtnMinimize.addEventListener("click", () => {
      const stickyEl = editNoteModal.querySelector(".sticky-note");
      if (stickyEl) stickyEl.classList.toggle("minimized");
    });
  }
  if (editBtnDelete) {
    editBtnDelete.addEventListener("click", () => {
      const id = editNoteIdInput.value;
      closeEditModal();
      openDeleteModal(id);
    });
  }
  if (editModalNewBtn) {
    editModalNewBtn.addEventListener("click", () => {
      closeEditModal();
      openAddModal();
    });
  }
  editBgColorPicker.addEventListener("input", (e) => {
    const stickyEl = editNoteModal.querySelector(".sticky-note");
    if (stickyEl) stickyEl.style.setProperty("--bg-color", e.target.value);
  });

  // EVENT FORMATTING TOOLBAR
  btnFmtBold.addEventListener("click", () => executeCmd("bold"));
  btnFmtItalic.addEventListener("click", () => executeCmd("italic"));
  btnFmtUnderline.addEventListener("click", () => executeCmd("underline"));
  btnFmtStrike.addEventListener("click", () => executeCmd("strikeThrough"));
  btnFmtList.addEventListener("click", () => executeCmd("insertUnorderedList"));
  btnFmtImage.addEventListener("click", () => editImageInput.click());

  editImageInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        executeCmd("insertImage", event.target.result);
      };
      reader.readAsDataURL(file);
    }
  });

  // SUBMIT EDIT
  editNoteForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = editNoteIdInput.value;

    const plainText = editNoteContentInput.innerText.trim();
    const defaultTitle = plainText.length > 0 
      ? plainText.substring(0, 20) + (plainText.length > 20 ? '...' : '')
      : 'Catatan Tanpa Judul';

    const payload = {
      title: editNoteTitleInput ? editNoteTitleInput.value.trim() : defaultTitle,
      category: editNoteCategoryInput ? editNoteCategoryInput.value.trim() : "Umum",
      content: editNoteContentInput.innerHTML.trim(),
      is_important: editNoteImportantInput.checked,
      color: editBgColorPicker.value,
      updated_at: new Date().toISOString(),
    };

    editModalSaveBtn.disabled = true;
    editModalSaveBtn.textContent = "Menyimpan...";

    const { error } = await supabaseClient
      .from("notes")
      .update(payload)
      .eq("id", id);

    editModalSaveBtn.disabled = false;
    editModalSaveBtn.textContent = "💾";

    if (error) {
      showMessage(
        editModalMessage,
        "❌ Gagal menyimpan: " + error.message,
        "error",
      );
      return;
    }

    closeEditModal();
    await loadNotes();
  });

  // KONTROL MODAL HAPUS
  function openDeleteModal(id) {
    const note = allNotes.find((n) => String(n.id) === String(id));
    if (!note) return;

    noteIdPendingDelete = id;
    deleteNoteTitle.textContent = note.title || "Catatan Ini";
    deleteModal.classList.remove("hidden");
  }

  function closeDeleteModal() {
    deleteModal.classList.add("hidden");
    noteIdPendingDelete = null;
  }

  deleteCancelBtn.addEventListener("click", closeDeleteModal);
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  deleteConfirmBtn.addEventListener("click", async function () {
    if (!noteIdPendingDelete) return;

    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = "Menghapus...";

    const { error } = await supabaseClient
      .from("notes")
      .delete()
      .eq("id", noteIdPendingDelete);

    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = "Ya, Hapus";

    if (error) {
      errorState.textContent = "❌ Gagal menghapus: " + error.message;
      errorState.classList.remove("hidden");
      closeDeleteModal();
      return;
    }

    closeDeleteModal();
    await loadNotes();
  });

  // START
  await loadNotes();
});

// EVENT PASTE PERFEKTIF (RAPI, PERTAHANKAN ENTER & TENTUKAN SUSUNAN TEKS)
const editor = document.getElementById('editor');

if (editor) {
  editor.addEventListener('paste', function (e) {
    e.preventDefault(); // Batalkan paste bawaan browser

    // Ambil data teks polos dari clipboard (menghilangkan style/margin raksasa dari web luar)
    const textData = e.clipboardData.getData('text/plain');

    if (textData) {
      // Ubah karakter newline (\n) menjadi tag baris <br> agar susunan baris tetap sama
      const formattedText = textData.replace(/\r\n|\r|\n/g, '<br>');

      // Masukkan teks ke dalam editor
      document.execCommand('insertHTML', false, formattedText);
    }
  });
}

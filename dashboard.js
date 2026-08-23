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
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const errorState = document.getElementById("error-state");
  const notesGrid = document.getElementById("notes-grid");
  const categorySuggestions = document.getElementById("category-suggestions");

  // ELEMEN COMPOSE BOX (Tambah Catatan)
  const composeBox = document.getElementById("compose-box");
  const addNoteForm = document.getElementById("add-note-form");
  const addNoteTitleInput = document.getElementById("add-note-title");
  const addNoteContentInput = document.getElementById("add-note-content");
  const addNoteCategoryInput = document.getElementById("add-note-category");
  const composeQuickIcons = document.getElementById("compose-quick-icons");
  const composeToolbar = document.getElementById("compose-toolbar");
  const quickImportantBtn = document.getElementById("quick-important-btn");
  const quickPaletteBtn = document.getElementById("quick-palette-btn");
  const quickImageBtn = document.getElementById("quick-image-btn");
  const addPaletteBtn = document.getElementById("add-palette-btn");
  const addImportantBtn = document.getElementById("add-important-btn");
  const addColorWrapper = document.getElementById("addColorWrapper");
  const addColorPopover = document.getElementById("add-color-popover");
  const addColorSwatches = document.getElementById("add-color-swatches");

  // ELEMEN MODAL EDIT
  const editNoteModal = document.getElementById("edit-note-modal");
  const editNoteForm = document.getElementById("edit-note-form");
  const editNoteIdInput = document.getElementById("edit-note-id");
  const editNoteTitleInput = document.getElementById("edit-note-title");
  const editNoteCategoryInput = document.getElementById("edit-note-category");
  const editNoteContentInput = document.getElementById("editor");
  const editNoteImportantInput = document.getElementById("edit-note-important");
  const editBgColorPicker = document.getElementById("bgColorPicker");
  const btnPaletteToggle = document.getElementById("btnPaletteToggle");
  const editColorPopover = document.getElementById("edit-color-popover");
  const editColorSwatches = document.getElementById("edit-color-swatches");
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
  let selectedAddColor = "#ffffff";
  let openQuickColorPopover = null; // popover warna cepat yang sedang terbuka (di kartu)

  userEmailEl.textContent = currentUser.email;

  // PALET WARNA — gaya Google Keep
  const NOTE_COLORS = [
    { name: "Default", value: "#ffffff" },
    { name: "Coral", value: "#f28b82" },
    { name: "Persik", value: "#fbbc04" },
    { name: "Pasir", value: "#fff475" },
    { name: "Mint", value: "#ccff90" },
    { name: "Toska", value: "#a7ffeb" },
    { name: "Langit", value: "#cbf0f8" },
    { name: "Biru", value: "#aecbfa" },
    { name: "Lavender", value: "#d7aefb" },
    { name: "Merah Muda", value: "#fdcfe8" },
    { name: "Tanah", value: "#e6c9a8" },
    { name: "Abu-abu", value: "#e8eaed" },
  ];

  // Render satu baris swatch warna ke dalam sebuah container.
  // onSelect(colorValue) dipanggil setiap kali user memilih warna.
  function renderColorSwatches(container, selectedValue, onSelect) {
    if (!container) return;
    container.innerHTML = "";
    NOTE_COLORS.forEach(function (c) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "color-swatch" +
        (selectedValue && selectedValue.toLowerCase() === c.value.toLowerCase()
          ? " is-selected"
          : "");
      btn.style.backgroundColor = c.value;
      btn.title = c.name;
      btn.setAttribute("aria-label", c.name);
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        onSelect(c.value);
      });
      container.appendChild(btn);
    });
  }

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
      card.style.setProperty("--card-color", note.color || "#ffffff");
      card.dataset.id = note.id;

      card.innerHTML = `
        <div class="note-card-top">
          <span class="note-card-title">${escapeHtml(note.title || "Catatan")}</span>
          <button class="note-pin-btn${note.is_important ? " is-active" : ""}" title="${note.is_important ? "Lepas tanda penting" : "Tandai penting"}" data-id="${note.id}">${note.is_important ? "⭐" : "☆"}</button>
        </div>
        <span class="note-category-badge">${escapeHtml(note.category || "Umum")}</span>
        <div class="note-card-content">${note.content}</div>
        <div class="note-card-footer">
          <span class="note-date">${formatDate(note.updated_at || note.created_at)}</span>
          <div class="note-card-actions">
            <div class="note-quick-color">
              <button class="note-action-btn color-btn" title="Ubah warna" data-id="${note.id}">🎨</button>
            </div>
            <button class="note-action-btn delete-btn" title="Hapus" data-id="${note.id}">🗑️</button>
          </div>
        </div>
      `;
      notesGrid.appendChild(card);
    });

    // Klik di mana pun pada kartu (selain tombol aksi) membuka editor
    notesGrid.querySelectorAll(".note-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest(".note-card-actions") || e.target.closest(".note-pin-btn")) {
          return;
        }
        openEditModal(card.dataset.id);
      });
    });

    notesGrid.querySelectorAll(".delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openDeleteModal(btn.dataset.id);
      });
    });

    // Toggle penting langsung dari kartu, tanpa buka modal
    notesGrid.querySelectorAll(".note-pin-btn").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        await toggleImportant(btn.dataset.id);
      });
    });

    // Popover warna cepat langsung dari kartu
    notesGrid.querySelectorAll(".color-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openQuickColorPicker(btn);
      });
    });
  }

  // TOGGLE PENTING (dari kartu)
  async function toggleImportant(id) {
    const note = allNotes.find((n) => String(n.id) === String(id));
    if (!note) return;

    const { error } = await supabaseClient
      .from("notes")
      .update({ is_important: !note.is_important, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      errorState.textContent = "❌ Gagal memperbarui catatan: " + error.message;
      errorState.classList.remove("hidden");
      return;
    }

    await loadNotes();
  }

  // UBAH WARNA (dari kartu, tanpa buka modal)
  async function setNoteColor(id, color) {
    const { error } = await supabaseClient
      .from("notes")
      .update({ color: color, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      errorState.textContent = "❌ Gagal mengubah warna: " + error.message;
      errorState.classList.remove("hidden");
      return;
    }

    await loadNotes();
  }

  // POPOVER WARNA CEPAT DI KARTU
  function closeQuickColorPicker() {
    if (openQuickColorPopover) {
      openQuickColorPopover.remove();
      openQuickColorPopover = null;
    }
  }

  function openQuickColorPicker(triggerBtn) {
    if (openQuickColorPopover) {
      closeQuickColorPicker();
      return;
    }
    const id = triggerBtn.dataset.id;
    const note = allNotes.find((n) => String(n.id) === String(id));
    const wrapper = triggerBtn.closest(".note-quick-color");

    const popover = document.createElement("div");
    popover.className = "note-color-popover";
    wrapper.appendChild(popover);
    openQuickColorPopover = popover;

    renderColorSwatches(popover, note ? note.color : "#ffffff", async function (color) {
      closeQuickColorPicker();
      await setNoteColor(id, color);
    });

    setTimeout(function () {
      document.addEventListener("click", handleOutsideQuickColorClick);
    }, 0);
  }

  function handleOutsideQuickColorClick(e) {
    if (openQuickColorPopover && !openQuickColorPopover.contains(e.target)) {
      closeQuickColorPicker();
      document.removeEventListener("click", handleOutsideQuickColorClick);
    }
  }

  searchInput.addEventListener("input", renderNotes);
  categoryFilter.addEventListener("change", renderNotes);
  importantFilter.addEventListener("change", renderNotes);

  // KONTROL COMPOSE BOX (gaya Google Keep — melebar inline, bukan modal)
  let selectedAddImportant = false;

  function selectAddColor(color) {
    selectedAddColor = color;
    renderColorSwatches(addColorSwatches, selectedAddColor, selectAddColor);
    composeBox.style.setProperty("--card-color", color);
  }

  function updateAddImportantIcon() {
    quickImportantBtn.textContent = selectedAddImportant ? "⭐" : "✅";
    quickImportantBtn.classList.toggle("is-active", selectedAddImportant);
    addImportantBtn.textContent = selectedAddImportant ? "⭐" : "☆";
    addImportantBtn.classList.toggle("is-active", selectedAddImportant);
  }

  function expandComposeBox() {
    if (composeBox.classList.contains("is-expanded")) return;
    composeBox.classList.add("is-expanded");
    addNoteTitleInput.classList.remove("hidden");
    composeQuickIcons.classList.add("hidden");
    composeToolbar.classList.remove("hidden");
    addNoteContentInput.rows = 3;
  }

  function collapseComposeBox() {
    composeBox.classList.remove("is-expanded");
    addNoteTitleInput.classList.add("hidden");
    composeQuickIcons.classList.remove("hidden");
    composeToolbar.classList.add("hidden");
    addNoteContentInput.rows = 1;
    addNoteContentInput.style.height = "";
    addColorPopover.classList.add("hidden");
  }

  function resetComposeBox() {
    addNoteForm.reset();
    selectedAddColor = "#ffffff";
    selectedAddImportant = false;
    updateAddImportantIcon();
    renderColorSwatches(addColorSwatches, selectedAddColor, selectAddColor);
    composeBox.style.removeProperty("--card-color");
  }

  async function saveAndCollapseComposeBox() {
    const title = addNoteTitleInput.value.trim();
    const content = addNoteContentInput.value.trim();

    // Kotak kosong: tutup saja tanpa menyimpan apa pun, persis perilaku Keep
    if (!title && !content) {
      collapseComposeBox();
      resetComposeBox();
      return;
    }

    const payload = {
      title:
        title ||
        content.substring(0, 20) + (content.length > 20 ? "..." : "") ||
        "Catatan Tanpa Judul",
      category: addNoteCategoryInput.value.trim() || "Umum",
      content: content,
      is_important: selectedAddImportant,
      color: selectedAddColor,
      user_id: currentUser.id,
    };

    const { error } = await supabaseClient.from("notes").insert(payload);

    if (error) {
      errorState.textContent = "❌ Gagal menyimpan: " + error.message;
      errorState.classList.remove("hidden");
      return;
    }

    collapseComposeBox();
    resetComposeBox();
    await loadNotes();
  }

  addNoteTitleInput.addEventListener("focus", expandComposeBox);
  addNoteContentInput.addEventListener("focus", expandComposeBox);
  addNoteContentInput.addEventListener("input", function () {
    addNoteContentInput.style.height = "auto";
    addNoteContentInput.style.height = addNoteContentInput.scrollHeight + "px";
  });

  quickImportantBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    selectedAddImportant = !selectedAddImportant;
    updateAddImportantIcon();
  });
  addImportantBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    selectedAddImportant = !selectedAddImportant;
    updateAddImportantIcon();
  });

  quickPaletteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    expandComposeBox();
    addColorPopover.classList.remove("hidden");
  });
  addPaletteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    addColorPopover.classList.toggle("hidden");
  });

  quickImageBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    expandComposeBox();
    addNoteContentInput.focus();
  });

  // Klik di luar kotak = "Tutup" (auto-simpan kalau ada isinya), sama seperti Keep
  document.addEventListener("click", function (e) {
    if (
      !addColorPopover.classList.contains("hidden") &&
      !e.target.closest("#addColorWrapper")
    ) {
      addColorPopover.classList.add("hidden");
    }
    if (composeBox.classList.contains("is-expanded") && !composeBox.contains(e.target)) {
      saveAndCollapseComposeBox();
    }
  });

  addNoteForm.addEventListener("submit", function (e) {
    e.preventDefault();
    saveAndCollapseComposeBox();
  });

  // Render awal
  renderColorSwatches(addColorSwatches, selectedAddColor, selectAddColor);
  updateAddImportantIcon();

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
    renderColorSwatches(editColorSwatches, note.color || "#fff7d1", applyEditColor);
    editColorPopover.classList.add("hidden");

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
    editColorPopover.classList.add("hidden");
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
      expandComposeBox();
      addNoteContentInput.focus();
      composeBox.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  function applyEditColor(color) {
    const stickyEl = editNoteModal.querySelector(".sticky-note");
    if (stickyEl) stickyEl.style.setProperty("--bg-color", color);
    editBgColorPicker.value = color;
    renderColorSwatches(editColorSwatches, color, applyEditColor);
  }

  editBgColorPicker.addEventListener("input", (e) => {
    applyEditColor(e.target.value);
  });

  if (btnPaletteToggle) {
    btnPaletteToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      editColorPopover.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", function (e) {
    if (
      editColorPopover &&
      !editColorPopover.classList.contains("hidden") &&
      !e.target.closest("#colorPickerWrapper")
    ) {
      editColorPopover.classList.add("hidden");
    }
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

// FITUR PASTE AUTOMATIS (TEKS RAPI + SCREENSHOT JADI URL)
// FITUR PASTE SCREENSHOT AUTOMATIS (PERBAIKAN PUBLIC URL)
(function () {
  const editor = document.getElementById('editor');

  if (editor) {
    editor.addEventListener('paste', async function (e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;

      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();

          const file = item.getAsFile();
          const fileName = `ss_${Date.now()}.png`;

          // Tampilkan indikator loading
          document.execCommand('insertHTML', false, '<span id="uploading-img">⏳ Mengunggah gambar...</span>');

          // 1. Unggah file ke Storage
          const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('note-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          const loadingEl = document.getElementById('uploading-img');
          if (loadingEl) loadingEl.remove();

          if (uploadError) {
            alert('❌ Gagal mengunggah screenshot: ' + uploadError.message);
            return;
          }

          // 2. Ambil Public URL dengan sintaks yang tepat
          const { data } = supabaseClient
            .storage
            .from('note-images')
            .getPublicUrl(fileName);

          const publicUrl = data.publicUrl;

          // 3. Sisipkan tag <img> menggunakan Public URL
          const imgHtml = `<br><img src="${publicUrl}" alt="Screenshot" style="max-width:100%; height:auto;"><br>`;
          document.execCommand('insertHTML', false, imgHtml);
          return;
        }
      }

      // Jika paste teks biasa
      const textData = e.clipboardData.getData('text/plain');
      if (textData) {
        e.preventDefault();
        const formattedText = textData.replace(/\r\n|\r|\n/g, '<br>');
        document.execCommand('insertHTML', false, formattedText);
      }
    });
  }
})();

// FITUR SISIP TABEL OTOMATIS
const btnTable = document.getElementById('btn-table');

if (btnTable) {
  btnTable.addEventListener('click', function () {
    // Buat HTML tabel standar (2 baris x 2 kolom)
    const tableHtml = `
      <br>
      <table style="width:100%; border-collapse:collapse; margin:10px 0;">
        <thead>
          <tr style="background-color: rgba(0,0,0,0.05);">
            <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Header 1</th>
            <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:6px 8px;">Isi 1</td>
            <td style="border:1px solid #cbd5e1; padding:6px 8px;">Isi 2</td>
          </tr>
        </tbody>
      </table>
      <br>
    `;
    
    // Sisipkan tabel ke posisi kursor editor
    document.execCommand('insertHTML', false, tableHtml);
  });
}

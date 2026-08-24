document.addEventListener("DOMContentLoaded", async function () {
  if (typeof supabaseClient === "undefined") {
    console.error("❌ Supabase client tidak ditemukan. Cek supabase-config.js");
    return;
  }

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

  // Tambahkan baris ini di sekitar baris 35-45 (bagian deklarasi elemen modal edit)
  const editNoteFolderSelect = document.getElementById("edit-note-folder");
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

  const composeBox = document.getElementById("compose-box");
  const addNoteForm = document.getElementById("add-note-form");
  const addNoteTitleInput = document.getElementById("add-note-title");
  const addNoteContentInput = document.getElementById("add-note-content");
  const addNoteCategoryInput = document.getElementById("add-note-category");
  const composeQuickIcons = document.getElementById("compose-quick-icons");
  const composeToolbar = document.getElementById("compose-toolbar");
  const quickImportantBtn = document.getElementById("quick-important-btn");
  const quickPaletteBtn = document.getElementById("quick-palette-btn");
  const addPaletteBtn = document.getElementById("add-palette-btn");
  const addImportantBtn = document.getElementById("add-important-btn");
  const addColorWrapper = document.getElementById("addColorWrapper");
  const addColorPopover = document.getElementById("add-color-popover");
  const addColorSwatches = document.getElementById("add-color-swatches");

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

  const btnFmtBold = document.getElementById("btn-bold");
  const btnFmtItalic = document.getElementById("btn-italic");
  const btnFmtUnderline = document.getElementById("btn-underline");
  const btnFmtStrike = document.getElementById("btn-strike");
  const btnFmtList = document.getElementById("btn-list");
  const btnFmtImage = document.getElementById("btn-image");
  const editImageInput = document.getElementById("imageInput");

  const deleteModal = document.getElementById("delete-modal");
  const deleteNoteTitle = document.getElementById("delete-note-title");
  const deleteCancelBtn = document.getElementById("delete-cancel-btn");
  const deleteConfirmBtn = document.getElementById("delete-confirm-btn");

  let allNotes = [];
  let noteIdPendingDelete = null;
  let selectedAddColor = "#ffffff";
  let openQuickColorPopover = null;

  let aiPendingNoteId = null;
  let aiResult = null;

  userEmailEl.textContent = currentUser.email;

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

  logoutBtn.addEventListener("click", async function () {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Keluar...";
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });

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
            <button class="note-action-btn ai-btn" title="Rapikan dengan AI" data-id="${note.id}">✨</button>
            <div class="note-quick-color">
              <button class="note-action-btn color-btn" title="Ubah warna" data-id="${note.id}">🎨</button>
            </div>
            <button class="note-action-btn delete-btn" title="Hapus" data-id="${note.id}">🗑️</button>
          </div>
        </div>
      `;
      notesGrid.appendChild(card);
    });

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

    notesGrid.querySelectorAll(".note-pin-btn").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        await toggleImportant(btn.dataset.id);
      });
    });

    notesGrid.querySelectorAll(".color-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openQuickColorPicker(btn);
      });
    });

    notesGrid.querySelectorAll(".ai-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const noteId = btn.dataset.id;
        if (noteId) openAIPreview(noteId);
      });
    });
  }

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

    if (!title && !content) {
      collapseComposeBox();
      resetComposeBox();
      return;
    }

    const payload = {
      title:
        title ||
        content.substring(0, 20) + (content.length > 20 ? "..." : "") || "Catatan Tanpa Judul",
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

  renderColorSwatches(addColorSwatches, selectedAddColor, selectAddColor);
  updateAddImportantIcon();

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

  if (editModalCloseBtn) editModalCloseBtn.addEventListener("click", closeEditModal);
  if (editModalCancelBtn) editModalCancelBtn.addEventListener("click", closeEditModal);

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

  if (editBgColorPicker) {
    editBgColorPicker.addEventListener("input", (e) => {
      applyEditColor(e.target.value);
    });
  }

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

  if (btnFmtBold) btnFmtBold.addEventListener("click", () => executeCmd("bold"));
  if (btnFmtItalic) btnFmtItalic.addEventListener("click", () => executeCmd("italic"));
  if (btnFmtUnderline) btnFmtUnderline.addEventListener("click", () => executeCmd("underline"));
  if (btnFmtStrike) btnFmtStrike.addEventListener("click", () => executeCmd("strikeThrough"));
  if (btnFmtList) btnFmtList.addEventListener("click", () => executeCmd("insertUnorderedList"));
  if (btnFmtImage) {
    btnFmtImage.addEventListener("click", () => {
      if (editImageInput) editImageInput.click();
    });
  }

  if (editImageInput) {
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
  }

  const btnH1 = document.getElementById("btn-h1");
  const btnH2 = document.getElementById("btn-h2");
  const btnH3 = document.getElementById("btn-h3");
  const btnOl = document.getElementById("btn-ol");
  const btnChecklist = document.getElementById("btn-checklist");
  const btnLink = document.getElementById("btn-link");
  const btnTable = document.getElementById("btn-table");
  const btnMore = document.getElementById("btn-more");
  const btnAlignLeft = document.getElementById("btn-align-left");
  const btnAlignCenter = document.getElementById("btn-align-center");
  const btnAlignRight = document.getElementById("btn-align-right");
  const btnClearFormat = document.getElementById("btn-clear-format");
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");

  if (btnH1) btnH1.addEventListener("click", () => executeCmd("formatBlock", "h1"));
  if (btnH2) btnH2.addEventListener("click", () => executeCmd("formatBlock", "h2"));
  if (btnH3) btnH3.addEventListener("click", () => executeCmd("formatBlock", "h3"));
  if (btnOl) btnOl.addEventListener("click", () => executeCmd("insertOrderedList"));

  if (btnChecklist) {
    btnChecklist.addEventListener("click", toggleChecklist);
  }

  function toggleChecklist() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    let li = null;
    if (container.closest) {
      li = container.closest('li');
    } else {
      let el = container;
      while (el && el.tagName !== 'LI') {
        el = el.parentNode;
      }
      li = el;
    }
    
    if (li && li.classList && li.classList.contains('checklist-item')) {
      const checkbox = li.querySelector('.checklist-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        li.classList.toggle('checked', checkbox.checked);
      }
    } else {
      const html = `<ul class="checklist">
        <li class="checklist-item">
          <input type="checkbox" class="checklist-checkbox">
          <span class="checklist-text" contenteditable="true">Item checklist</span>
        </li>
      </ul>`;
      document.execCommand('insertHTML', false, html);
      
      setTimeout(() => {
        const textSpan = document.querySelector('.checklist-item:last-child .checklist-text');
        if (textSpan) {
          const range = document.createRange();
          range.selectNodeContents(textSpan);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 10);
    }
  }

  if (btnLink) {
    btnLink.addEventListener("click", () => {
      const url = prompt('Masukkan URL:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    });
  }

  if (btnTable) {
    btnTable.addEventListener("click", insertTableDialog);
  }

  function insertTableDialog() {
    const rows = prompt('Jumlah baris (termasuk header):', 3);
    const cols = prompt('Jumlah kolom:', 3);
    if (rows && cols) {
      insertTable(parseInt(rows), parseInt(cols));
    }
  }

  function insertTable(rows, cols) {
    let html = '<br><table style="width:100%; border-collapse:collapse; margin:8px 0;">';
    
    html += '<thead><tr>';
    for (let j = 0; j < cols; j++) {
      html += `<th style="border:1px solid #cbd5e1; padding:6px 10px; text-align:left; background:rgba(0,0,0,0.05);">Header ${j+1}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (let i = 1; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += `<td style="border:1px solid #cbd5e1; padding:6px 10px;">&nbsp;</td>`;
      }
      html += '</tr>';
    }
    
    html += '</tbody></table><br>';
    document.execCommand('insertHTML', false, html);
  }

  const moreMenuModal = document.getElementById('more-menu-modal');
  const moreCloseBtn = document.getElementById('more-close-btn');

  if (btnMore) {
    btnMore.addEventListener("click", () => {
      if (moreMenuModal) moreMenuModal.classList.remove('hidden');
    });
  }

  if (moreCloseBtn) {
    moreCloseBtn.addEventListener("click", () => {
      if (moreMenuModal) moreMenuModal.classList.add('hidden');
    });
  }

  if (moreMenuModal) {
    moreMenuModal.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        moreMenuModal.classList.add('hidden');
      }
    });
  }

  if (btnAlignLeft) btnAlignLeft.addEventListener("click", () => { executeCmd("justifyLeft"); if (moreMenuModal) moreMenuModal.classList.add('hidden'); });
  if (btnAlignCenter) btnAlignCenter.addEventListener("click", () => { executeCmd("justifyCenter"); if (moreMenuModal) moreMenuModal.classList.add('hidden'); });
  if (btnAlignRight) btnAlignRight.addEventListener("click", () => { executeCmd("justifyRight"); if (moreMenuModal) moreMenuModal.classList.add('hidden'); });
  if (btnClearFormat) btnClearFormat.addEventListener("click", () => { executeCmd("removeFormat"); if (moreMenuModal) moreMenuModal.classList.add('hidden'); });
  if (btnUndo) btnUndo.addEventListener("click", () => { executeCmd("undo"); if (moreMenuModal) moreMenuModal.classList.add('hidden'); });
  if (btnRedo) btnRedo.addEventListener("click", () => { executeCmd("redo"); if (moreMenuModal) moreMenuModal.classList.add('hidden'); });

 // dashboard.js
editNoteForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = editNoteIdInput.value;
  const contentHTML = editNoteContentInput.innerHTML.trim();

  if (!contentHTML) {
    alert("Isi catatan tidak boleh kosong!");
    return;
  }

  // Pengecekan Aman: Ambil elemen HTML jika ada
  const folderInput = document.getElementById("edit-note-folder");
  const folderValue = folderInput ? folderInput.value : null;

  const payload = {
    title: editNoteTitleInput ? editNoteTitleInput.value.trim() : 'Catatan Tanpa Judul',
    // folder_id: folderValue,
    content: contentHTML,
    is_important: editNoteImportantInput ? editNoteImportantInput.checked : false,
    color: editBgColorPicker ? editBgColorPicker.value : '#ffffff',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from("notes")
    .update(payload)
    .eq("id", id);

  if (error) {
    alert("Gagal menyimpan: " + error.message);
    return;
  }

  closeEditModal();
  await loadNotes();
});
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

  // ============================================
  // AI GEMINI
  // ============================================
async function callGemini(content, instruction) {
  const { data, error } = await supabaseClient.functions.invoke('gemini', {
    body: { 
      content: content,       // Isi catatan
      instruction: instruction // Instruksi AI (misal: "Ringkasan", "Checklist", dll)
    }
  });

  if (error) throw error;
  return data;
}

 async function openAIPreview(noteId) {
  const note = allNotes.find(n => String(n.id) === String(noteId));
  if (!note) {
    alert('❌ Note tidak ditemukan.');
    return;
  }

  // ✅ Cek apakah note memiliki content
  if (!note.content || note.content.trim() === '') {
    alert('❌ Catatan kosong. Tidak ada yang bisa diproses AI.');
    return;
  }

  console.log('📝 Note content:', note.content);

  const instructionInput = document.getElementById('ai-instruction');
  const instruction = instructionInput ? instructionInput.value.trim() : null;

  aiPendingNoteId = noteId;
  
  const loadingEl = document.getElementById('ai-preview-loading');
  const contentEl = document.getElementById('ai-preview-content');
  const errorEl = document.getElementById('ai-preview-error');
  const actionsEl = document.getElementById('ai-preview-actions');
  
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (contentEl) contentEl.classList.add('hidden');
  if (errorEl) errorEl.classList.add('hidden');
  if (actionsEl) actionsEl.classList.add('hidden');
  
  const modal = document.getElementById('ai-preview-modal');
  if (modal) modal.classList.remove('hidden');
  
  try {
    const imgMatch = note.content.match(/<img[^>]+src="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : null;
    
    const result = await callGemini(note.content, instruction);
    aiResult = result;
    
    console.log('📝 AI Result received:', result);
    
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
    if (actionsEl) actionsEl.classList.remove('hidden');
    
    const titleEl = document.getElementById('ai-preview-title');
    const bodyEl = document.getElementById('ai-preview-body');
    const categoryEl = document.getElementById('ai-preview-category');
    const colorBar = document.getElementById('ai-preview-color-bar');
    
    if (titleEl) titleEl.textContent = result.title || note.title || 'Catatan';
    if (bodyEl) bodyEl.innerHTML = result.content || note.content || '';
    if (categoryEl) categoryEl.textContent = result.category || note.category || 'Umum';
    
    const color = result.color || note.color || '#ffffff';
    if (colorBar) {
      colorBar.style.backgroundColor = color;
      colorBar.style.background = color;
    }
    
  } catch (error) {
    console.error('❌ AI Error:', error);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) {
      errorEl.textContent = '❌ Gagal memproses dengan AI: ' + error.message;
      errorEl.classList.remove('hidden');
    }
  }
}
  function closeAIPreview() {
    const modal = document.getElementById('ai-preview-modal');
    if (modal) modal.classList.add('hidden');
    aiPendingNoteId = null;
    aiResult = null;
    const errorEl = document.getElementById('ai-preview-error');
    if (errorEl) errorEl.classList.add('hidden');
  }

async function applyAIResult() {
  if (!aiPendingNoteId || !aiResult) {
    alert('❌ Tidak ada hasil AI untuk diterapkan.');
    return;
  }

  const bodyEl = document.getElementById('ai-preview-body');
  const resultContent = (aiResult.content || (bodyEl ? bodyEl.innerHTML : '') || '').trim();

  if (!resultContent) {
    alert("Hasil AI kosong!");
    return;
  }

  const payload = {
    title: aiResult.title || 'Catatan Tanpa Judul',
    content: resultContent,
    category: aiResult.category || 'Umum',
    color: aiResult.color || '#ffffff',
    is_important: !!aiResult.is_important,
    updated_at: new Date().toISOString(),
  };

  const applyBtn = document.getElementById('ai-apply-btn');
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.textContent = '⏳ Menyimpan...';
  }

  const { error } = await supabaseClient
    .from('notes')
    .update(payload)
    .eq('id', aiPendingNoteId);

  if (applyBtn) {
    applyBtn.disabled = false;
    applyBtn.textContent = '✅ Gunakan';
  }

  if (error) {
    alert('❌ Gagal menyimpan hasil AI: ' + error.message);
    return;
  }

  closeAIPreview();
  await loadNotes();
}

 function editAIResult() {
  if (!aiPendingNoteId || !aiResult) {
    alert('❌ Tidak ada hasil AI untuk diedit.');
    return;
  }

  console.log('📝 Edit AI Result:', aiResult);

  // ✅ Simpan dulu sebelum closeAIPreview() mereset aiPendingNoteId & aiResult jadi null
  const noteId = aiPendingNoteId;
  const result = aiResult;

  const note = allNotes.find(n => String(n.id) === String(noteId));
  if (!note) {
    alert('❌ Note tidak ditemukan.');
    return;
  }

  // ✅ Pastikan content ada
  const content = result.content || note.content || '';

  const tempNote = {
    ...note,
    title: result.title || note.title,
    content: content,
    category: result.category || note.category,
    color: result.color || note.color,
    is_important: result.is_important || note.is_important
  };

  console.log('📝 Temp Note:', tempNote);

  closeAIPreview();
  openEditModalWithData(tempNote);
}

  function openEditModalWithData(note) {
  if (!note) {
    alert('❌ Data note tidak valid.');
    return;
  }

  console.log('📝 Open Edit with Data:', note);

  editNoteIdInput.value = note.id;
  
  if (editNoteTitleInput) {
    editNoteTitleInput.value = note.title || 'catatan';
  }
  
  if (editNoteCategoryInput) {
    editNoteCategoryInput.value = note.category || '';
  }
  
  // ✅ Pastikan content ada sebelum di-insert
  const content = note.content || 'Catatan kosong';
  editNoteContentInput.innerHTML = content;
  
  editNoteImportantInput.checked = !!note.is_important;
  editBgColorPicker.value = note.color || '#fff7d1';
  renderColorSwatches(editColorSwatches, note.color || '#fff7d1', applyEditColor);
  editColorPopover.classList.add('hidden');
  
  const stickyEl = editNoteModal.querySelector('.sticky-note');
  if (stickyEl) {
    stickyEl.style.setProperty('--bg-color', note.color || '#fff7d1');
    stickyEl.classList.remove('minimized');
  }
  
  editModalMessage.classList.add('hidden');
  editNoteModal.classList.remove('hidden');
  editNoteContentInput.focus();
}

  const aiCloseBtn = document.getElementById('ai-close-btn');
  const aiCancelBtn = document.getElementById('ai-cancel-btn');
  const aiApplyBtn = document.getElementById('ai-apply-btn');
  const aiEditBtn = document.getElementById('ai-edit-btn');
  const aiModal = document.getElementById('ai-preview-modal');

  if (aiCloseBtn) aiCloseBtn.addEventListener('click', closeAIPreview);
  if (aiCancelBtn) aiCancelBtn.addEventListener('click', closeAIPreview);
  if (aiApplyBtn) aiApplyBtn.addEventListener('click', applyAIResult);
  if (aiEditBtn) aiEditBtn.addEventListener('click', editAIResult);

  if (aiModal) {
    aiModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAIPreview();
    });
  }

  document.querySelectorAll('.ai-quick-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const instructionInput = document.getElementById('ai-instruction');
      if (instructionInput) {
        instructionInput.value = this.dataset.instruksi;
        instructionInput.focus();
        if (aiPendingNoteId) {
          const loadingEl = document.getElementById('ai-preview-loading');
          const contentEl = document.getElementById('ai-preview-content');
          const errorEl = document.getElementById('ai-preview-error');
          if (loadingEl) loadingEl.classList.remove('hidden');
          if (contentEl) contentEl.classList.add('hidden');
          if (errorEl) errorEl.classList.add('hidden');
          openAIPreview(aiPendingNoteId);
        }
      }
    });
  });

  document.getElementById('ai-instruction')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (aiPendingNoteId) {
        const loadingEl = document.getElementById('ai-preview-loading');
        const contentEl = document.getElementById('ai-preview-content');
        const errorEl = document.getElementById('ai-preview-error');
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        openAIPreview(aiPendingNoteId);
      }
    }
  });

  const editor = document.getElementById('editor');
  if (editor) {
    editor.addEventListener('paste', async function (e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;

      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();

          const file = item.getAsFile();
          const fileName = `ss_${Date.now()}.png`;

          document.execCommand('insertHTML', false, '<span id="uploading-img">⏳ Mengunggah gambar...</span>');

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

          const { data } = supabaseClient
            .storage
            .from('note-images')
            .getPublicUrl(fileName);

          const publicUrl = data.publicUrl;

          const imgHtml = `<br><img src="${publicUrl}" alt="Screenshot" style="max-width:100%; height:auto;"><br>`;
          document.execCommand('insertHTML', false, imgHtml);
          return;
        }
      }

      const textData = e.clipboardData.getData('text/plain');
      if (textData) {
        e.preventDefault();
        const formattedText = textData.replace(/\r\n|\r|\n/g, '<br>');
        document.execCommand('insertHTML', false, formattedText);
      }
    });
  }

  await loadNotes();
});

// Fungsi Helper untuk memanggil Gemini AI via Supabase Edge Function
async function generateNoteWithAI(promptText) {
  try {
    const { data, error } = await supabaseClient.functions.invoke('gemini', {
      body: { prompt: promptText }
    });

    if (error) {
      console.error('❌ Gagal menghubungi Edge Function:', error);
      alert('Gagal memproses dengan AI: ' + error.message);
      return null;
    }

    return data.result;
  } catch (err) {
    console.error('❌ Error internal:', err);
    alert('Terjadi kesalahan jaringan/sistem.');
    return null;
  }
}

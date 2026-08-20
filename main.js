// main.js - Versi Fitur Catatan (Terproteksi Auth)

document.addEventListener("DOMContentLoaded", async function () {
  // 1. Cek koneksi Supabase
  if (typeof supabaseClient === "undefined") {
    console.error("❌ Supabase client not found!");
    alert("Error: Supabase tidak terhubung. Periksa konfigurasi.");
    return;
  }

  // ================================
  // PROTEKSI KEAMANAN (AUTH CHECK)
  // ================================
  // Ambil sesi user saat ini dari Supabase
  const { data: { session } } = await supabaseClient.auth.getSession();

  // Jika tidak ada sesi aktif, blokir akses dan alihkan ke halaman utama/login
  if (!session) {
    alert("Akses ditolak! Anda harus login terlebih dahulu.");
    window.location.href = "https://hendrizhuo6-lab.github.io/";
    return;
  }

  // Simpan ID user yang sedang login
  const currentUserId = session.user.id;

  // ================================
  // ELEMEN DOM
  // ================================
  const btnAddNote = document.getElementById("btn-add-note");
  const noteFormSection = document.getElementById("note-form-section");
  const cancelBtn = document.getElementById("cancel-btn");
  const noteForm = document.getElementById("note-form");
  const noteList = document.getElementById("recent-note-list");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");

  // Elemen Modal
  const noteModal = document.getElementById("note-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalEditBtn = document.getElementById("modal-edit-btn");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-note-form");
  const editTitle = document.getElementById("edit-title");
  const editContent = document.getElementById("edit-content");
  const editImportant = document.getElementById("edit-important");
  const editCancelBtn = document.getElementById("edit-cancel-btn");

  let activeNoteElement = null;
  let activeNoteId = null;

  // ================================
  // FUNGSI CRUD DENGAN SUPABASE
  // ================================

  // Ambil semua catatan (Filtered by RLS)
  async function fetchNotes() {
    try {
      const { data, error } = await supabaseClient
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching notes:", error);
      return [];
    }
  }

  // Tambah catatan (Disambungkan dengan user_id)
  async function addNote(title, content, is_important) {
    try {
      const { data, error } = await supabaseClient
        .from("notes")
        .insert([
          {
            title: title,
            content: content,
            is_important: is_important,
            user_id: currentUserId, // Menyimpan ID milik akun yang login
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error adding note:", error);
      return null;
    }
  }

  // Update catatan
  async function updateNote(id, title, content, is_important) {
    try {
      const { data, error } = await supabaseClient
        .from("notes")
        .update({
          title: title,
          content: content,
          is_important: is_important,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error updating note:", error);
      return null;
    }
  }

  // Hapus catatan
  async function deleteNote(id) {
    try {
      const { error } = await supabaseClient
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  }

  // Load dan render semua catatan
  async function loadNotes() {
    const notes = await fetchNotes();
    noteList.innerHTML = "";

    if (notes.length === 0) {
      noteList.innerHTML =
        '<p style="text-align:center;color:#666;">Belum ada catatan. Tambahkan catatan baru!</p>';
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

  // ================================
  // FUNGSI UI
  // ================================

  function createNoteElement(title, content, isImportant, id) {
    const noteArticle = document.createElement("article");
    noteArticle.classList.add("note-item");
    if (isImportant) noteArticle.classList.add("important");

    noteArticle.dataset.title = title;
    noteArticle.dataset.content = content;
    noteArticle.dataset.id = id;

    noteArticle.innerHTML = `
      <div class="note-content-preview">
        <h3 class="note-title">${escapeHtml(title)}</h3>
        <p class="note-body">${escapeHtml(content)}</p>
        ${isImportant ? '<span class="badge-important">⭐ Penting</span>' : ""}
      </div>
      <div class="note-actions">
        <button type="button" class="btn-delete">🗑️ Hapus</button>
      </div>
    `;

    noteArticle
      .querySelector(".note-content-preview")
      .addEventListener("click", () => {
        openModal(noteArticle);
      });

    noteArticle
      .querySelector(".btn-delete")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Yakin ingin menghapus catatan ini?")) {
          const success = await deleteNote(id);
          if (success) {
            noteArticle.remove();
            if (document.querySelectorAll(".note-item").length === 0) {
              noteList.innerHTML =
                '<p style="text-align:center;color:#666;">Belum ada catatan. Tambahkan catatan baru!</p>';
            }
          } else {
            alert("Gagal menghapus catatan.");
          }
        }
      });

    return noteArticle;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function openModal(noteElement) {
    activeNoteElement = noteElement;
    activeNoteId = noteElement.dataset.id;

    modalTitle.textContent = noteElement.dataset.title;
    modalBody.textContent = noteElement.dataset.content;

    noteModal.classList.add("active");
  }

  function closeModal() {
    noteModal.classList.remove("active");
    activeNoteElement = null;
    activeNoteId = null;
  }

  // ================================
  // EVENT LISTENERS
  // ================================

  btnAddNote.addEventListener("click", function () {
    noteFormSection.classList.toggle("hidden");
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      noteFormSection.classList.add("hidden");
      noteForm.reset();
    });
  }

  // Submit Tambah Catatan
  noteForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("note-content").value.trim();
    const isFavorite = document.getElementById("note-favorite").checked;

    if (!title || !content) {
      alert("Judul dan isi catatan harus diisi!");
      return;
    }

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";

    const newNote = await addNote(title, content, isFavorite);

    if (newNote) {
      const noteElement = createNoteElement(
        newNote.title,
        newNote.content,
        newNote.is_important,
        newNote.id
      );
      noteList.prepend(noteElement);

      const emptyMessage = noteList.querySelector("p");
      if (emptyMessage && emptyMessage.style.textAlign === "center") {
        emptyMessage.remove();
      }

      noteForm.reset();
      noteFormSection.classList.add("hidden");
    } else {
      alert("Gagal menyimpan catatan. Silakan coba lagi.");
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan Catatan";
  });

  // Modal Edit Actions
  modalEditBtn.addEventListener("click", () => {
    if (!activeNoteElement || !activeNoteId) return;

    editTitle.value = activeNoteElement.dataset.title;
    editContent.value = activeNoteElement.dataset.content;
    editImportant.checked = activeNoteElement.classList.contains("important");

    noteModal.classList.remove("active");
    editModal.classList.add("active");
  });

  editCancelBtn.addEventListener("click", () => {
    editModal.classList.remove("active");
    noteModal.classList.add("active");
  });

  // Submit Update Catatan
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newTitle = editTitle.value.trim();
    const newContent = editContent.value.trim();
    const newImportant = editImportant.checked;

    if (!newTitle || !newContent) {
      alert("Judul dan isi catatan harus diisi!");
      return;
    }

    const updatedNote = await updateNote(
      activeNoteId,
      newTitle,
      newContent,
      newImportant
    );

    if (!updatedNote) {
      alert("Gagal mengupdate catatan.");
      return;
    }

    activeNoteElement.dataset.title = updatedNote.title;
    activeNoteElement.dataset.content = updatedNote.content;

    activeNoteElement.querySelector(".note-title").textContent = updatedNote.title;
    activeNoteElement.querySelector(".note-body").textContent = updatedNote.content;

    const previewDiv = activeNoteElement.querySelector(".note-content-preview");
    const existingBadge = previewDiv.querySelector(".badge-important");

    if (updatedNote.is_important) {
      if (!existingBadge) {
        const badge = document.createElement("span");
        badge.className = "badge-important";
        badge.textContent = "⭐ Penting";
        previewDiv.appendChild(badge);
      }
      activeNoteElement.classList.add("important");
    } else {
      if (existingBadge) {
        existingBadge.remove();
      }
      activeNoteElement.classList.remove("important");
    }

    editModal.classList.remove("active");
    modalTitle.textContent = updatedNote.title;
    modalBody.textContent = updatedNote.content;
    noteModal.classList.add("active");
  });

  modalCloseBtn.addEventListener("click", closeModal);

  noteModal.addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal();
    }
  });

  // Filter Pencarian
  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const keyword = searchInput.value.toLowerCase().trim();

    if (!keyword) {
      document
        .querySelectorAll(".note-item")
        .forEach((note) => (note.style.display = ""));
      return;
    }

    document.querySelectorAll(".note-item").forEach((note) => {
      const title = note.dataset.title.toLowerCase();
      const content = note.dataset.content.toLowerCase();
      note.style.display =
        title.includes(keyword) || content.includes(keyword) ? "" : "none";
    });
  });

  // Load Data Pertama Kali
  loadNotes();
});

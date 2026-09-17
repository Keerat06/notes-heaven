/* ==========================================================
   NOTES HEAVEN - Notes List & Editor Logic
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!guardPage(true)) return;

  const pathname = window.location.pathname;

  // Note Editor page
  if (pathname.includes('editor.html')) {
    initEditorPage();
    return;
  }

  // Determine current view mode
  let pageMode = 'all';
  if (pathname.includes('favorites.html')) pageMode = 'favorites';
  if (pathname.includes('pinned.html')) pageMode = 'pinned';
  if (pathname.includes('trash.html')) pageMode = 'trash';

  initNotesListPage(pageMode);
});

// ==========================================================
// NOTES LIST PAGE LOGIC (All, Favorites, Pinned, Trash)
// ==========================================================
let currentFilters = {
  search: '',
  subject: 'All',
  sort: 'latest',
  mode: 'all'
};

function initNotesListPage(mode = 'all') {
  currentFilters.mode = mode;

  // Parse subject from URL param (e.g. ?subject=DAA)
  const urlParams = new URLSearchParams(window.location.search);
  const subjectParam = urlParams.get('subject');
  if (subjectParam) {
    currentFilters.subject = subjectParam;
  }

  const searchInput = document.getElementById('searchInput');
  const subjectFilter = document.getElementById('subjectFilter');
  const sortSelect = document.getElementById('sortSelect');
  const emptyTrashBtn = document.getElementById('emptyTrashBtn');

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilters.search = e.target.value.trim();
        loadNotesList();
      }, 250);
    });
  }

  if (subjectFilter) {
    if (subjectParam) subjectFilter.value = subjectParam;
    subjectFilter.addEventListener('change', (e) => {
      currentFilters.subject = e.target.value;
      loadNotesList();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      loadNotesList();
    });
  }

  if (emptyTrashBtn) {
    emptyTrashBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to empty the trash? All deleted notes will be permanently removed.')) return;
      try {
        await authFetch('/notes/trash/empty', { method: 'DELETE' });
        showToast('Trash emptied successfully', 'success');
        loadNotesList();
        updateSidebarBadges();
      } catch (err) {
        showToast('Failed to empty trash', 'error');
      }
    });
  }

  loadNotesList();
}

async function loadNotesList() {
  const container = document.getElementById('notesContainer');
  const countEl = document.getElementById('notesCountDisplay');
  if (!container) return;

  try {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Loading notes...</div>`;

    let query = `?sort=${encodeURIComponent(currentFilters.sort)}`;

    if (currentFilters.mode === 'trash') {
      query += '&trash=true';
    } else {
      if (currentFilters.mode === 'favorites') query += '&favorite=true';
      if (currentFilters.mode === 'pinned') query += '&pinned=true';
      if (currentFilters.subject && currentFilters.subject !== 'All') {
        query += `&subject=${encodeURIComponent(currentFilters.subject)}`;
      }
    }

    if (currentFilters.search) {
      query += `&search=${encodeURIComponent(currentFilters.search)}`;
    }

    const data = await authFetch(`/notes${query}`);
    if (!data.success) throw new Error(data.message || 'Failed to fetch notes');

    if (countEl) {
      countEl.textContent = `${data.count} note${data.count === 1 ? '' : 's'}`;
    }

    if (data.notes.length === 0) {
      let emptyTitle = 'No notes yet';
      let emptySubtitle = 'Create your first note.';

      if (currentFilters.search) {
        emptyTitle = 'No matching notes found';
        emptySubtitle = 'Try searching for different keywords or clear filters.';
      } else if (currentFilters.mode === 'favorites') {
        emptyTitle = 'No favorites yet';
        emptySubtitle = 'Favorite important notes to find them quickly.';
      } else if (currentFilters.mode === 'pinned') {
        emptyTitle = 'No pinned notes yet';
        emptySubtitle = 'Pin important study notes to keep them at the top of your list.';
      } else if (currentFilters.mode === 'trash') {
        emptyTitle = 'Trash is empty';
        emptySubtitle = 'Deleted notes will appear here.';
      }

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${currentFilters.mode === 'trash' ? '🗑️' : currentFilters.mode === 'favorites' ? '⭐' : currentFilters.mode === 'pinned' ? '📌' : '📝'}</div>
          <h3 class="empty-title">${escapeHtml(emptyTitle)}</h3>
          <p class="empty-subtitle">${escapeHtml(emptySubtitle)}</p>
          ${currentFilters.mode !== 'trash' && !currentFilters.search ? '<a href="/editor.html" class="btn btn-primary" style="margin-top: 14px;">➕ Create Note</a>' : ''}
        </div>
      `;
      return;
    }

    const isTrash = currentFilters.mode === 'trash';
    container.innerHTML = data.notes.map(note => createNoteCardHtml(note, isTrash)).join('');
    attachCardEvents(container, loadNotesList);

  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title" style="color: var(--accent-red)">Error loading notes</h3>
        <p class="empty-subtitle">${escapeHtml(error.message)}</p>
        <button class="btn btn-secondary" onclick="loadNotesList()" style="margin-top: 12px;">Retry</button>
      </div>
    `;
  }
}

// Make loadNotesList globally available
window.reloadNotes = loadNotesList;

// ==========================================================
// NOTE EDITOR LOGIC (Create & Edit Note)
// ==========================================================
async function initEditorPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const noteId = urlParams.get('id');

  const editorTitle = document.getElementById('editorPageTitle');
  const form = document.getElementById('noteEditorForm');
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  const subjectSelect = document.getElementById('noteSubject');
  const tagsInput = document.getElementById('noteTags');
  const favCheckbox = document.getElementById('noteFavorite');
  const pinCheckbox = document.getElementById('notePinned');
  const submitBtn = document.getElementById('saveNoteBtn');

  let isEditing = !!noteId;

  if (isEditing) {
    if (editorTitle) editorTitle.textContent = 'Edit Note';
    if (submitBtn) submitBtn.textContent = 'Update Note';

    try {
      const data = await authFetch(`/notes/${noteId}`);
      if (!data.success || !data.note) throw new Error('Note not found');

      const note = data.note;
      titleInput.value = note.title;
      contentInput.value = note.content;
      subjectSelect.value = note.subject || 'General';
      tagsInput.value = (note.tags || []).join(', ');
      favCheckbox.checked = !!note.favorite;
      pinCheckbox.checked = !!note.pinned;
    } catch (error) {
      showToast('Could not load note for editing', 'error');
      setTimeout(() => {
        window.location.href = '/notes.html';
      }, 1000);
      return;
    }
  } else {
    if (editorTitle) editorTitle.textContent = 'Create New Note';
    if (submitBtn) submitBtn.textContent = 'Save Note';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const subject = subjectSelect.value;
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const favorite = favCheckbox.checked;
    const pinned = pinCheckbox.checked;

    if (!title) {
      showToast('Note title cannot be empty', 'error');
      titleInput.focus();
      return;
    }

    if (!content) {
      showToast('Note content cannot be empty', 'error');
      contentInput.focus();
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = isEditing ? 'Updating...' : 'Saving...';

      const payload = {
        title,
        content,
        subject,
        tags,
        favorite,
        pinned
      };

      if (isEditing) {
        await authFetch(`/notes/${noteId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Note updated successfully!', 'success');
      } else {
        await authFetch('/notes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Note created successfully!', 'success');
      }

      setTimeout(() => {
        window.location.href = '/notes.html';
      }, 500);

    } catch (error) {
      showToast(error.message || 'Failed to save note', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing ? 'Update Note' : 'Save Note';
    }
  });
}

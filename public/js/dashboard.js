/* ==========================================================
   NOTES HEAVEN - Dashboard Logic
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!guardPage(true)) return;

  const user = Auth.getUser();
  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl && user) {
    greetingEl.textContent = `Welcome back, ${user.name} 👋`;
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    const data = await authFetch('/notes/stats');
    if (!data.success) throw new Error('Could not fetch stats');

    const { stats } = data;

    // Update numbers
    const totalEl = document.getElementById('statTotal');
    const favEl = document.getElementById('statFavorites');
    const pinEl = document.getElementById('statPinned');
    const subjCountEl = document.getElementById('statSubjects');

    if (totalEl) totalEl.textContent = stats.total;
    if (favEl) favEl.textContent = stats.favorites;
    if (pinEl) pinEl.textContent = stats.pinned;
    if (subjCountEl) subjCountEl.textContent = stats.subjectsCount;

    // Render Subjects Pills
    renderSubjectsRow(stats.subjects);

    // Render Recent Notes
    renderRecentNotes(stats.recentNotes);

  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard metrics', 'error');
  }
}

function renderSubjectsRow(subjects = []) {
  const container = document.getElementById('subjectsContainer');
  if (!container) return;

  if (subjects.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">No subjects yet. Create a note to add a subject!</span>`;
    return;
  }

  container.innerHTML = subjects.map(s => `
    <a href="/notes.html?subject=${encodeURIComponent(s.name)}" class="subject-pill">
      <span>${escapeHtml(s.name)}</span>
      <span class="subject-count">${s.count}</span>
    </a>
  `).join('');
}

function renderRecentNotes(notes = []) {
  const container = document.getElementById('recentNotesContainer');
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3 class="empty-title">No notes yet</h3>
        <p class="empty-subtitle">Get started by creating your first study note or loading starter templates.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <a href="/editor.html" class="btn btn-primary">➕ Create First Note</a>
          <button id="seedBtn" class="btn btn-secondary" onclick="seedSampleNotes()">📚 Load Sample Notes</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = notes.map(note => createNoteCardHtml(note)).join('');
  attachCardEvents(container);
}

// Note Card Template Generator
function createNoteCardHtml(note, isTrashPage = false) {
  const safeTitle = escapeHtml(note.title);
  const safeContent = escapeHtml(note.content);
  const safeSubject = escapeHtml(note.subject || 'General');
  const dateStr = formatDate(note.updatedAt || note.createdAt);

  const tagsHtml = (note.tags || []).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('');

  if (isTrashPage) {
    return `
      <div class="note-card" data-id="${note._id}">
        <div class="card-top">
          <span class="subject-badge" data-subject="${safeSubject}">${safeSubject}</span>
        </div>
        <h4 class="card-title">${safeTitle}</h4>
        <div class="card-preview">${safeContent}</div>
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-footer">
          <span class="card-date">Deleted ${dateStr}</span>
          <div class="card-footer-buttons">
            <button class="btn btn-secondary btn-sm restore-note-btn" data-id="${note._id}">
              🔄 Restore
            </button>
            <button class="btn btn-danger btn-sm perm-delete-note-btn" data-id="${note._id}">
              🗑️ Delete Forever
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="note-card ${note.pinned ? 'pinned' : ''}" data-id="${note._id}">
      <div class="card-top">
        <span class="subject-badge" data-subject="${safeSubject}">${safeSubject}</span>
        <div class="card-actions-quick">
          <button class="icon-btn-ghost pin-toggle-btn ${note.pinned ? 'active-pin' : ''}" 
                  data-id="${note._id}" data-pinned="${note.pinned}" title="${note.pinned ? 'Unpin note' : 'Pin note'}">
            📌
          </button>
          <button class="icon-btn-ghost fav-toggle-btn ${note.favorite ? 'active-fav' : ''}" 
                  data-id="${note._id}" data-favorite="${note.favorite}" title="${note.favorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${note.favorite ? '★' : '☆'}
          </button>
        </div>
      </div>
      <h4 class="card-title">${safeTitle}</h4>
      <div class="card-preview">${safeContent}</div>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-footer">
        <span class="card-date">Updated ${dateStr}</span>
        <div class="card-footer-buttons">
          <a href="/editor.html?id=${note._id}" class="btn btn-secondary btn-sm" title="Edit note">
            ✏️ Edit
          </a>
          <button class="btn-icon btn-sm trash-note-btn" data-id="${note._id}" title="Move to trash">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `;
}

// Attach event listeners to card buttons (Pin, Favorite, Trash)
function attachCardEvents(container) {
  // Pin Toggle
  container.querySelectorAll('.pin-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const currentPinned = btn.dataset.pinned === 'true';
      try {
        await authFetch(`/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ pinned: !currentPinned })
        });
        showToast(!currentPinned ? 'Note pinned' : 'Note unpinned', 'success');
        if (typeof reloadNotes === 'function') {
          reloadNotes();
        } else {
          loadDashboardData();
        }
        updateSidebarBadges();
      } catch (err) {
        showToast('Failed to toggle pin', 'error');
      }
    });
  });

  // Favorite Toggle
  container.querySelectorAll('.fav-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const currentFav = btn.dataset.favorite === 'true';
      try {
        await authFetch(`/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ favorite: !currentFav })
        });
        showToast(!currentFav ? 'Added to favorites' : 'Removed from favorites', 'success');
        if (typeof reloadNotes === 'function') {
          reloadNotes();
        } else {
          loadDashboardData();
        }
        updateSidebarBadges();
      } catch (err) {
        showToast('Failed to toggle favorite', 'error');
      }
    });
  });

  // Trash / Soft Delete
  container.querySelectorAll('.trash-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Move this note to trash?')) return;

      try {
        await authFetch(`/notes/${id}`, {
          method: 'DELETE'
        });
        showToast('Note moved to trash', 'info');
        if (typeof reloadNotes === 'function') {
          reloadNotes();
        } else {
          loadDashboardData();
        }
        updateSidebarBadges();
      } catch (err) {
        showToast('Failed to delete note', 'error');
      }
    });
  });

  // Restore Note (for trash)
  container.querySelectorAll('.restore-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      try {
        await authFetch(`/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ deleted: false })
        });
        showToast('Note restored successfully!', 'success');
        if (typeof reloadNotes === 'function') {
          reloadNotes();
        }
        updateSidebarBadges();
      } catch (err) {
        showToast('Failed to restore note', 'error');
      }
    });
  });

  // Permanent Delete (for trash)
  container.querySelectorAll('.perm-delete-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Permanently delete this note? This action cannot be undone.')) return;

      try {
        await authFetch(`/notes/${id}?permanent=true`, {
          method: 'DELETE'
        });
        showToast('Note permanently deleted', 'info');
        if (typeof reloadNotes === 'function') {
          reloadNotes();
        }
        updateSidebarBadges();
      } catch (err) {
        showToast('Failed to delete note permanently', 'error');
      }
    });
  });
}

// Seed Sample Notes Helper
async function seedSampleNotes() {
  try {
    const seedBtn = document.getElementById('seedBtn');
    if (seedBtn) {
      seedBtn.disabled = true;
      seedBtn.textContent = 'Loading samples...';
    }

    await authFetch('/notes/seed', { method: 'POST' });
    showToast('Starter notes created successfully!', 'success');
    loadDashboardData();
    updateSidebarBadges();
  } catch (err) {
    showToast('Failed to seed notes', 'error');
  }
}

// Simple HTML Escape helper
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

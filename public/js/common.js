// Common utilities, auth helpers, and UI handlers

const API_BASE = '/api';

// Auth state
const Auth = {
  getToken() {
    return localStorage.getItem('nh_token');
  },
  
  getUser() {
    try {
      const user = localStorage.getItem('nh_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },
  
  setAuth(token, user) {
    localStorage.setItem('nh_token', token);
    localStorage.setItem('nh_user', JSON.stringify(user));
  },
  
  clearAuth() {
    localStorage.removeItem('nh_token');
    localStorage.removeItem('nh_user');
  },
  
  isAuthenticated() {
    return !!this.getToken();
  }
};

// Fetch with auth token
async function authFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      Auth.clearAuth();
      if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = '/login.html';
      }
      throw new Error(data.message || 'Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Redirect based on auth state
function guardPage(requiresAuth = true) {
  const isAuth = Auth.isAuthenticated();

  if (requiresAuth && !isAuth) {
    window.location.href = '/login.html';
    return false;
  }

  if (!requiresAuth && isAuth) {
    window.location.href = '/dashboard.html';
    return false;
  }

  return true;
}

// Init theme from storage or system preference
function initTheme() {
  const savedTheme = localStorage.getItem('nh_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggles = document.querySelectorAll('.theme-toggle-btn');
  themeToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('nh_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  });
}

function updateThemeIcon(theme) {
  const themeIcons = document.querySelectorAll('.theme-icon');
  themeIcons.forEach(icon => {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}

// Render user info in sidebar
function initSidebarUser() {
  const user = Auth.getUser();
  if (!user) return;

  const nameEl = document.querySelector('.user-name');
  const emailEl = document.querySelector('.user-email');
  const avatarEl = document.querySelector('.user-avatar');

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  // Logout handler
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.clearAuth();
      showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 400);
    });
  }

  // Mobile sidebar toggle
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// Update sidebar note counts
async function updateSidebarBadges() {
  if (!Auth.isAuthenticated()) return;
  try {
    const data = await authFetch('/notes/stats');
    if (data.success && data.stats) {
      const totalBadge = document.querySelector('.badge-all-notes');
      const favBadge = document.querySelector('.badge-fav-notes');
      const pinBadge = document.querySelector('.badge-pin-notes');
      const trashBadge = document.querySelector('.badge-trash-notes');

      if (totalBadge) totalBadge.textContent = data.stats.total;
      if (favBadge) favBadge.textContent = data.stats.favorites;
      if (pinBadge) pinBadge.textContent = data.stats.pinned;
      if (trashBadge) trashBadge.textContent = data.stats.trash;
    }
  } catch (err) {
    // Non-blocking
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format date string
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Escape HTML special chars
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Generate note card HTML
function createNoteCardHtml(note, isTrashPage = false) {
  const safeTitle = escapeHtml(note.title);
  const safeContent = escapeHtml(note.content);
  const safeSubject = escapeHtml(note.subject || 'General');
  const dateStr = formatDate(note.updatedAt || note.createdAt);

  const tagsHtml = (note.tags || []).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('');
  const imageHtml = note.imageUrl ? `
    <div class="card-image-wrapper">
      <img src="${escapeHtml(note.imageUrl)}" alt="${safeTitle}" class="card-image" loading="lazy" onerror="this.parentElement.style.display='none'">
    </div>
  ` : '';

  if (isTrashPage) {
    return `
      <div class="note-card" data-id="${note._id}">
        <div class="card-top">
          <span class="subject-badge" data-subject="${safeSubject}">${safeSubject}</span>
        </div>
        ${imageHtml}
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
      ${imageHtml}
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

// Attach card button events (pin, fav, trash, restore, delete)
function attachCardEvents(container, refreshCallback) {
  const triggerRefresh = () => {
    if (typeof refreshCallback === 'function') {
      refreshCallback();
    } else if (typeof window.reloadNotes === 'function') {
      window.reloadNotes();
    } else if (typeof window.loadDashboardData === 'function') {
      window.loadDashboardData();
    }
    updateSidebarBadges();
  };

  // Pin toggle
  container.querySelectorAll('.pin-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const currentPinned = btn.dataset.pinned === 'true';
      try {
        await authFetch(`/notes/${id}/pin`, {
          method: 'PATCH',
          body: JSON.stringify({ pinned: !currentPinned })
        });
        showToast(!currentPinned ? 'Note pinned to top' : 'Note unpinned', 'success');
        triggerRefresh();
      } catch (err) {
        showToast('Failed to toggle pin', 'error');
      }
    });
  });

  // Favorite toggle
  container.querySelectorAll('.fav-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const currentFav = btn.dataset.favorite === 'true';
      try {
        await authFetch(`/notes/${id}/favorite`, {
          method: 'PATCH',
          body: JSON.stringify({ favorite: !currentFav })
        });
        showToast(!currentFav ? 'Added to favorites' : 'Removed from favorites', 'success');
        triggerRefresh();
      } catch (err) {
        showToast('Failed to toggle favorite', 'error');
      }
    });
  });

  // Soft delete to trash
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
        triggerRefresh();
      } catch (err) {
        showToast('Failed to delete note', 'error');
      }
    });
  });

  // Restore from trash
  container.querySelectorAll('.restore-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      try {
        await authFetch(`/notes/${id}/restore`, {
          method: 'PATCH'
        });
        showToast('Note restored successfully!', 'success');
        triggerRefresh();
      } catch (err) {
        showToast('Failed to restore note', 'error');
      }
    });
  });

  // Permanent delete
  container.querySelectorAll('.perm-delete-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Permanently delete this note? This action cannot be undone.')) return;

      try {
        await authFetch(`/notes/${id}/permanent`, {
          method: 'DELETE'
        });
        showToast('Note permanently deleted', 'info');
        triggerRefresh();
      } catch (err) {
        showToast('Failed to delete note permanently', 'error');
      }
    });
  });
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebarUser();
  updateSidebarBadges();
});

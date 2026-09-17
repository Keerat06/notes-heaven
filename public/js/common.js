/* ==========================================================
   NOTES HEAVEN - Common Utilities & Auth Helper
   ========================================================== */

const API_BASE = '/api';

// Auth State Management
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

// Authenticated fetch wrapper
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
      // Token expired or invalid
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
    console.error('API Error:', error);
    throw error;
  }
}

// Page Auth Guard
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

// Theme Management (Light / Dark)
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

// Render User in Sidebar
function initSidebarUser() {
  const user = Auth.getUser();
  if (!user) return;

  const nameEl = document.querySelector('.user-name');
  const emailEl = document.querySelector('.user-email');
  const avatarEl = document.querySelector('.user-avatar');

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  // Logout button
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.clearAuth();
      showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    });
  }

  // Mobile Menu Toggle
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// Update Badge Counts in Sidebar
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

// Toast Notifications
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
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format Date Utility
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Global DOM Ready Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebarUser();
  updateSidebarBadges();
});

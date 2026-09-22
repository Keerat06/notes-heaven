// Dashboard logic

document.addEventListener('DOMContentLoaded', async () => {
  if (!guardPage(true)) return;

  const user = Auth.getUser();
  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl && user) {
    greetingEl.textContent = `Welcome back, ${escapeHtml(user.name)} 👋`;
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    const data = await authFetch('/notes/stats');
    if (!data.success) throw new Error('Could not fetch stats');

    const { stats } = data;

  // Update stat numbers
    const totalEl = document.getElementById('statTotal');
    const favEl = document.getElementById('statFavorites');
    const pinEl = document.getElementById('statPinned');
    const subjCountEl = document.getElementById('statSubjects');

    if (totalEl) totalEl.textContent = stats.total;
    if (favEl) favEl.textContent = stats.favorites;
    if (pinEl) pinEl.textContent = stats.pinned;
    if (subjCountEl) subjCountEl.textContent = stats.subjectsCount;

  // Render subjects
    renderSubjectsRow(stats.subjects);

  // Render recent notes
    renderRecentNotes(stats.recentNotes);

  } catch (error) {
    showToast('Failed to load dashboard metrics', 'error');
  }
}

// Expose globally for refresh
window.loadDashboardData = loadDashboardData;

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
        <p class="empty-subtitle">Create your first note or load sample starter notes.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 16px;">
          <a href="/editor.html" class="btn btn-primary">➕ Create First Note</a>
          <button id="seedBtn" class="btn btn-secondary" onclick="seedSampleNotes()">📚 Load Sample Notes</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = notes.map(note => createNoteCardHtml(note)).join('');
  attachCardEvents(container, loadDashboardData);
}

// Seed sample notes
async function seedSampleNotes() {
  try {
    const seedBtn = document.getElementById('seedBtn');
    if (seedBtn) {
      seedBtn.disabled = true;
      seedBtn.textContent = 'Loading samples...';
    }

    await authFetch('/notes/seed', { method: 'POST' });
    showToast('Starter notes created successfully!', 'success');
    await loadDashboardData();
    updateSidebarBadges();
  } catch (err) {
    showToast('Failed to seed notes', 'error');
  }
}

window.seedSampleNotes = seedSampleNotes;

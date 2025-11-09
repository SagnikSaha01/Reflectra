// MindTime Popup Script

const API_ENDPOINT = 'http://localhost:3000/api';
const THEME_STORAGE_KEY = 'reflectra-popup-theme';

// Live timer for current tab
let timerInterval = null;

// Session merging utilities (same as dashboard)
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch {
    return url;
  }
}

function mergeDuplicateSessions(sessionsList, mergeWindow = 300000) {
  if (!sessionsList || sessionsList.length === 0) return [];

  const sorted = [...sessionsList].sort((a, b) => a.timestamp - b.timestamp);
  const merged = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastInGroup = currentGroup[currentGroup.length - 1];

    const currentNormalizedUrl = normalizeUrl(current.url);
    const lastNormalizedUrl = normalizeUrl(lastInGroup.url);

    const isSameUrl = currentNormalizedUrl === lastNormalizedUrl;
    const isSameTitle = current.title === lastInGroup.title;
    const timeBetweenStarts = current.timestamp - lastInGroup.timestamp;
    const isWithinWindow = timeBetweenStarts <= mergeWindow;

    if (isSameUrl && isSameTitle && isWithinWindow) {
      currentGroup.push(current);
    } else {
      if (currentGroup.length > 1) {
        const mergedSession = {
          ...currentGroup[0],
          duration: currentGroup.reduce((sum, s) => sum + s.duration, 0),
          id: currentGroup[0].id,
          mergedCount: currentGroup.length
        };
        merged.push(mergedSession);
      } else {
        merged.push(currentGroup[0]);
      }
      currentGroup = [current];
    }
  }

  if (currentGroup.length > 1) {
    const mergedSession = {
      ...currentGroup[0],
      duration: currentGroup.reduce((sum, s) => sum + s.duration, 0),
      id: currentGroup[0].id,
      mergedCount: currentGroup.length
    };
    merged.push(mergedSession);
  } else if (currentGroup.length > 0) {
    merged.push(currentGroup[0]);
  }

  return merged;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    if (theme === 'dark') {
      toggleBtn.classList.add('dark');
    } else {
      toggleBtn.classList.remove('dark');
    }
  }
}

function initThemeToggle() {
  let storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!storedTheme) {
    storedTheme = 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
  }
  applyTheme(storedTheme);

  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

async function updateCurrentTabTime() {
  try {
    // Get current session data from background script
    const response = await chrome.runtime.sendMessage({ action: 'getCurrentSession' });

    if (response && response.startTime) {
      const elapsed = Date.now() - response.startTime;
      document.getElementById('currentTabTime').textContent = formatLiveTime(elapsed);
      document.getElementById('currentTabTitle').textContent = response.title || response.url || 'Current tab';
    } else {
      document.getElementById('currentTabTime').textContent = '0:00';
      document.getElementById('currentTabTitle').textContent = 'No active session';
    }
  } catch (error) {
    console.error('Error updating current tab time:', error);
  }
}

function formatLiveTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Start live timer updates
function startLiveTimer() {
  updateCurrentTabTime(); // Update immediately
  timerInterval = setInterval(updateCurrentTabTime, 1000); // Update every second
}

// Stop timer when popup closes
window.addEventListener('unload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

async function loadTodayStats() {
  try {
    // Get today's timestamp
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    // Fetch both stats and raw sessions
    const [statsResponse, sessionsResponse] = await Promise.all([
      fetch(`${API_ENDPOINT}/stats/today`),
      fetch(`${API_ENDPOINT}/sessions?startDate=${todayTimestamp}&limit=1000`)
    ]);

    const data = await statsResponse.json();
    const sessions = await sessionsResponse.json();

    // Calculate merged session count
    const mergedSessions = mergeDuplicateSessions(sessions);
    const mergedSessionCount = mergedSessions.length;

    // Update UI with merged session count
    document.getElementById('sessionCount').textContent = mergedSessionCount || 0;
    document.getElementById('totalTime').textContent = formatTime(data.totalTime || 0);
    document.getElementById('wellnessScore').textContent = data.wellnessScore || '--';

    // Display categories
    const categoriesDiv = document.getElementById('categories');
    categoriesDiv.innerHTML = '';

    if (data.categories && data.categories.length > 0) {
      data.categories.forEach(cat => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category';
        categoryEl.innerHTML = `
          <div class="category-name">${cat.name}</div>
          <div class="category-time">${formatTime(cat.time)}</div>
        `;
        categoryEl.style.borderLeft = `4px solid ${cat.color}`;
        categoriesDiv.appendChild(categoryEl);
      });
    } else {
      categoriesDiv.innerHTML = '<p style="color: #999; font-size: 14px;">No activity yet today</p>';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    document.getElementById('categories').innerHTML =
      '<p style="color: #ff6b6b; font-size: 14px;">Unable to connect to server</p>';
  }
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3001' });
});

// Initialize theme, load stats and start live timer on popup open
initThemeToggle();
loadTodayStats();
startLiveTimer();

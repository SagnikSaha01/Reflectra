// Reflectra Popup Script

const API_ENDPOINT = 'http://localhost:3000/api';

// UI Elements
const authView = document.getElementById('authView');
const mainView = document.getElementById('mainView');
const googleLoginBtn = document.getElementById('googleLogin');
const emailLoginBtn = document.getElementById('emailLogin');
const logoutBtn = document.getElementById('logout');
const userEmailEl = document.getElementById('userEmail');

// Check authentication status and show appropriate view
async function checkAuthAndUpdateUI() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    const user = await getCurrentUser();
    showMainView(user);
    await loadTodayStats();
  } else {
    showAuthView();
  }
}

function showAuthView() {
  authView.classList.remove('hidden');
  mainView.classList.add('hidden');
}

function showMainView(user) {
  authView.classList.add('hidden');
  mainView.classList.remove('hidden');

  if (user && user.email) {
    userEmailEl.textContent = user.email;
  }
}

async function loadTodayStats() {
  try {
    const token = await getAccessToken();

    if (!token) {
      console.error('No access token available');
      return;
    }

    const response = await fetch(`${API_ENDPOINT}/stats/today`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized, show auth view
        await clearAuthState();
        showAuthView();
        return;
      }
      throw new Error('Failed to load stats');
    }

    const data = await response.json();

    // Update UI
    document.getElementById('sessionCount').textContent = data.sessionCount || 0;
    document.getElementById('totalTime').textContent = formatTime(data.totalTime || 0);
    document.getElementById('wellnessScore').textContent = data.wellnessScore || '--';

    // Display categories
    const categoriesDiv = document.getElementById('categories');
    categoriesDiv.innerHTML = '';

    if (data.categories && data.categories.length > 0) {
      data.categories.forEach(cat => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category';
        categoryEl.style.borderLeftColor = cat.color || '#4CAF50';
        categoryEl.innerHTML = `
          <div class="category-name">${cat.name}</div>
          <div class="category-time">${formatTime(cat.time)}</div>
        `;
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

// Event Listeners
const openLoginPageBtn = document.getElementById('openLoginPage');
const syncSessionBtn = document.getElementById('syncSession');

openLoginPageBtn.addEventListener('click', () => {
  // Open dashboard login page
  chrome.tabs.create({ url: 'http://localhost:3001/login' });
});

syncSessionBtn.addEventListener('click', async () => {
  try {
    syncSessionBtn.disabled = true;
    syncSessionBtn.textContent = 'Syncing...';

    // Query the dashboard tab to get localStorage
    const tabs = await chrome.tabs.query({ url: 'http://localhost:3001/*' });

    if (tabs.length === 0) {
      alert('Please open the dashboard first and log in!');
      syncSessionBtn.disabled = false;
      syncSessionBtn.textContent = 'Sync Session from Dashboard';
      return;
    }

    // Execute script in dashboard tab to get auth data
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        return localStorage.getItem('reflectra_auth');
      }
    });

    const authDataStr = results[0].result;

    if (!authDataStr) {
      alert('No login session found. Please log in on the dashboard first!');
      syncSessionBtn.disabled = false;
      syncSessionBtn.textContent = 'Sync Session from Dashboard';
      return;
    }

    // Parse and save to extension storage
    const authData = JSON.parse(authDataStr);
    await saveAuthState(authData);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'AUTH_STATUS_CHANGED',
      isAuthenticated: true
    });

    alert('Session synced successfully!');
    await checkAuthAndUpdateUI();
  } catch (error) {
    console.error('Sync error:', error);
    alert('Failed to sync session. Make sure you\'re logged in on the dashboard.');
  } finally {
    syncSessionBtn.disabled = false;
    syncSessionBtn.textContent = 'Sync Session from Dashboard';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await logout();

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'AUTH_STATUS_CHANGED',
      isAuthenticated: false
    });

    showAuthView();
  } catch (error) {
    console.error('Logout error:', error);
  }
});

document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3001' });
});

// Initialize on popup open
checkAuthAndUpdateUI();

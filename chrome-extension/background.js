// Reflectra Background Service Worker
// Tracks tab activity and manages session data

// Import auth module functions
importScripts('auth.js');

const API_ENDPOINT = 'http://localhost:3000/api';

let currentSession = {
  url: null,
  title: null,
  startTime: null,
  tabId: null
};

let isUserAuthenticated = false;

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await endCurrentSession();
  await startNewSession(activeInfo.tabId);
});

// Track tab updates (URL changes within same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await endCurrentSession();
    await startNewSession(tabId);
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User switched away from browser
    await endCurrentSession();
  } else {
    // User returned to browser
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab) {
      await startNewSession(activeTab.id);
    }
  }
});

async function startNewSession(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);

    // Ignore chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    currentSession = {
      url: tab.url,
      title: tab.title,
      startTime: Date.now(),
      tabId: tabId
    };

    console.log('Started session:', currentSession);
  } catch (error) {
    console.error('Error starting session:', error);
  }
}

async function endCurrentSession() {
  if (!currentSession.startTime) return;

  const duration = Date.now() - currentSession.startTime;

  // Only track sessions longer than 3 seconds
  if (duration < 3000) {
    currentSession = { url: null, title: null, startTime: null, tabId: null };
    return;
  }

  const sessionData = {
    url: currentSession.url,
    title: currentSession.title,
    duration: duration,
    timestamp: currentSession.startTime
  };

  // Save to local storage
  await saveSessionLocally(sessionData);

  // Send to backend API
  await sendToBackend(sessionData);

  currentSession = { url: null, title: null, startTime: null, tabId: null };
}

async function saveSessionLocally(sessionData) {
  try {
    const { sessions = [] } = await chrome.storage.local.get('sessions');
    sessions.push(sessionData);

    // Keep only last 500 sessions locally
    if (sessions.length > 500) {
      sessions.shift();
    }

    await chrome.storage.local.set({ sessions });
  } catch (error) {
    console.error('Error saving locally:', error);
  }
}

async function sendToBackend(sessionData) {
  try {
    console.log('🔄 Attempting to send session to backend:', sessionData);

    // Check if user is authenticated
    const authenticated = await isAuthenticated();
    console.log('🔄 Is authenticated:', authenticated);

    if (!authenticated) {
      console.log('❌ User not authenticated, skipping backend sync');
      return;
    }

    const token = await getAccessToken();
    console.log('🔄 Access token:', token ? token.substring(0, 20) + '...' : 'null');

    if (!token) {
      console.error('❌ No access token available');
      return;
    }

    console.log('🔄 Sending POST request to:', `${API_ENDPOINT}/sessions`);
    const response = await fetch(`${API_ENDPOINT}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sessionData)
    });

    console.log('🔄 Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('❌ Failed to send session to backend');
      console.error('❌ Status:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error body:', errorText);

      // If unauthorized, clear auth and notify user
      if (response.status === 401) {
        console.error('❌ Unauthorized - clearing auth state');
        await clearAuthState();
        isUserAuthenticated = false;
      }
    } else {
      const responseData = await response.json();
      console.log('✅ Session saved successfully! ID:', responseData.id);
    }
  } catch (error) {
    console.error('❌ Error sending to backend:', error);
  }
}

// Periodic sync - categorize uncategorized sessions
chrome.alarms.create('categorizeSessions', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'categorizeSessions') {
    try {
      if (!await isAuthenticated()) {
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        return;
      }

      await fetch(`${API_ENDPOINT}/sessions/categorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error triggering categorization:', error);
    }
  }
});

// Check authentication status on startup
(async () => {
  isUserAuthenticated = await isAuthenticated();
  console.log('Reflectra background service worker initialized');
  console.log('Authentication status:', isUserAuthenticated);

  if (!isUserAuthenticated) {
    console.log('User not authenticated. Please log in via the extension popup.');
  }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_STATUS_CHANGED') {
    isUserAuthenticated = message.isAuthenticated;
    console.log('Auth status changed:', isUserAuthenticated);
  }
});

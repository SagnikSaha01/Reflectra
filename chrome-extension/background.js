// Reflectra Background Service Worker
// Tracks tab activity and manages session data

const API_ENDPOINT = 'http://localhost:3000/api';

let currentSession = {
  url: null,
  title: null,
  startTime: null,
  tabId: null
};

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
    const response = await fetch(`${API_ENDPOINT}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    if (!response.ok) {
      console.error('Failed to send session to backend');
    }
  } catch (error) {
    console.error('Error sending to backend:', error);
  }
}

// Periodic sync - categorize uncategorized sessions
chrome.alarms.create('categorizeSessions', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'categorizeSessions') {
    try {
      await fetch(`${API_ENDPOINT}/sessions/categorize`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error triggering categorization:', error);
    }
  }
});

console.log('Reflectra background service worker initialized');

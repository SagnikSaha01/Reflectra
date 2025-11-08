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
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // If switching to a chrome:// or extension page, don't end the session
    // The user is likely just opening settings or the extension popup
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('Ignoring switch to internal Chrome page:', tab.url);
      return;
    }

    await endCurrentSession();
    await startNewSession(activeInfo.tabId);
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Track tab updates (URL changes within same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only restart session if the URL actually changed and it's the active tab
  if (changeInfo.url && tab.active) {
    // Check if this is a meaningful URL change (not just hash/query params on same page)
    const oldUrl = currentSession.url;
    const newUrl = changeInfo.url;

    // If URL changed to a different page, restart the session
    if (oldUrl !== newUrl) {
      await endCurrentSession();
      await startNewSession(tabId);
    }
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
  if (!currentSession.startTime) {
    console.log('No active session to end');
    return;
  }

  const duration = Date.now() - currentSession.startTime;
  const sessionTitle = currentSession.title || currentSession.url;

  // Only track sessions longer than 3 seconds
  if (duration < 3000) {
    console.log(`Session too short (${Math.round(duration / 1000)}s), not saving:`, sessionTitle);
    currentSession = { url: null, title: null, startTime: null, tabId: null };
    return;
  }

  const sessionData = {
    url: currentSession.url,
    title: currentSession.title,
    duration: duration,
    timestamp: currentSession.startTime
  };

  // Reset current session BEFORE saving to prevent double-saves
  currentSession = { url: null, title: null, startTime: null, tabId: null };

  // Log the session being saved with human-readable time and caller info
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  console.log(`✓ SAVING SESSION: "${sessionData.title}" - Duration: ${minutes}m ${seconds}s (${duration}ms)`);
  console.trace('Called from:'); // Shows stack trace to identify caller

  // Save to local storage
  await saveSessionLocally(sessionData);

  // Send to backend API
  await sendToBackend(sessionData);
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

// Message listener for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentSession') {
    // Send current session data to popup
    sendResponse({
      url: currentSession.url,
      title: currentSession.title,
      startTime: currentSession.startTime,
      tabId: currentSession.tabId
    });
  }
  return true; // Keep message channel open for async response
});

console.log('Reflectra background service worker initialized');

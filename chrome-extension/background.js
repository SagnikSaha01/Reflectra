// Reflectra Background Service Worker
// Tracks tab activity and manages session data

const API_ENDPOINT = 'http://localhost:3000/api';

let currentSession = {
  url: null,
  title: null,
  startTime: null,
  tabId: null
};

// Prevent concurrent session transitions
let isProcessingTransition = false;

// Periodic session saving to prevent data loss
let periodicSaveInterval = null;
const SAVE_INTERVAL = 30000; // Save every 30 seconds if session is active

// Wellness notifications
const BREAK_REMINDER_INTERVAL = 1 * 60 * 1000; // 30 minutes
let breakReminderTimeout = null;
let lastBreakNotification = null;

// For demo: Sleep reminder will trigger immediately on first session
// In production: Only shows between 1am-7am
const DEMO_MODE = true; // Set to false in production
let sleepReminderShown = false;

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // End current session immediately (no debounce for better accuracy)
    if (isProcessingTransition) return;
    isProcessingTransition = true;

    try {
      // End the old session right away
      await endCurrentSession();

      // Small delay before starting new session to let tab load
      await new Promise(resolve => setTimeout(resolve, 50));

      const tab = await chrome.tabs.get(activeInfo.tabId);

      // If switching to chrome://, extension, or localhost pages, don't start a new session
      if (tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.includes('localhost') ||
          tab.url.includes('127.0.0.1')) {
        console.log('Ignoring switch to internal/localhost page:', tab.url);
        isProcessingTransition = false;
        return;
      }

      await startNewSession(activeInfo.tabId);
    } finally {
      isProcessingTransition = false;
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
    isProcessingTransition = false;
  }
});

// Track tab updates (URL changes within same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only restart session if the URL actually changed and it's the active tab
  if (changeInfo.url && tab.active) {
    // Check if this is a meaningful URL change (not just hash/query params on same page)
    const oldUrl = currentSession.url;
    const newUrl = changeInfo.url;

    // If URL changed to a different page, restart the session immediately
    if (oldUrl !== newUrl) {
      if (isProcessingTransition) return;
      isProcessingTransition = true;

      try {
        await endCurrentSession();
        await startNewSession(tabId);
      } finally {
        isProcessingTransition = false;
      }
    }
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (isProcessingTransition) return;
  isProcessingTransition = true;

  try {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // User switched away from browser - save immediately
      await endCurrentSession();
    } else {
      // User returned to browser - start tracking immediately
      const [activeTab] = await chrome.tabs.query({ active: true, windowId });
      if (activeTab) {
        await startNewSession(activeTab.id);
      }
    }
  } finally {
    isProcessingTransition = false;
  }
});

async function startNewSession(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);

    // Ignore chrome://, extension pages, and localhost
    if (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.includes('localhost') ||
        tab.url.includes('127.0.0.1')) {
      console.log('Ignoring internal/localhost page:', tab.url);
      return;
    }

    currentSession = {
      url: tab.url,
      title: tab.title,
      startTime: Date.now(),
      tabId: tabId,
      lastSaveTime: null // Track when we last saved this session
    };

    console.log('Started session:', currentSession);

    // Start periodic saving for long sessions
    startPeriodicSave();

    // Start break reminder timer (30 min on same tab)
    scheduleBreakReminder();

    // Check if it's late night and show sleep reminder (DEMO: shows immediately for testing)
    try {
      await checkAndShowSleepReminder();
    } catch (err) {
      console.error('❌ Error in checkAndShowSleepReminder:', err);
    }
  } catch (error) {
    console.error('Error starting session:', error);
  }
}

function startPeriodicSave() {
  // Clear any existing interval
  if (periodicSaveInterval) {
    clearInterval(periodicSaveInterval);
  }

  // Save session progress every 30 seconds
  periodicSaveInterval = setInterval(async () => {
    if (currentSession.startTime) {
      await saveSessionProgress();
    }
  }, SAVE_INTERVAL);
}

async function saveSessionProgress() {
  if (!currentSession.startTime) return;

  const now = Date.now();
  const totalDuration = now - currentSession.startTime;

  // Only save if session is longer than 3 seconds
  if (totalDuration < 3000) return;

  // Calculate duration since last save
  const durationToSave = currentSession.lastSaveTime
    ? now - currentSession.lastSaveTime
    : totalDuration;

  const sessionData = {
    url: currentSession.url,
    title: currentSession.title,
    duration: durationToSave,
    timestamp: currentSession.lastSaveTime || currentSession.startTime
  };

  // Update last save time
  currentSession.lastSaveTime = now;

  console.log(`💾 Saving progress: "${sessionData.title}" - ${Math.round(durationToSave / 1000)}s`);

  // Save locally and to backend
  await saveSessionLocally(sessionData);
  await sendToBackend(sessionData);
}

async function endCurrentSession() {
  if (!currentSession.startTime) {
    console.log('No active session to end');
    return;
  }

  // Stop periodic saving
  if (periodicSaveInterval) {
    clearInterval(periodicSaveInterval);
    periodicSaveInterval = null;
  }

  // Clear break reminder
  clearBreakReminder();

  const now = Date.now();
  const sessionTitle = currentSession.title || currentSession.url;

  // Calculate remaining duration since last save
  const durationSinceLastSave = currentSession.lastSaveTime
    ? now - currentSession.lastSaveTime
    : now - currentSession.startTime;

  // Only save if there's remaining time to record (at least 3 seconds)
  if (durationSinceLastSave >= 3000) {
    const sessionData = {
      url: currentSession.url,
      title: currentSession.title,
      duration: durationSinceLastSave,
      timestamp: currentSession.lastSaveTime || currentSession.startTime
    };

    // Log the final chunk being saved
    const minutes = Math.floor(durationSinceLastSave / 60000);
    const seconds = Math.floor((durationSinceLastSave % 60000) / 1000);
    console.log(`✓ SAVING FINAL: "${sessionData.title}" - Duration: ${minutes}m ${seconds}s (${durationSinceLastSave}ms)`);

    // Save to local storage
    await saveSessionLocally(sessionData);

    // Send to backend API
    await sendToBackend(sessionData);
  } else {
    console.log(`Final chunk too short (${Math.round(durationSinceLastSave / 1000)}s), not saving:`, sessionTitle);
  }

  // Reset current session
  currentSession = { url: null, title: null, startTime: null, tabId: null, lastSaveTime: null };
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

// Save session when browser closes or extension unloads
chrome.runtime.onSuspend.addListener(async () => {
  console.log('Extension suspending - saving current session');
  await endCurrentSession();
});

// Handle browser shutdown - try to save current session
self.addEventListener('beforeunload', async () => {
  console.log('Browser closing - saving current session');
  await endCurrentSession();
});

// ========== WELLNESS NOTIFICATIONS ==========

// Schedule a break reminder after 30 minutes on same tab
function scheduleBreakReminder() {
  // Clear any existing timeout
  if (breakReminderTimeout) {
    clearTimeout(breakReminderTimeout);
  }

  // Set new timeout for 30 minutes
  breakReminderTimeout = setTimeout(() => {
    showBreakReminder();
  }, BREAK_REMINDER_INTERVAL);

  console.log('⏰ Break reminder scheduled for 30 minutes');
}

// Show break reminder notification
async function showBreakReminder() {
  const now = Date.now();

  // Don't show if we showed one in the last 15 minutes
  if (lastBreakNotification && (now - lastBreakNotification < 15 * 60 * 1000)) {
    console.log('Skipping break reminder - too soon since last one');
    return;
  }

  const messages = [
    {
      title: "Time for a Break! 🌟",
      message: "You've been on this tab for 30 minutes. How about stretching, hydrating, or taking a quick walk?"
    },
    {
      title: "Break Reminder 💆",
      message: "30 minutes of focus! Consider giving your eyes a rest with the 20-20-20 rule: Look 20 feet away for 20 seconds."
    },
    {
      title: "Wellness Check ✨",
      message: "Time flies! You've been here for 30 minutes. A short break can boost your productivity."
    },
    {
      title: "Stretch Time! 🧘",
      message: "30 minutes passed! Stand up, stretch, and give your mind a quick refresh."
    }
  ];

  // Pick a random message
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    const notificationId = await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: randomMessage.title,
      message: randomMessage.message,
      priority: 1
    });

    lastBreakNotification = now;
    console.log('📢 Showed break reminder notification with ID:', notificationId);
    console.log('   Title:', randomMessage.title);
    console.log('   Message:', randomMessage.message);

    // Schedule next reminder if still on same tab
    scheduleBreakReminder();
  } catch (error) {
    console.error('❌ Error showing break notification:', error);
    console.error('   Error details:', error.message);
  }
}

// Check if it's late night (1am-7am) and show sleep reminder
async function checkAndShowSleepReminder() {
  console.log('🌙 Checking sleep reminder - DEMO_MODE:', DEMO_MODE, 'sleepReminderShown:', sleepReminderShown);

  // DEMO MODE: Show immediately for testing purposes
  if (DEMO_MODE && !sleepReminderShown) {
    console.log('🌙 DEMO MODE: Showing sleep reminder now');
    await showSleepReminder();
    sleepReminderShown = true;
    return;
  }

  // PRODUCTION MODE: Only show during late night hours (1am-7am)
  if (!DEMO_MODE) {
    const currentHour = new Date().getHours();
    const isLateNight = currentHour >= 1 && currentHour < 7;

    if (isLateNight && !sleepReminderShown) {
      await showSleepReminder();
      sleepReminderShown = true;

      // Reset flag at 7am
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setHours(7, 0, 0, 0);

      // If current time is past 7am, set for tomorrow
      if (now > resetTime) {
        resetTime.setDate(resetTime.getDate() + 1);
      }

      const timeUntilReset = resetTime - now;
      setTimeout(() => {
        sleepReminderShown = false;
      }, timeUntilReset);
    }
  }
}

// Show sleep reminder notification
async function showSleepReminder() {
  const currentHour = new Date().getHours();
  const demoMessage = DEMO_MODE ? " [DEMO MODE - Would normally show at 1am-7am]" : "";

  const messages = [
    {
      title: "😴 Consider Getting Some Rest",
      message: `It's ${currentHour >= 1 && currentHour < 12 ? 'late night' : 'early morning'}. Your body and mind need quality sleep for optimal wellness.${demoMessage}`
    },
    {
      title: "💤 Time to Sleep?",
      message: `Late night browsing detected. Good sleep is essential for your health and productivity.${demoMessage}`
    },
    {
      title: "🌙 Sleep Reminder",
      message: `It's late! Consider winding down for better sleep quality and morning energy.${demoMessage}`
    }
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    const notificationId = await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: randomMessage.title,
      message: randomMessage.message,
      priority: 2,
      requireInteraction: true // Makes it stay until dismissed
    });

    console.log('📢 Showed sleep reminder notification with ID:', notificationId);
    console.log('   Title:', randomMessage.title);
    console.log('   Message:', randomMessage.message);
  } catch (error) {
    console.error('❌ Error showing sleep notification:', error);
    console.error('   Error details:', error.message);
  }
}

// Clear break reminder when session ends
function clearBreakReminder() {
  if (breakReminderTimeout) {
    clearTimeout(breakReminderTimeout);
    breakReminderTimeout = null;
  }
}

console.log('Reflectra background service worker initialized');

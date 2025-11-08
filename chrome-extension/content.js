// MindTime Content Script
// Runs on every page to capture additional context if needed

// Future enhancements:
// - Track scroll depth
// - Detect reading vs skimming
// - Capture engagement signals (clicks, time spent scrolling)

console.log('MindTime content script loaded on:', window.location.href);

// Detect idle time on page
let lastActivity = Date.now();
let wasIdle = false;

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now();
    if (wasIdle) {
      console.log('User became active again');
      wasIdle = false;
    }
  }, true);
});

// Check for idle every 30 seconds
setInterval(() => {
  const idleTime = Date.now() - lastActivity;
  if (idleTime > 60000 && !wasIdle) { // 1 minute idle, and not already logged
    console.log('User became idle after', Math.floor(idleTime / 1000), 'seconds of inactivity');
    wasIdle = true;
    // Future: Could send idle signal to background script to pause timer
    // chrome.runtime.sendMessage({ action: 'userIdle', idleTime });
  }
}, 30000);

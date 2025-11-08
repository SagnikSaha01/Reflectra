// MindTime Content Script
// Runs on every page to capture additional context if needed

// Future enhancements:
// - Track scroll depth
// - Detect reading vs skimming
// - Capture engagement signals (clicks, time spent scrolling)

console.log('MindTime content script loaded on:', window.location.href);

// Example: Detect idle time on page
let lastActivity = Date.now();

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now();
  }, true);
});

// Check for idle every 30 seconds
setInterval(() => {
  const idleTime = Date.now() - lastActivity;
  if (idleTime > 60000) { // 1 minute idle
    // Could send idle signal to background script
    console.log('User idle for', idleTime / 1000, 'seconds');
  }
}, 30000);

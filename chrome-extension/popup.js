// MindTime Popup Script

const API_ENDPOINT = 'http://localhost:3000/api';

async function loadTodayStats() {
  try {
    const response = await fetch(`${API_ENDPOINT}/stats/today`);
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

document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3001' });
});

// Load stats on popup open
loadTodayStats();

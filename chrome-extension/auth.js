// Authentication module for Reflectra Chrome Extension
// Handles Google OAuth via Supabase

const API_BASE_URL = 'http://localhost:3000/api';

// Get auth state from storage
async function getAuthState() {
  const result = await chrome.storage.local.get(['auth']);
  return result.auth || null;
}

// Save auth state to storage
async function saveAuthState(authData) {
  await chrome.storage.local.set({ auth: authData });
}

// Clear auth state
async function clearAuthState() {
  await chrome.storage.local.remove(['auth']);
}

// Check if user is authenticated
async function isAuthenticated() {
  const auth = await getAuthState();
  if (!auth || !auth.session) {
    return false;
  }

  // Check if token is expired
  const expiresAt = new Date(auth.session.expires_at).getTime();
  const now = Date.now();

  if (expiresAt <= now) {
    // Token expired, try to refresh
    return await refreshToken();
  }

  return true;
}

// Get access token
async function getAccessToken() {
  const auth = await getAuthState();
  if (!auth || !auth.session) {
    return null;
  }

  // Check if token is expired
  const expiresAt = new Date(auth.session.expires_at).getTime();
  const now = Date.now();

  if (expiresAt <= now) {
    // Token expired, try to refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      const newAuth = await getAuthState();
      return newAuth.session.access_token;
    }
    return null;
  }

  return auth.session.access_token;
}

// Refresh access token
async function refreshToken() {
  try {
    const auth = await getAuthState();
    if (!auth || !auth.session || !auth.session.refresh_token) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: auth.session.refresh_token
      })
    });

    if (!response.ok) {
      await clearAuthState();
      return false;
    }

    const data = await response.json();

    await saveAuthState({
      user: auth.user,
      session: data.session
    });

    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await clearAuthState();
    return false;
  }
}

// Initiate Google OAuth login
async function initiateGoogleLogin() {
  try {
    // Get OAuth URL from backend
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        redirectTo: chrome.identity.getRedirectURL('oauth')
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initiate OAuth');
    }

    const data = await response.json();
    const authUrl = data.url;

    // Launch OAuth flow
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          try {
            // Extract code from redirect URL
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');

            if (!code) {
              throw new Error('No authorization code received');
            }

            // Exchange code for session
            const tokenResponse = await fetch(`${API_BASE_URL}/auth/google/callback`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ code })
            });

            if (!tokenResponse.ok) {
              throw new Error('Failed to exchange code for token');
            }

            const tokenData = await tokenResponse.json();

            // Save auth state
            await saveAuthState({
              user: tokenData.user,
              session: tokenData.session
            });

            resolve(tokenData);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error during Google login:', error);
    throw error;
  }
}

// Login with email/password
async function loginWithEmail(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    await saveAuthState({
      user: data.user,
      session: data.session
    });

    return data;
  } catch (error) {
    console.error('Error during email login:', error);
    throw error;
  }
}

// Logout
async function logout() {
  try {
    const token = await getAccessToken();

    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    await clearAuthState();
  }
}

// Get current user
async function getCurrentUser() {
  const auth = await getAuthState();
  return auth ? auth.user : null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAuthState,
    saveAuthState,
    clearAuthState,
    isAuthenticated,
    getAccessToken,
    refreshToken,
    initiateGoogleLogin,
    loginWithEmail,
    logout,
    getCurrentUser
  };
}

const express = require('express');
const router = express.Router();
const supabase = require('../db/database');
const { authenticateUser } = require('../middleware/auth');

/**
 * POST /api/auth/signup
 * Create a new user account with email/password
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName || null
        }
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'Signup failed',
        message: error.message
      });
    }

    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.full_name
      },
      session: data.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user account'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Login failed',
        message: error.message
      });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.full_name,
        avatarUrl: data.user.user_metadata?.avatar_url
      },
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login'
    });
  }
});

/**
 * POST /api/auth/google
 * Initiate Google OAuth flow
 * Returns the OAuth URL for the client to redirect to
 */
router.post('/google', async (req, res) => {
  try {
    const { redirectTo } = req.body;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3001/auth/callback'
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'OAuth initialization failed',
        message: error.message
      });
    }

    res.json({
      url: data.url
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to initiate Google OAuth'
    });
  }
});

/**
 * POST /api/auth/google/callback
 * Handle Google OAuth callback
 * Exchange code for session
 */
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code',
        message: 'Authorization code is required'
      });
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return res.status(400).json({
        error: 'Code exchange failed',
        message: error.message
      });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.full_name,
        avatarUrl: data.user.user_metadata?.avatar_url
      },
      session: data.session
    });
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to complete Google authentication'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout the current user
 */
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);

    const { error } = await supabase.auth.signOut(token);

    if (error) {
      return res.status(400).json({
        error: 'Logout failed',
        message: error.message
      });
    }

    res.json({
      message: 'Successfully logged out'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        displayName: userProfile?.display_name || req.user.full_name,
        avatarUrl: userProfile?.avatar_url || req.user.avatar_url,
        createdAt: userProfile?.created_at,
        lastLoginAt: userProfile?.last_login_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh the access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      return res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }

    res.json({
      session: data.session
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

module.exports = router;

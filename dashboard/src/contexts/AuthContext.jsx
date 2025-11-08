import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedAuth = localStorage.getItem('reflectra_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);

        // Check if token is expired
        const expiresAt = new Date(authData.session.expires_at).getTime();
        const now = Date.now();

        if (expiresAt > now) {
          setUser(authData.user);
          setSession(authData.session);
        } else {
          // Token expired, try to refresh
          refreshToken(authData.session.refresh_token);
        }
      } catch (error) {
        console.error('Error loading auth from storage:', error);
        localStorage.removeItem('reflectra_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
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

      setUser(data.user);
      setSession(data.session);

      localStorage.setItem('reflectra_auth', JSON.stringify({
        user: data.user,
        session: data.session
      }));

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email, password, displayName) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();

      setUser(data.user);
      setSession(data.session);

      localStorage.setItem('reflectra_auth', JSON.stringify({
        user: data.user,
        session: data.session
      }));

      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirectTo: `${window.location.origin}/auth/callback`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Google login');
      }

      const data = await response.json();

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const handleGoogleCallback = async (code) => {
    try {
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('Failed to complete Google login');
      }

      const data = await response.json();

      setUser(data.user);
      setSession(data.session);

      localStorage.setItem('reflectra_auth', JSON.stringify({
        user: data.user,
        session: data.session
      }));

      return data;
    } catch (error) {
      console.error('Google callback error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (session) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSession(null);
      localStorage.removeItem('reflectra_auth');
    }
  };

  const refreshToken = async (refreshToken) => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      setSession(data.session);

      const storedAuth = JSON.parse(localStorage.getItem('reflectra_auth') || '{}');
      localStorage.setItem('reflectra_auth', JSON.stringify({
        user: storedAuth.user,
        session: data.session
      }));

      return data.session;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  };

  const getAccessToken = () => {
    if (!session) return null;

    // Check if token is expired
    const expiresAt = new Date(session.expires_at).getTime();
    const now = Date.now();

    if (expiresAt <= now) {
      // Token expired, try to refresh
      if (session.refresh_token) {
        refreshToken(session.refresh_token);
      }
      return null;
    }

    return session.access_token;
  };

  const value = {
    user,
    session,
    loading,
    login,
    signup,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    getAccessToken,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

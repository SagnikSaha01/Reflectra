import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Supabase returns tokens in the URL hash fragment, not query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Check for access_token in hash (implicit flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');

        // Also check for code in query params (PKCE flow)
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');

        if (accessToken && refreshToken) {
          // Handle implicit flow - tokens are directly in the URL
          const expiresAt = new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString();

          const session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt
          };

          // Get user info from the token
          const userResponse = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (!userResponse.ok) {
            throw new Error('Failed to get user info');
          }

          const userData = await userResponse.json();

          // Save to localStorage
          localStorage.setItem('reflectra_auth', JSON.stringify({
            user: userData.user,
            session: session
          }));

          // Redirect to dashboard
          navigate('/');
        } else if (code) {
          // Handle PKCE flow - exchange code for tokens
          await handleGoogleCallback(code);
          navigate('/');
        } else {
          setError('No authorization code received');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    processCallback();
  }, [handleGoogleCallback, navigate]);

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>Authentication Error</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            style={styles.button}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.spinner}></div>
        <p style={styles.message}>Completing sign in...</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  message: {
    color: '#666',
    fontSize: '16px'
  },
  errorTitle: {
    color: '#c33',
    marginBottom: '12px'
  },
  errorMessage: {
    color: '#666',
    marginBottom: '20px'
  },
  button: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  }
};

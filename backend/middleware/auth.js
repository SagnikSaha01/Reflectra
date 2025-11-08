const supabase = require('../db/database');

/**
 * Middleware to authenticate requests using Supabase Auth
 * Expects Authorization header with Bearer token
 */
const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 Auth Middleware - Request to:', req.method, req.path);

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth Middleware - Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth Middleware - No Bearer token found');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔐 Auth Middleware - Token:', token.substring(0, 20) + '...');

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Auth Middleware - Token validation failed:', error?.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    console.log('✅ Auth Middleware - User authenticated:', user.id, user.email);

    // Attach user information to request object
    req.user = {
      id: user.id,
      email: user.email,
      ...user.user_metadata
    };

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware
 * Does not block request if no token is provided
 * But if token is provided, it must be valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user context
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
    } else {
      req.user = {
        id: user.id,
        email: user.email,
        ...user.user_metadata
      };
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateUser,
  optionalAuth
};

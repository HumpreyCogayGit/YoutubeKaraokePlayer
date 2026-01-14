import express from 'express';
import passport from '../auth.js';
import crypto from 'crypto';

const router = express.Router();

// Temporary storage for auth tokens (in production, use Redis or database)
const authTokens = new Map<string, { userId: number; expires: number }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of authTokens.entries()) {
    if (data.expires < now) {
      authTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // Force account selection on every login
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    
    // For iOS browsers that block cross-domain cookies, use a token exchange
    // Generate a one-time token
    const token = crypto.randomBytes(32).toString('hex');
    const userId = (req.user as any)?.id;
    
    // Store token temporarily (expires in 60 seconds)
    authTokens.set(token, {
      userId: userId,
      expires: Date.now() + 60000
    });
    
    // Save session in case cookies work
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      
      // Redirect to frontend with token
      // Frontend will exchange token for session
      res.redirect(`${frontendUrl}?auth_token=${token}`);
    });
  }
);

// Exchange auth token for session (for iOS mobile browsers)
router.post('/exchange-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  const authData = authTokens.get(token);
  
  if (!authData) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Check if token expired
  if (authData.expires < Date.now()) {
    authTokens.delete(token);
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Token is valid, create session
  try {
    const pool = (await import('../db.js')).default;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [authData.userId]);
    
    if (result.rows.length === 0) {
      authTokens.delete(token);
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Manually set up session for passport
    req.login(result.rows[0], (err) => {
      // Delete the one-time token
      authTokens.delete(token);
      
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      // Save session explicitly
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        
        res.json({ 
          authenticated: true, 
          user: result.rows[0] 
        });
      });
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    authTokens.delete(token);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Destroy the session completely
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Session destruction error:', destroyErr);
      }
      // Clear the session cookie with all possible options
      // Use 'sessionId' to match the custom cookie name in server.ts
      res.clearCookie('sessionId', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
      // Add cache control headers to prevent caching on mobile
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// Check auth status
router.get('/status', (req, res) => {
  // Ensure CORS headers for iOS Safari/Chrome
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;

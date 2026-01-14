import express from 'express';
import passport from '../auth.js';

const router = express.Router();

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
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
      
      // For iOS browsers, we need to help establish the cookie
      // by making the browser visit a same-origin page first
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Logging in...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; flex-direction: column;">
            <h2>Logging you in...</h2>
            <p>Please wait...</p>
          </div>
          <script>
            // Establish session by making an auth check from this domain
            fetch('/auth/status', { 
              credentials: 'include',
              headers: { 'Accept': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
              // Now redirect to frontend with session established
              setTimeout(() => {
                window.location.href = '${frontendUrl}?auth=success&t=' + Date.now();
              }, 500);
            })
            .catch(() => {
              // Redirect anyway
              window.location.href = '${frontendUrl}?auth=success&t=' + Date.now();
            });
          </script>
        </body>
        </html>
      `);
    });
  }
);

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

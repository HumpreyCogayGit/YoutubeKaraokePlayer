import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get current user profile
router.get('/profile', requireAuth, (req, res) => {
  res.json(req.user);
});

// Get user statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    
    const playlistCount = await pool.query(
      'SELECT COUNT(*) FROM playlists WHERE user_id = $1',
      [user.id]
    );

    const songCount = await pool.query(
      `SELECT COUNT(*) FROM playlist_items 
       WHERE playlist_id IN (SELECT id FROM playlists WHERE user_id = $1)`,
      [user.id]
    );

    res.json({
      totalPlaylists: parseInt(playlistCount.rows[0].count),
      totalSongs: parseInt(songCount.rows[0].count),
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

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

// Get all playlists for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const result = await pool.query(
      'SELECT * FROM playlists WHERE user_id = $1 ORDER BY updated_at DESC',
      [user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get a specific playlist with items
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const playlistId = req.params.id;

    const playlistResult = await pool.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, user.id]
    );

    if (playlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM playlist_items WHERE playlist_id = $1 ORDER BY position',
      [playlistId]
    );

    res.json({
      ...playlistResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// Create a new playlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { name, items } = req.body;

    // Create playlist
    const playlistResult = await pool.query(
      'INSERT INTO playlists (user_id, name) VALUES ($1, $2) RETURNING *',
      [user.id, name]
    );

    const playlist = playlistResult.rows[0];

    // Add items if provided
    if (items && items.length > 0) {
      const itemPromises = items.map((item: any, index: number) =>
        pool.query(
          'INSERT INTO playlist_items (playlist_id, video_id, title, thumbnail, channel_title, position) VALUES ($1, $2, $3, $4, $5, $6)',
          [playlist.id, item.id, item.title, item.thumbnail, item.channelTitle, index]
        )
      );
      await Promise.all(itemPromises);
    }

    res.status(201).json(playlist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Update a playlist
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const playlistId = req.params.id;
    const { name, items } = req.body;

    // Verify ownership
    const ownerResult = await pool.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [playlistId, user.id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Update playlist name if provided
    if (name) {
      await pool.query(
        'UPDATE playlists SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [name, playlistId]
      );
    }

    // Update items if provided
    if (items) {
      // Delete existing items
      await pool.query('DELETE FROM playlist_items WHERE playlist_id = $1', [playlistId]);

      // Insert new items
      const itemPromises = items.map((item: any, index: number) =>
        pool.query(
          'INSERT INTO playlist_items (playlist_id, video_id, title, thumbnail, channel_title, position) VALUES ($1, $2, $3, $4, $5, $6)',
          [playlistId, item.id, item.title, item.thumbnail, item.channelTitle, index]
        )
      );
      await Promise.all(itemPromises);
    }

    res.json({ message: 'Playlist updated successfully' });
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete a playlist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const playlistId = req.params.id;

    const result = await pool.query(
      'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [playlistId, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

export default router;

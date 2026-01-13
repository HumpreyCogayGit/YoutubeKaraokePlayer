import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { broadcastPartyUpdate } from './party-stream.js';
import bcrypt from 'bcrypt';

const router = Router();

// Security: Validate numeric IDs to prevent SQL injection
const validateNumericId = (id: string, paramName: string): number => {
  // Check if the string contains only digits
  if (!/^\d+$/.test(id)) {
    throw new Error(`Invalid ${paramName}: must be a positive integer`);
  }
  
  const numericId = parseInt(id, 10);
  
  // Additional checks for NaN and range
  if (isNaN(numericId) || numericId <= 0 || numericId > 2147483647) {
    throw new Error(`Invalid ${paramName}: out of valid range`);
  }
  
  return numericId;
};

// Security: Password strength validation
const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }
  return { valid: true };
};

// Middleware to check authentication
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Generate random 6-character party code
const generatePartyCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create a new party
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;
    const userId = (req.user as any).id;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password required' });
    }

    // Security: Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check if user already has an active party as host
    const existingParty = await pool.query(
      'SELECT id FROM parties WHERE host_user_id = $1 AND is_active = true',
      [userId]
    );

    if (existingParty.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active party. Please end it before creating a new one.' });
    }

    let code = generatePartyCode();
    let attempts = 0;

    // Ensure unique code
    while (attempts < 10) {
      const existing = await pool.query('SELECT id FROM parties WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      code = generatePartyCode();
      attempts++;
    }

    // Security: Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO parties (host_user_id, name, password, code) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, host_user_id, name, code, is_active, created_at, ended_at`,
      [userId, name, hashedPassword, code]
    );

    // Auto-join host as member
    await pool.query(
      'INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, userId]
    );

    // Security: Never return password hash to client
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create party error:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// Join a party
router.post('/join', async (req: Request, res: Response) => {
  try {
    const { code, password, guest_name } = req.body;
    const userId = req.isAuthenticated() ? (req.user as any).id : null;

    if (!code || !password) {
      return res.status(400).json({ error: 'Code and password required' });
    }

    // Require guest name if not authenticated
    if (!userId && !guest_name) {
      return res.status(400).json({ error: 'Guest name required' });
    }

    const partyResult = await pool.query(
      'SELECT * FROM parties WHERE code = $1 AND is_active = true',
      [code.toUpperCase()]
    );

    if (partyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    const party = partyResult.rows[0];

    // Security: Use bcrypt.compare for password verification
    const passwordMatch = await bcrypt.compare(password, party.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Only add as member if user is authenticated
    if (userId) {
      // Check if already a member
      const memberCheck = await pool.query(
        'SELECT id FROM party_members WHERE party_id = $1 AND user_id = $2',
        [party.id, userId]
      );

      if (memberCheck.rows.length === 0) {
        await pool.query(
          'INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)',
          [party.id, userId]
        );
      }
    }

    // Security: Never return password hash to client
    const { password: _, ...partyWithoutPassword } = party;
    res.json(partyWithoutPassword);
  } catch (error) {
    console.error('Join party error:', error);
    res.status(500).json({ error: 'Failed to join party' });
  }
});

// Get current user's active parties
router.get('/my-parties', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const result = await pool.query(
      `SELECT p.id, p.host_user_id, p.name, p.code, p.is_active, p.created_at, p.ended_at,
       u.name as host_name,
       (SELECT COUNT(*) FROM party_members WHERE party_id = p.id) + 
       (SELECT COUNT(DISTINCT added_by_guest_name) FROM party_songs WHERE party_id = p.id AND added_by_guest_name IS NOT NULL) as member_count,
       (SELECT COUNT(*) FROM party_songs WHERE party_id = p.id AND played = false) as pending_songs
       FROM parties p
       JOIN users u ON p.host_user_id = u.id
       JOIN party_members pm ON p.id = pm.party_id
       WHERE pm.user_id = $1 AND p.is_active = true
       ORDER BY p.created_at DESC`,
      [userId]
    );

    // Security: Password is excluded from SELECT query
    res.json(result.rows);
  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ error: 'Failed to get parties' });
  }
});

// Get party details
router.get('/:partyId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Security: Validate partyId to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');
    const userId = (req.user as any).id;

    // Check if user is a member
    const memberCheck = await pool.query(
      'SELECT id FROM party_members WHERE party_id = $1 AND user_id = $2',
      [partyId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this party' });
    }

    const partyResult = await pool.query(
      `SELECT p.id, p.host_user_id, p.name, p.code, p.is_active, p.created_at, p.ended_at,
              u.name as host_name, u.profile_picture as host_picture
       FROM parties p
       JOIN users u ON p.host_user_id = u.id
       WHERE p.id = $1`,
      [partyId]
    );

    if (partyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Security: Password is excluded from SELECT query
    res.json(partyResult.rows[0]);
  } catch (error) {
    console.error('Get party error:', error);
    res.status(500).json({ error: 'Failed to get party' });
  }
});

// Get party songs
router.get('/:partyId/songs', async (req: Request, res: Response) => {
  try {
    // Security: Validate partyId to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');

    const result = await pool.query(
      `SELECT ps.*, 
       COALESCE(u.name, ps.added_by_guest_name, 'Unknown') as added_by_name
       FROM party_songs ps
       LEFT JOIN users u ON ps.added_by_user_id = u.id
       WHERE ps.party_id = $1
       ORDER BY ps.played ASC, ps.added_at ASC`,
      [partyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get party songs error:', error);
    res.status(500).json({ error: 'Failed to get party songs' });
  }
});

// Add song to party
router.post('/:partyId/songs', async (req: Request, res: Response) => {
  try {
    // Security: Validate partyId to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');
    const { video_id, title, thumbnail, channel_title, guest_name } = req.body;
    const userId = req.isAuthenticated() ? (req.user as any).id : null;

    // Require guest name if not authenticated
    if (!userId && !guest_name) {
      return res.status(400).json({ error: 'Guest name required' });
    }

    // Check if authenticated user is a member (skip for guests)
    if (userId) {
      const memberCheck = await pool.query(
        'SELECT id FROM party_members WHERE party_id = $1 AND user_id = $2',
        [partyId, userId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not a member of this party' });
      }
    }

    const result = await pool.query(
      `INSERT INTO party_songs (party_id, video_id, title, thumbnail, channel_title, added_by_user_id, added_by_guest_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [partyId, video_id, title, thumbnail, channel_title, userId, guest_name || null]
    );

    // Fetch the song with added_by_name
    const songWithName = await pool.query(
      `SELECT ps.*, 
       COALESCE(u.name, ps.added_by_guest_name, 'Unknown') as added_by_name
       FROM party_songs ps
       LEFT JOIN users u ON ps.added_by_user_id = u.id
       WHERE ps.id = $1`,
      [result.rows[0].id]
    );

    console.log('[Party] Song added, broadcasting to party', partyId, ':', songWithName.rows[0].title);

    // Broadcast update to all connected clients with the complete song data
    broadcastPartyUpdate(partyId, {
      type: 'song_added',
      song: songWithName.rows[0]
    });

    res.json(songWithName.rows[0]);
  } catch (error) {
    console.error('Add party song error:', error);
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// Mark song as played
router.patch('/:partyId/songs/:songId/played', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Security: Validate IDs to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');
    const songId = validateNumericId(req.params.songId, 'songId');
    const userId = (req.user as any).id;

    // Check if user is the host
    const partyCheck = await pool.query(
      'SELECT host_user_id FROM parties WHERE id = $1',
      [partyId]
    );

    if (partyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (partyCheck.rows[0].host_user_id !== userId) {
      return res.status(403).json({ error: 'Only host can mark songs as played' });
    }

    await pool.query(
      'UPDATE party_songs SET played = true, played_at = CURRENT_TIMESTAMP WHERE id = $1 AND party_id = $2',
      [songId, partyId]
    );

    // Broadcast update to all connected clients
    broadcastPartyUpdate(partyId, {
      type: 'song_played',
      songId: songId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark song played error:', error);
    res.status(500).json({ error: 'Failed to mark song as played' });
  }
});

// Reorder song (move up/down in queue)
router.patch('/:partyId/songs/:songId/reorder', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Security: Validate IDs to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');
    const songId = validateNumericId(req.params.songId, 'songId');
    const { direction } = req.body; // 'up' or 'down'
    const userId = (req.user as any).id;

    // Validate direction
    if (!direction || !['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction. Must be "up" or "down"' });
    }

    // Check if user is the host
    const partyCheck = await pool.query(
      'SELECT host_user_id FROM parties WHERE id = $1',
      [partyId]
    );

    if (partyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (partyCheck.rows[0].host_user_id !== userId) {
      return res.status(403).json({ error: 'Only host can reorder songs' });
    }

    // Get all unplayed songs ordered by added_at
    const songsResult = await pool.query(
      `SELECT id, added_at FROM party_songs 
       WHERE party_id = $1 AND played = false 
       ORDER BY added_at ASC`,
      [partyId]
    );

    const songs = songsResult.rows;
    const currentIndex = songs.findIndex(s => s.id === songId);

    if (currentIndex === -1) {
      return res.status(404).json({ error: 'Song not found or already played' });
    }

    // Calculate new index
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= songs.length) {
      return res.status(400).json({ error: 'Cannot move song in that direction' });
    }

    // Swap the added_at timestamps to reorder
    const currentSong = songs[currentIndex];
    const targetSong = songs[newIndex];

    await pool.query('BEGIN');
    
    try {
      // Swap timestamps
      await pool.query(
        'UPDATE party_songs SET added_at = $1 WHERE id = $2',
        [targetSong.added_at, currentSong.id]
      );
      
      await pool.query(
        'UPDATE party_songs SET added_at = $1 WHERE id = $2',
        [currentSong.added_at, targetSong.id]
      );

      await pool.query('COMMIT');

      // Broadcast full song list update
      const updatedSongs = await pool.query(
        `SELECT ps.*, 
         COALESCE(u.name, ps.added_by_guest_name, 'Unknown') as added_by_name
         FROM party_songs ps
         LEFT JOIN users u ON ps.added_by_user_id = u.id
         WHERE ps.party_id = $1
         ORDER BY ps.played ASC, ps.added_at ASC`,
        [partyId]
      );

      broadcastPartyUpdate(partyId, {
        type: 'songs',
        songs: updatedSongs.rows
      });

      res.json({ success: true });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Reorder song error:', error);
    res.status(500).json({ error: 'Failed to reorder song' });
  }
});

// Delete song from party
router.delete('/:partyId/songs/:songId', async (req: Request, res: Response) => {
  try {
    // Security: Validate IDs to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');
    const songId = validateNumericId(req.params.songId, 'songId');
    const { guest_name } = req.body;
    const userId = req.isAuthenticated() ? (req.user as any).id : null;

    // Get the song details first
    const songResult = await pool.query(
      'SELECT * FROM party_songs WHERE id = $1 AND party_id = $2',
      [songId, partyId]
    );

    if (songResult.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = songResult.rows[0];

    // Check permissions: must be host OR the user/guest who added the song
    const partyCheck = await pool.query(
      'SELECT host_user_id FROM parties WHERE id = $1',
      [partyId]
    );

    if (partyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    const isHost = userId && partyCheck.rows[0].host_user_id === userId;
    const isOwner = (userId && song.added_by_user_id === userId) || 
                    (guest_name && song.added_by_guest_name === guest_name);

    if (!isHost && !isOwner) {
      return res.status(403).json({ error: 'You can only delete your own songs' });
    }

    // Don't allow deletion of currently played song
    if (song.played) {
      return res.status(400).json({ error: 'Cannot delete already played songs' });
    }

    // Delete the song
    await pool.query(
      'DELETE FROM party_songs WHERE id = $1 AND party_id = $2',
      [songId, partyId]
    );

    console.log('[Party] Song deleted, broadcasting update to all clients');

    // Broadcast update to all connected clients
    const updatedSongs = await pool.query(
      `SELECT ps.*, 
       COALESCE(u.name, ps.added_by_guest_name, 'Unknown') as added_by_name
       FROM party_songs ps
       LEFT JOIN users u ON ps.added_by_user_id = u.id
       WHERE ps.party_id = $1
       ORDER BY ps.played ASC, ps.added_at ASC`,
      [partyId]
    );

    console.log('[Party] Broadcasting', updatedSongs.rows.length, 'songs to party', partyId);

    broadcastPartyUpdate(partyId, {
      type: 'songs',
      songs: updatedSongs.rows
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// End party
router.post('/:partyId/end', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Security: Validate partyId to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');
    const userId = (req.user as any).id;

    // Check if user is the host
    const partyCheck = await pool.query(
      'SELECT host_user_id FROM parties WHERE id = $1',
      [partyId]
    );

    if (partyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (partyCheck.rows[0].host_user_id !== userId) {
      return res.status(403).json({ error: 'Only host can end the party' });
    }

    await pool.query(
      'UPDATE parties SET is_active = false, ended_at = CURRENT_TIMESTAMP WHERE id = $1',
      [partyId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('End party error:', error);
    res.status(500).json({ error: 'Failed to end party' });
  }
});

// Get party members
router.get('/:partyId/members', async (req: Request, res: Response) => {
  try {
    // Security: Validate partyId to prevent SQL injection
    const partyId = validateNumericId(req.params.partyId, 'partyId');

    // Get authenticated members
    const authMembers = await pool.query(
      `SELECT u.id, u.name, u.profile_picture, pm.joined_at, 'user' as member_type
       FROM party_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.party_id = $1`,
      [partyId]
    );

    // Get unique guest names
    const guestMembers = await pool.query(
      `SELECT DISTINCT added_by_guest_name as name, 
              MIN(added_at) as joined_at,
              'guest' as member_type
       FROM party_songs
       WHERE party_id = $1 AND added_by_guest_name IS NOT NULL
       GROUP BY added_by_guest_name`,
      [partyId]
    );

    // Combine and format results
    const allMembers = [
      ...authMembers.rows,
      ...guestMembers.rows.map(guest => ({
        id: null,
        name: guest.name,
        profile_picture: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guest.name) + '&background=10b981&color=fff',
        joined_at: guest.joined_at,
        member_type: guest.member_type
      }))
    ].sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

    res.json(allMembers);
  } catch (error) {
    console.error('Get party members error:', error);
    res.status(500).json({ error: 'Failed to get party members' });
  }
});

export default router;

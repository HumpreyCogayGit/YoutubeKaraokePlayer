import { Router, Request, Response } from 'express';
import pool from '../db.js';

const router = Router();

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

    const result = await pool.query(
      `INSERT INTO parties (host_user_id, name, password, code) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, name, password, code]
    );

    // Auto-join host as member
    await pool.query(
      'INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, userId]
    );

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

    if (party.password !== password) {
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

    res.json(party);
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
      `SELECT p.*, u.name as host_name,
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

    res.json(result.rows);
  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ error: 'Failed to get parties' });
  }
});

// Get party details
router.get('/:partyId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
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
      `SELECT p.*, u.name as host_name, u.profile_picture as host_picture
       FROM parties p
       JOIN users u ON p.host_user_id = u.id
       WHERE p.id = $1`,
      [partyId]
    );

    if (partyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json(partyResult.rows[0]);
  } catch (error) {
    console.error('Get party error:', error);
    res.status(500).json({ error: 'Failed to get party' });
  }
});

// Get party songs
router.get('/:partyId/songs', async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;

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
    const { partyId } = req.params;
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add party song error:', error);
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// Mark song as played
router.patch('/:partyId/songs/:songId/played', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { partyId, songId } = req.params;
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

    res.json({ success: true });
  } catch (error) {
    console.error('Mark song played error:', error);
    res.status(500).json({ error: 'Failed to mark song as played' });
  }
});

// End party
router.post('/:partyId/end', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
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
    const { partyId } = req.params;

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

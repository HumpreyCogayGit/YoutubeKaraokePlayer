import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { streamLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// In-memory store for active SSE connections
const activeConnections = new Map<number, Set<Response>>();

export function initPartyStreamRoutes(pool: Pool) {
  // SSE endpoint for party updates
  router.get('/api/party/:partyId/stream', streamLimiter, async (req: Request, res: Response) => {
    try {
      // Security: Validate partyId to prevent SQL injection
      const partyIdStr = req.params.partyId;
      
      // Validate numeric format before parsing
      if (!/^\d+$/.test(partyIdStr)) {
        return res.status(400).json({ error: 'Invalid party ID format' });
      }
      
      const partyId = parseInt(partyIdStr, 10);
      
      if (isNaN(partyId) || partyId <= 0 || partyId > 2147483647) {
        return res.status(400).json({ error: 'Invalid party ID: out of valid range' });
      }

      // Set headers for SSE - MUST be set before any writes
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Flush headers immediately
      res.flushHeaders();
      
      // Send initial connection confirmation
      res.write(`data: ${JSON.stringify({ type: 'connected', partyId })}\n\n`);

      // Add this connection to active connections
      if (!activeConnections.has(partyId)) {
        activeConnections.set(partyId, new Set());
      }
      activeConnections.get(partyId)!.add(res);

      console.log(`[SSE] Client connected to party ${partyId}. Total connections: ${activeConnections.get(partyId)!.size}`);

      // Send initial party data
      try {
        const songsResult = await pool.query(
          `SELECT ps.*, 
           COALESCE(u.name, ps.added_by_guest_name, 'Unknown') as added_by_name,
           u.profile_picture as added_by_picture
           FROM party_songs ps
           LEFT JOIN users u ON ps.added_by_user_id = u.id
           WHERE ps.party_id = $1
           ORDER BY ps.played ASC, ps.added_at ASC`,
          [partyId]
        );

        res.write(`data: ${JSON.stringify({ 
          type: 'songs', 
          songs: songsResult.rows 
        })}\n\n`);
      } catch (err) {
        console.error('[SSE] Failed to send initial data:', err);
        // Send error event to client
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to load initial data' })}\n\n`);
      }

      // Keep-alive ping every 30 seconds (Vercel has 60s timeout)
      const keepAliveInterval = setInterval(() => {
        try {
          res.write(`: keepalive\n\n`);
        } catch (err) {
          // If write fails, clear interval
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Cleanup on disconnect
      req.on('close', () => {
        clearInterval(keepAliveInterval);
        const connections = activeConnections.get(partyId);
        if (connections) {
          connections.delete(res);
          if (connections.size === 0) {
            activeConnections.delete(partyId);
          }
        }
        console.log(`[SSE] Client disconnected from party ${partyId}. Remaining: ${connections?.size || 0}`);
      });

      // Handle errors on the response stream
      req.on('error', (err) => {
        console.error('[SSE] Request error:', err);
        clearInterval(keepAliveInterval);
      });

    } catch (err) {
      // Catch any unexpected errors
      console.error('[SSE] Unexpected error in SSE endpoint:', err);
      // If headers not sent yet, send error response
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}

// Broadcast update to all connected clients of a party
export function broadcastPartyUpdate(partyId: number, data: any) {
  console.log(`[SSE] broadcastPartyUpdate called for party ${partyId}, type: ${data.type}`);
  const connections = activeConnections.get(partyId);
  if (!connections || connections.size === 0) {
    console.log(`[SSE] No active connections for party ${partyId}`);
    return;
  }

  const message = `data: ${JSON.stringify(data)}\n\n`;
  console.log(`[SSE] Broadcasting to ${connections.size} clients:`, message.trim());
  
  connections.forEach((res) => {
    try {
      res.write(message);
    } catch (err) {
      console.error('[SSE] Failed to send update:', err);
      connections.delete(res);
    }
  });

  console.log(`[SSE] Broadcasted update to ${connections.size} clients for party ${partyId}`);
}

export default router;

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Rate limiter for YouTube API - prevent abuse
const youtubeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 YouTube searches per windowMs
  message: 'Too many YouTube API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Security: Validate search query
const validateSearchQuery = (query: string): { valid: boolean; error?: string } => {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Search query is required' };
  }
  
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Search query cannot be empty' };
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'Search query too long (max 200 characters)' };
  }
  
  return { valid: true };
};

// Security: Sanitize and validate YouTube API response
const sanitizeVideoData = (item: any) => {
  if (!item || !item.id || !item.snippet) {
    return null;
  }
  
  return {
    id: String(item.id).slice(0, 100),
    title: String(item.snippet.title || 'Untitled').slice(0, 500),
    thumbnail: String(item.snippet.thumbnails?.medium?.url || '').slice(0, 500),
    channelTitle: String(item.snippet.channelTitle || 'Unknown').slice(0, 200),
    viewCount: Math.min(parseInt(item.statistics?.viewCount || '0', 10), Number.MAX_SAFE_INTEGER),
    likeCount: Math.min(parseInt(item.statistics?.likeCount || '0', 10), Number.MAX_SAFE_INTEGER)
  };
};

// Search YouTube videos - Proxied endpoint
router.get('/search', youtubeLimiter, async (req: Request, res: Response) => {
  try {
    // Check if API key is configured
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API not configured on server' });
    }
    
    const query = req.query.q as string;
    
    // Security: Validate query
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Sanitize query
    const sanitizedQuery = query.trim().slice(0, 200);
    
    // Search for videos
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&maxResults=20&q=${encodeURIComponent(sanitizedQuery + ' karaoke')}&type=video&key=${YOUTUBE_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error('YouTube API search error:', searchResponse.status, searchResponse.statusText);
      console.error('YouTube API error details:', errorBody);
      console.error('API Key present:', !!YOUTUBE_API_KEY);
      console.error('API Key length:', YOUTUBE_API_KEY?.length);
      return res.status(502).json({ error: 'YouTube API request failed' });
    }
    
    const searchData = await searchResponse.json() as any;
    
    if (!searchData.items || !Array.isArray(searchData.items)) {
      return res.status(502).json({ error: 'Invalid YouTube API response' });
    }
    
    if (searchData.items.length === 0) {
      return res.json({ items: [] });
    }
    
    // Get video statistics
    const videoIds = searchData.items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(',');
    
    if (!videoIds) {
      return res.json({ items: [] });
    }
    
    const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    
    const statsResponse = await fetch(statsUrl);
    
    if (!statsResponse.ok) {
      console.error('YouTube API stats error:', statsResponse.status, statsResponse.statusText);
      return res.status(502).json({ error: 'YouTube API stats request failed' });
    }
    
    const statsData = await statsResponse.json() as any;
    
    if (!statsData.items || !Array.isArray(statsData.items)) {
      return res.status(502).json({ error: 'Invalid YouTube API stats response' });
    }
    
    // Sanitize and return results
    const results = statsData.items
      .map(sanitizeVideoData)
      .filter(Boolean);
    
    res.json({ items: results });
    
  } catch (error) {
    console.error('YouTube proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

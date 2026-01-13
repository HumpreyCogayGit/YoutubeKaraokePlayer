import rateLimit from 'express-rate-limit';

// General API rate limit - 300 requests per 15 minutes per IP (20/min sustained)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/'
});

// Read-only endpoints (GET requests) - More permissive for polling
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // ~33 requests per minute
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'GET' // Only apply to GET requests
});

// Strict rate limit for authentication endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Party creation/joining rate limit - 20 per 15 minutes
export const partyActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many party actions, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Very permissive limit for SSE streams - 50 connections per hour
export const streamLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many SSE connections, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

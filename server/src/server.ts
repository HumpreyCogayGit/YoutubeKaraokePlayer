import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import dotenv from 'dotenv';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import passport from './auth.js';
import authRoutes from './routes/auth.js';
import playlistRoutes from './routes/playlists.js';
import userRoutes from './routes/user.js';
import partyRoutes from './routes/party.js';
import youtubeRoutes from './routes/youtube.js';
import { initPartyStreamRoutes } from './routes/party-stream.js';
import pool from './db.js';
import { runMigrations } from './migrations.js';

dotenv.config();

// Security: Validate required environment variables
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required');
  console.error('Generate a strong secret with: openssl rand -base64 32');
  process.exit(1);
}

if (process.env.SESSION_SECRET.length < 32) {
  console.error('FATAL: SESSION_SECRET must be at least 32 characters long');
  console.error('Current length:', process.env.SESSION_SECRET.length);
  process.exit(1);
}

const app = express();
//const PORT = process.env.PORT || 5000;
const PORT = parseInt(process.env.PORT || '5000', 10);

const PgStore = pgSession(session);

// Trust proxy for Railway/Vercel
app.set('trust proxy', 1);

// CORS - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Security: Rate limiting to prevent abuse and DoS attacks
// Apply general rate limiter to all API routes
app.use('/api', generalLimiter);

// Session store with error handling
const sessionStore = new PgStore({
  pool: pool,
  tableName: 'session',
  createTableIfMissing: true,
  errorLog: (error) => {
    console.error('Session store error:', error);
  }
});

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET!, // No fallback - required and validated at startup
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Custom name to avoid conflicts
    proxy: true, // Trust the proxy for secure cookies
    cookie: {
      secure: true, // Always use secure in production (Railway has HTTPS)
      httpOnly: true,
      sameSite: 'none', // Required for cross-domain cookies (Railway <-> Vercel)
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/', // Ensure cookie is sent for all paths
    },
    rolling: true, // Reset maxAge on every response to keep session alive
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes with rate limiting
app.use('/auth', authLimiter, authRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/user', userRoutes);
app.use('/api/party', partyRoutes); // Party routes get general limiter from /api prefix
app.use('/api/youtube', youtubeRoutes); // YouTube proxy with rate limiting
app.use(initPartyStreamRoutes(pool)); // SSE routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Karaoke API Server',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth',
      playlists: '/api/playlists',
      party: '/api/party',
      user: '/api/user'
    }
  });
});

const HOST = process.env.HOST || '0.0.0.0';

// Run migrations before starting server
runMigrations()
  .then(() => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Manghumps Logging Server started`);
      console.log(`Server running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import dotenv from 'dotenv';
import passport from './auth.js';
import authRoutes from './routes/auth.js';
import playlistRoutes from './routes/playlists.js';
import userRoutes from './routes/user.js';
import partyRoutes from './routes/party.js';
import { initPartyStreamRoutes } from './routes/party-stream.js';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const PgStore = pgSession(session);

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/user', userRoutes);
app.use('/api/party', partyRoutes);
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
app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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


const server = app.listen(PORT, HOST, () => {
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

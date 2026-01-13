-- ============================================================================
-- COMPLETE DATABASE SCHEMA - Karaoke Playlists Application
-- ============================================================================
-- This script will DROP all existing tables and recreate them from scratch
-- Use with caution in production - all data will be lost!
-- ============================================================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS party_songs CASCADE;
DROP TABLE IF EXISTS party_members CASCADE;
DROP TABLE IF EXISTS parties CASCADE;
DROP TABLE IF EXISTS playlist_items CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table (for express-session)
CREATE TABLE session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Playlists table
CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlist Items table
CREATE TABLE playlist_items (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
  video_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  thumbnail TEXT,
  channel_title VARCHAR(255),
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PARTY MODE TABLES
-- ============================================================================

-- Parties table
CREATE TABLE parties (
  id SERIAL PRIMARY KEY,
  host_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- Party members table
CREATE TABLE party_members (
  id SERIAL PRIMARY KEY,
  party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(party_id, user_id)
);

-- Party songs table (shared playlist with guest support)
CREATE TABLE party_songs (
  id SERIAL PRIMARY KEY,
  party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
  video_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  thumbnail VARCHAR(500),
  channel_title VARCHAR(255),
  added_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  added_by_guest_name VARCHAR(255),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  played BOOLEAN DEFAULT false,
  played_at TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_google_id ON users(google_id);

-- Session indexes
CREATE INDEX idx_session_expire ON session(expire);

-- Playlist indexes
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);

-- Party indexes
CREATE INDEX idx_parties_code ON parties(code);
CREATE INDEX idx_parties_active ON parties(is_active);
CREATE INDEX idx_parties_host ON parties(host_user_id);
CREATE INDEX idx_party_members_party ON party_members(party_id);
CREATE INDEX idx_party_members_user ON party_members(user_id);
CREATE INDEX idx_party_songs_party ON party_songs(party_id);
CREATE INDEX idx_party_songs_played ON party_songs(played);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON playlists
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- All tables created successfully
-- Run verification: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- ============================================================================

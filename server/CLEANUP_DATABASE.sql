-- ============================================
-- Database Cleanup Script
-- Use this to clean all data and start fresh
-- ============================================

-- DANGER: This will delete ALL data in the database
-- Only run this on your LOCAL development database!

BEGIN;

-- Delete all data from tables (maintains schema)
TRUNCATE TABLE party_songs CASCADE;
TRUNCATE TABLE party_members CASCADE;
TRUNCATE TABLE parties CASCADE;
TRUNCATE TABLE playlist_items CASCADE;
TRUNCATE TABLE playlists CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE session CASCADE;

-- Reset sequences to start IDs from 1
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE playlists_id_seq RESTART WITH 1;
ALTER SEQUENCE playlist_items_id_seq RESTART WITH 1;
ALTER SEQUENCE parties_id_seq RESTART WITH 1;
ALTER SEQUENCE party_members_id_seq RESTART WITH 1;
ALTER SEQUENCE party_songs_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'playlists', COUNT(*) FROM playlists
UNION ALL
SELECT 'playlist_items', COUNT(*) FROM playlist_items
UNION ALL
SELECT 'parties', COUNT(*) FROM parties
UNION ALL
SELECT 'party_members', COUNT(*) FROM party_members
UNION ALL
SELECT 'party_songs', COUNT(*) FROM party_songs
UNION ALL
SELECT 'session', COUNT(*) FROM session;

COMMIT;

-- All tables should now show 0 rows
-- Run this script with:
-- psql $DATABASE_URL -f server/CLEANUP_DATABASE.sql

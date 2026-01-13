import pool from './db.js';

/**
 * Run database migrations on server startup
 * This ensures the database schema is up to date
 */
export async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Migration 1: Add guest name support to party_songs
    await pool.query(`
      ALTER TABLE party_songs 
      ADD COLUMN IF NOT EXISTS added_by_guest_name VARCHAR(255);
    `);
    console.log('✓ Migration: added_by_guest_name column added/verified');

    // Add more migrations here as needed
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

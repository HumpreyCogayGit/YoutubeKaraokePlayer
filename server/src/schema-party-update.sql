-- Add guest name support for party songs
ALTER TABLE party_songs ADD COLUMN IF NOT EXISTS added_by_guest_name VARCHAR(255);

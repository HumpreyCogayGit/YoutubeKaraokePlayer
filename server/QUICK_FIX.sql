-- QUICK FIX: Copy this entire file and paste into Railway Database Query tab
-- This adds only the missing column without dropping anything

-- Add the missing column that's causing 500 errors
ALTER TABLE party_songs ADD COLUMN IF NOT EXISTS added_by_guest_name VARCHAR(255);

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'party_songs' 
ORDER BY ordinal_position;

-- You should see 'added_by_guest_name' in the list

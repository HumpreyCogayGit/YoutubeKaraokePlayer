# Database Migration Guide

## Issue
The production database is missing the `added_by_guest_name` column in the `party_songs` table, causing 500 errors on party-related endpoints.

## Solution

### For Railway Deployment

1. **Connect to your Railway PostgreSQL database:**
   ```bash
   railway login
   railway link
   railway connect postgres
   ```

2. **Or use the PostgreSQL client directly:**
   ```bash
   psql postgresql://[DATABASE_URL from Railway]
   ```

3. **Run the migration:**
   ```sql
   ALTER TABLE party_songs ADD COLUMN IF NOT EXISTS added_by_guest_name VARCHAR(255);
   ```

4. **Verify the column was added:**
   ```sql
   \d party_songs
   ```

### Alternative: Using Railway Dashboard

1. Go to your Railway project dashboard
2. Open the PostgreSQL service
3. Go to the "Data" tab
4. Open the Query tab
5. Run:
   ```sql
   ALTER TABLE party_songs ADD COLUMN IF NOT EXISTS added_by_guest_name VARCHAR(255);
   ```

### Alternative: Add Migration to Server Startup

You can also automatically run the migration when the server starts by adding it to your server startup code.

## Verification

After running the migration, test these endpoints:
- `GET /api/party/my-parties` - Should return parties without 500 error
- `GET /api/party/:partyId/songs` - Should return songs without 500 error
- `GET /api/party/:partyId/members` - Should return members without 500 error
- `GET /api/party/stream/:partyId` - Should return SSE stream without error

## Prevention

Consider implementing automatic migrations in your deployment process to avoid this issue in the future.

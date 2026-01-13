# 500 Internal Server Error - Resolution

## Problem Diagnosis

Your production application is experiencing 500 Internal Server errors on multiple party-related endpoints:
- `GET /api/party/my-parties`
- `GET /api/party/:partyId/songs`
- `GET /api/party/:partyId/members`
- `GET /api/party/stream/:partyId` (SSE endpoint)

## Root Cause

The production database is **missing the `added_by_guest_name` column** in the `party_songs` table. This column was added in your local development schema update (`schema-party-update.sql`) but was never applied to the production database.

All the failing SQL queries reference this column:
```sql
SELECT COUNT(DISTINCT added_by_guest_name) 
FROM party_songs 
WHERE party_id = p.id AND added_by_guest_name IS NOT NULL
```

When PostgreSQL tries to execute these queries, it throws an error because the column doesn't exist, resulting in 500 errors.

## Solution Implemented

I've added **automatic database migrations** that run on server startup:

### Files Created/Modified:

1. **`server/src/migrations.ts`** (NEW)
   - Automatic migration runner
   - Adds the missing `added_by_guest_name` column safely using `IF NOT EXISTS`
   - Will run every time the server starts (safe to run multiple times)

2. **`server/src/server.ts`** (MODIFIED)
   - Imports and runs migrations before starting the server
   - Ensures database schema is up-to-date before accepting requests
   - Exits gracefully if migrations fail

3. **`server/MIGRATION_GUIDE.md`** (NEW)
   - Manual migration instructions for immediate fixes
   - Alternative methods for running migrations
   - Verification steps

## Deployment Steps

### Option 1: Redeploy (Recommended)
1. Commit these changes to your repository
2. Push to your deployment branch (main/master)
3. Railway will automatically redeploy
4. The migration will run automatically on startup
5. All endpoints should work correctly

### Option 2: Manual Database Fix (Immediate)
If you need an immediate fix while preparing deployment:

1. Access your Railway PostgreSQL database via the dashboard
2. Run this SQL command:
   ```sql
   ALTER TABLE party_songs ADD COLUMN IF NOT EXISTS added_by_guest_name VARCHAR(255);
   ```
3. Restart your application

## Verification

After deployment, verify these endpoints work:
- `GET /api/party/my-parties` - Returns parties list
- `GET /api/party/:partyId/songs` - Returns party songs
- `GET /api/party/:partyId/members` - Returns party members
- `GET /api/party/stream/:partyId` - Returns SSE stream with `Content-Type: text/event-stream`

## Why This Happened

The `added_by_guest_name` column was added to support guest users in party mode but the migration wasn't run on production. The automatic migration system will prevent this issue in the future.

## Next Steps

1. Commit and push these changes
2. Wait for Railway to redeploy
3. Test the party functionality
4. Consider implementing a proper migration system (like Knex.js or TypeORM) for future schema changes

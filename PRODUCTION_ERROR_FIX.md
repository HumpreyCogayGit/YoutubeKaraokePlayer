# Production Error Diagnostics

## Current Error
```
Failed to fetch
TypeError: Failed to fetch at Object.markSongPlayed
```

This error occurs when the browser cannot reach the API server at all.

## Likely Causes

### 1. Server Not Running (Most Likely)
Your Railway deployment may have crashed after the failed database migration.

**Check:**
- Go to Railway dashboard: https://railway.app
- Check if the server service is running
- Check deployment logs for errors

**Fix:**
- Redeploy the server with the new migration code
- Or manually restart the service

### 2. Database Connection Failed
The server started but can't connect to the database because the schema migration failed.

**Check Server Logs:**
Look for errors like:
```
Migration error: column "added_by_guest_name" does not exist
```

**Fix:**
The database deployment failed because `psql` isn't installed locally. You need to:

#### Option A: Use Railway Dashboard
1. Go to Railway dashboard
2. Click on your PostgreSQL service  
3. Click "Data" tab
4. Click "Query"
5. Copy and paste the ENTIRE contents of `server/src/schema-complete.sql`
6. Click "Run Query"
7. Restart your server service

#### Option B: Install PostgreSQL Client
```powershell
# Download PostgreSQL from postgresql.org
# Then run:
psql 'postgresql://postgres:pgnHiQiKOewDLJizDozwSIrdARFVlSJk@turntable.proxy.rlwy.net:35703/railway' -f server/src/schema-complete.sql
```

#### Option C: Use Railway CLI
```bash
# Install Railway CLI first
npm install -g @railway/cli

# Login and link
railway login
railway link

# Run migration
railway run psql < server/src/schema-complete.sql
```

### 3. CORS Configuration Issue
Less likely, but the server might be rejecting requests from your frontend.

**Check `server/src/server.ts` CORS config:**
Should include your frontend URL in `allowedOrigins`.

### 4. Environment Variables Missing
The production server might not have the correct `DATABASE_URL`.

**Check in Railway:**
- Go to your server service
- Click "Variables" tab
- Verify `DATABASE_URL` is set correctly
- Verify `SESSION_SECRET` is set

## Quick Diagnosis Steps

1. **Test if server is alive:**
   ```
   https://youtubekaraokeplayer-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Check browser console:**
   - Open DevTools (F12)
   - Network tab
   - Look for the failed request
   - Check if it's a CORS error (different from Failed to fetch)

3. **Check Railway logs:**
   - Railway Dashboard → Your Server Service → Deployments
   - Click latest deployment
   - View logs for errors

## Most Likely Solution

Since your last psql command failed, **the database schema is not updated** and your server is probably crashing on startup when trying to query the missing `added_by_guest_name` column.

### Immediate Fix:

1. **Deploy database using Railway Dashboard** (Option A above)
2. **Restart your server service** in Railway
3. **Test the health endpoint**
4. **Refresh your app**

## Prevention

After fixing, commit and push the changes I made:
- `server/src/migrations.ts` - Auto-runs migrations on startup
- `server/src/server.ts` - Calls migrations before starting

This will prevent future schema issues.

## Need Help?

Check these in order:
1. ✅ Database schema deployed successfully
2. ✅ Server started without errors  
3. ✅ Health endpoint responding
4. ✅ Environment variables set
5. ✅ CORS configured correctly

Share the Railway deployment logs if still having issues.

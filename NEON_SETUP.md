# Free PostgreSQL Setup with Neon (5 minutes)

## Why Neon for Free Vercel Deployment

- ✅ **Truly Free** - No credit card required
- ✅ **512 MB storage** - Thousands of playlists
- ✅ **Serverless** - Scales to zero when not in use
- ✅ **No code changes** - Works with your existing app
- ✅ **Fast** - Optimized for serverless/Vercel

## Step-by-Step Setup

### 1. Create Neon Account (1 min)

1. Go to https://neon.tech
2. Click "Sign up" 
3. Sign up with GitHub (easiest) or email
4. No credit card needed!

### 2. Create Database (2 min)

1. Click **"Create a project"**
2. Project name: `karaoke-playlists`
3. Database name: `karaoke_playlists`
4. Region: Choose closest to you
5. Click **"Create project"**

### 3. Get Connection String (30 sec)

1. After project creation, you'll see **"Connection Details"**
2. Copy the **connection string** - looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/karaoke_playlists?sslmode=require
   ```
3. **Save this** - you'll need it for Vercel

### 4. Run Database Schema (1 min)

**Option A: Using psql (if installed)**
```bash
psql "postgresql://username:password@ep-xxx.aws.neon.tech/karaoke_playlists?sslmode=require" -f server/src/schema.sql

# Also run session table
psql "postgresql://username:password@ep-xxx.aws.neon.tech/karaoke_playlists?sslmode=require" -f server/src/schema-session.sql
```

**Option B: Using Neon SQL Editor (no installation needed)**

1. In Neon dashboard, click **"SQL Editor"**
2. Open `server/src/schema.sql` from your project
3. Copy and paste the entire SQL into the editor
4. Click **"Run"**
5. Repeat for `server/src/schema-session.sql`

### 5. Test Connection (30 sec)

In Neon dashboard:
```sql
-- Run this in SQL Editor to verify
SELECT * FROM users;
-- Should return empty results (no error)
```

### 6. Add to Vercel (1 min)

When deploying your backend to Vercel:

1. Go to Vercel Dashboard → Your Backend Project
2. Settings → Environment Variables
3. Add new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your connection string from step 3
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

Done! ✅

## Free Tier Limits

- **Storage**: 512 MB (≈ thousands of playlists with songs)
- **Compute**: 191.9 compute hours/month (plenty for personal use)
- **Projects**: 1 project
- **Branches**: 10 database branches
- **History**: 7 days

**For reference**: 
- 1 playlist ≈ 1 KB
- 1 song entry ≈ 0.5 KB
- **10,000 playlists** with 50 songs each ≈ 250 MB

You're very unlikely to hit the limit!

## Testing Your Setup

### Test Locally First

Update your local `server/.env`:
```env
DATABASE_URL=postgresql://username:password@ep-xxx.aws.neon.tech/karaoke_playlists?sslmode=require
```

Then test:
```bash
cd server
npm run dev
```

Try:
1. Sign in with Google
2. Create a playlist
3. Save it
4. Reload page - should still be there

If it works locally with Neon, it will work on Vercel! ✅

## Neon Dashboard Features

- **SQL Editor**: Run queries directly
- **Tables**: Browse your data
- **Monitoring**: See query performance
- **Branches**: Test schema changes safely
- **Connection Details**: Get connection strings

## Migration from Local PostgreSQL

If you have data locally you want to keep:

```bash
# Export from local
pg_dump karaoke_playlists > backup.sql

# Import to Neon
psql "your-neon-connection-string" -f backup.sql
```

## Troubleshooting

**Error: "password authentication failed"**
- Double-check connection string is copied correctly
- Make sure `?sslmode=require` is at the end

**Error: "connection timeout"**
- Check your internet connection
- Neon might be temporarily down (rare)

**Tables not created**
- Make sure you ran both schema.sql AND schema-session.sql
- Check SQL Editor for error messages

## Alternative: Supabase

If you prefer Supabase:
1. Go to https://supabase.com
2. Create project (takes 2 min to provision)
3. Database → Connection string → Copy
4. SQL Editor → Paste schema.sql
5. Use in Vercel as DATABASE_URL

Both work great! Neon is slightly faster for pure PostgreSQL use cases.

## Need Help?

- Neon Docs: https://neon.tech/docs/introduction
- Neon Discord: https://discord.gg/92vNTzKDGp
- This project's docs: See VERCEL_DEPLOYMENT.md

---

**Next Step**: Once Neon is set up, continue with [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) Step 3

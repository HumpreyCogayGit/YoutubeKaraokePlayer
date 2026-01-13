# Railway Deployment Guide

## 🚂 Deploying to Railway

### Step 1: Create PostgreSQL Database

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"+ New Project"**
3. Select **"Provision PostgreSQL"**
4. Railway will create a database and give you connection details

### Step 2: Deploy Backend Server

1. In the same project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose your `KaraokePlaylists` repository
4. Railway will detect it's a monorepo

#### Configure Backend Service:

1. Click on the service → **Settings**
2. **Root Directory**: Set to `server`
3. **Environment Variables**: Add these from your `.env` file:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}  (Railway auto-fills this)
   SESSION_SECRET=your-secret-here
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://your-backend.railway.app/api/auth/google/callback
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
4. **Deploy**: Railway will auto-deploy
5. Copy your backend URL (e.g., `https://karaoke-backend-production.up.railway.app`)

### Step 3: Initialize Database Schema

1. In Railway, open your backend service
2. Click **"Deploy Logs"** and wait for it to start
3. Click **"Variables"** tab → **"PostgreSQL"** plugin
4. Copy the `DATABASE_URL` connection string
5. Run the schema files **in order** using psql or your preferred database client:

**Using psql:**
```bash
# 1. Base tables (users, playlists)
psql 'YOUR_DATABASE_URL' -f server/src/schema.sql

# 2. Party tables (parties, party_songs, party_members)
psql 'YOUR_DATABASE_URL' -f server/src/schema-party.sql

# 3. Session table (optional, for express-session)
psql 'YOUR_DATABASE_URL' -f server/src/schema-session.sql
```

**Using a GUI client (pgAdmin, TablePlus, etc.):**
- Connect using the `DATABASE_URL`
- Execute each SQL file in the order above

6. Verify all tables were created successfully

### Step 4: Deploy Frontend to Vercel

1. Push your code to GitHub
2. In Vercel dashboard → **Import Project**
3. Select your repository
4. **Framework Preset**: Vite
5. **Root Directory**: Leave as root (not server)
6. **Environment Variables**: Add:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
7. Deploy

### Step 5: Update Backend CORS & Callback URLs

After deploying frontend to Vercel, update Railway backend environment variables:

```
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/api/auth/google/callback
```

Also update your Google OAuth Console:
- Authorized JavaScript origins: `https://your-app.vercel.app`
- Authorized redirect URIs: `https://your-backend.railway.app/api/auth/google/callback`

---

## 🔧 Alternative: Deploy Everything to Railway

If you want both frontend and backend on Railway:

1. Create PostgreSQL (same as Step 1)
2. Deploy Backend (same as Step 2)
3. Deploy Frontend:
   - Click **"+ New"** → **"GitHub Repo"**
   - Same repository
   - **Root Directory**: Leave empty (root)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
   - Railway will serve your Vite build

This way everything is in one place!

---

## 📝 Important Notes

- Railway auto-detects Node.js and runs `npm install`
- Build command runs automatically: `npm run build`
- Start command: `npm start` (from package.json)
- PostgreSQL connection is automatic via `${{Postgres.DATABASE_URL}}`
- SSE will work perfectly on Railway (no timeout limits)

## 💰 Costs

- Free: $5 credit/month (usually enough for small projects)
- After free credit: ~$5-10/month for small app + database
- No credit card required for trial

---

## 🐛 Troubleshooting

**Build fails?**
- Check Railway logs for specific error
- Ensure TypeScript compiles: `cd server && npm run build`

**Database connection fails?**
- Verify `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}`
- Check PostgreSQL plugin is in same project

**SSE not working?**
- Check CORS settings in server
- Verify frontend uses correct backend URL

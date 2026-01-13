# 🚀 Quick Deploy Checklist

## Pre-Deployment
- [ ] Push all code to GitHub
- [ ] Have Railway account ready (railway.app)
- [ ] Have Vercel account ready (vercel.com) - optional if using Railway for both

## Railway Deployment (Backend + Database)

### 1. Create Database
- [ ] Login to Railway → New Project → Provision PostgreSQL
- [ ] Copy database connection string (Railway auto-provides `DATABASE_URL`)

### 2. Deploy Backend
- [ ] In same project → + New → GitHub Repo
- [ ] Select your `KaraokePlaylists` repository
- [ ] Settings → Set Root Directory: `server`
- [ ] Add Environment Variables:
  - [x] `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (auto-filled)
  - [ ] `SESSION_SECRET` = (generate random string)
  - [ ] `GOOGLE_CLIENT_ID` = (from Google Console)
  - [ ] `GOOGLE_CLIENT_SECRET` = (from Google Console)
  - [ ] `GOOGLE_CALLBACK_URL` = `https://YOUR-BACKEND.railway.app/api/auth/google/callback`
  - [ ] `FRONTEND_URL` = `http://localhost:3000` (update after frontend deploy)
  - [ ] `NODE_ENV` = `production`

### 3. Initialize Database
After backend deploys:
- [ ] Railway → Backend Service → Variables → Copy `DATABASE_URL`
- [ ] Use a PostgreSQL client (pgAdmin, TablePlus, or psql) to connect
- [ ] Run SQL files **in this order**:
  1. `server/src/schema.sql` (base tables: users, playlists)
  2. `server/src/schema-party.sql` (party tables: parties, party_songs)
  3. `server/src/schema-session.sql` (optional: session storage)
- [ ] Verify all tables created successfully

### 4. Get Backend URL
- [ ] Railway → Backend Service → Settings
- [ ] Copy the generated domain (e.g., `karaoke-backend-production.up.railway.app`)

## Frontend Deployment

### Option A: Vercel (Recommended for Frontend)
- [ ] Vercel → Import Project → Select GitHub repo
- [ ] Framework: Vite
- [ ] Root Directory: (leave empty - use root)
- [ ] Add Environment Variable:
  - [ ] `VITE_API_URL` = `https://YOUR-BACKEND.railway.app`
- [ ] Deploy

### Option B: Railway (All-in-One)
- [ ] Railway → Same Project → + New → GitHub Repo
- [ ] Select same repository
- [ ] Root Directory: (leave empty)
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm run preview`
- [ ] Deploy

## Post-Deployment

### Update Google OAuth
- [ ] Google Cloud Console → Credentials → Your OAuth Client
- [ ] Authorized JavaScript origins:
  - Add: `https://YOUR-FRONTEND.vercel.app` (or Railway URL)
- [ ] Authorized redirect URIs:
  - Add: `https://YOUR-BACKEND.railway.app/api/auth/google/callback`

### Update Backend Environment
- [ ] Railway → Backend → Variables → Update:
  - [ ] `FRONTEND_URL` = `https://YOUR-FRONTEND.vercel.app`
  - [ ] `GOOGLE_CALLBACK_URL` = Verify correct

### Test Your App
- [ ] Visit your frontend URL
- [ ] Test Google login
- [ ] Create a party
- [ ] Test adding songs as host
- [ ] Test joining as guest (incognito/different browser)
- [ ] Verify SSE real-time updates work

## 🎉 Done!

Your app is live with:
- ✅ PostgreSQL database on Railway
- ✅ Node.js backend on Railway (supports SSE)
- ✅ React frontend on Vercel (or Railway)
- ✅ Real-time party mode working

---

## 💡 Tips

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Test locally before deploying:**
```bash
# Backend
cd server
npm run build
npm start

# Frontend
npm run build
npm run preview
```

**View Railway Logs:**
Railway → Service → Deployments → Click latest → View Logs

**Troubleshooting "Application failed to respond":**
1. Check Railway Deploy Logs for build errors
2. Verify all environment variables are set (especially `DATABASE_URL`, `SESSION_SECRET`)
3. Check that database schema was initialized
4. Look for TypeScript compilation errors in build logs
5. Verify `NODE_ENV=production` is set
6. Test health endpoint: `https://YOUR-BACKEND.railway.app/health`

**Common fixes:**
- Missing `SESSION_SECRET` → Generate and add it
- Database not initialized → Run schema files in order
- Build failed → Check for TypeScript errors locally: `cd server && npm run build`
- Port issues → Railway automatically assigns PORT, don't override it

**Estimated Monthly Cost:**
- Railway: $0-$10 (free $5 credit)
- Vercel: $0 (hobby tier)

# 📋 Vercel Deployment Quick Reference

## 🎯 TL;DR - Where to Put Your Secrets

| Secret/Token | Local Development | Vercel Production |
|-------------|------------------|-------------------|
| **YouTube API Key** | `.env` → `VITE_YOUTUBE_API_KEY` | Vercel Dashboard → **Frontend Project** → Environment Variables |
| **Database URL** | `server/.env` → `DATABASE_URL` | Vercel Dashboard → **Backend Project** → Environment Variables |
| **Google OAuth ID** | `server/.env` → `GOOGLE_CLIENT_ID` | Vercel Dashboard → **Backend Project** → Environment Variables |
| **Google OAuth Secret** | `server/.env` → `GOOGLE_CLIENT_SECRET` | Vercel Dashboard → **Backend Project** → Environment Variables |
| **Session Secret** | `server/.env` → `SESSION_SECRET` | Vercel Dashboard → **Backend Project** → Environment Variables |
| **API URLs** | `.env` + `server/.env` | Vercel Dashboard → Both Projects → Environment Variables |

## 🚫 NEVER Put Secrets Here:
- ❌ Source code files (.ts, .tsx, .js)
- ❌ Git repository
- ❌ README or documentation
- ❌ package.json
- ❌ Public folders
- ❌ Comments in code

## ✅ ALWAYS Put Secrets Here:
- ✅ `.env` files (local only - these are gitignored)
- ✅ Vercel Dashboard → Environment Variables (production)

---

## 🗄️ Database Setup (FREE Options - Choose One)

### Neon (Recommended - FREE 512MB)
```
⭐ BEST FOR VERCEL FREE TIER
1. https://neon.tech/ (No credit card!)
2. Create project → karaoke_playlists
3. Copy connection string
4. Run schema.sql in SQL Editor OR via psql
5. Add to Vercel: DATABASE_URL=postgresql://...?sslmode=require

📚 Detailed guide: See NEON_SETUP.md
```

### Supabase (FREE 500MB)
```
1. https://supabase.com/ (No credit card!)
2. Create project → takes 2 min to provision
3. Database → Connection String → Copy
4. SQL Editor → Run schema.sql
5. Add to Vercel: DATABASE_URL=postgresql://...
```

### Railway (FREE $5/month credit)
```
1. https://railway.app/
2. New Project → PostgreSQL
3. Connect and run schema.sql
4. Add to Vercel: DATABASE_URL=postgresql://...
```

**All are 100% free and perfect for personal projects!**

---

## 🚀 Deployment Steps (30 minutes)

### Step 1: Database (5 min)
- [ ] Create database on Neon/Supabase/Railway
- [ ] Run `schema.sql` and `schema-session.sql`
- [ ] Copy connection string

### Step 2: Google OAuth (5 min)
- [ ] Go to Google Cloud Console
- [ ] Add production callback URLs (you'll update these later)
- [ ] Copy Client ID and Secret

### Step 3: Deploy Backend (10 min)
- [ ] Push code to GitHub
- [ ] Vercel → New Project → Import repo
- [ ] Root Directory: `server`
- [ ] Add environment variables:
  ```
  DATABASE_URL=<from step 1>
  GOOGLE_CLIENT_ID=<from step 2>
  GOOGLE_CLIENT_SECRET=<from step 2>
  GOOGLE_CALLBACK_URL=https://YOUR-BACKEND.vercel.app/auth/google/callback
  SESSION_SECRET=<generate new random>
  CLIENT_URL=https://YOUR-FRONTEND.vercel.app
  NODE_ENV=production
  ```
- [ ] Deploy → Note the URL

### Step 4: Deploy Frontend (5 min)
- [ ] Vercel → New Project → Same repo
- [ ] Root Directory: `.` (root)
- [ ] Add environment variables:
  ```
  VITE_YOUTUBE_API_KEY=<your key>
  VITE_API_URL=https://YOUR-BACKEND.vercel.app
  ```
- [ ] Deploy → Note the URL

### Step 5: Update URLs (5 min)
- [ ] Update backend `CLIENT_URL` with actual frontend URL
- [ ] Update backend `GOOGLE_CALLBACK_URL` with actual backend URL
- [ ] Update Google OAuth redirect URIs with actual URLs
- [ ] Redeploy backend

---

## 🧪 Test Production

Visit: `https://your-frontend.vercel.app`

- [ ] Frontend loads
- [ ] Click "Sign in with Google"
- [ ] Redirects to Google → Back to app
- [ ] Search for songs
- [ ] Add to playlist
- [ ] Save playlist
- [ ] Reload page (session persists)
- [ ] Load saved playlist

---

## 🔧 Common Issues

**CORS Error**
→ Check `CLIENT_URL` matches frontend exactly

**Session not persisting**
→ Install `connect-pg-simple` and configure session store

**OAuth error**
→ Check Google Console callback URLs match exactly

**Database connection failed**
→ Add `?sslmode=require` to connection string

**Environment variables not working**
→ Redeploy after adding/changing env vars

---

## 📱 Quick Commands

```bash
# Generate session secret
Add-Type -AssemblyName System.Security; $bytes = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)

# Install session storage (add to server/package.json)
npm install connect-pg-simple

# Deploy from CLI (optional)
npm i -g vercel
vercel --prod
```

---

## 📚 Full Documentation

For detailed instructions, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

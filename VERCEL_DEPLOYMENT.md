# Vercel Deployment Guide

Complete guide for deploying the Karaoke Playlists application to Vercel.

## Architecture Overview

This application requires **two separate Vercel deployments**:

1. **Frontend** (React/Vite app) - Main project root
2. **Backend** (Express API) - `server/` directory

## 📋 Pre-Deployment Checklist

### ✅ Required External Services

- [ ] **Database**: PostgreSQL hosted externally (Vercel doesn't provide free PostgreSQL)
  - **Recommended**: Neon, Supabase, or Railway (all have free tiers)
  - Need: Connection string (DATABASE_URL)
  
- [ ] **Google Cloud**: OAuth credentials
  - Need: Client ID and Client Secret
  - Must add production callback URLs

- [ ] **Google Cloud**: YouTube Data API v3
  - Need: API Key

### ✅ Secrets to Prepare

You'll need to add these to Vercel Environment Variables (NOT in code):

**Frontend Environment Variables:**
- `VITE_YOUTUBE_API_KEY` - Your YouTube API key
- `VITE_API_URL` - Your backend URL (e.g., `https://your-backend.vercel.app`)

**Backend Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string from your database provider
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `GOOGLE_CALLBACK_URL` - `https://your-backend.vercel.app/auth/google/callback`
- `SESSION_SECRET` - Generate new random secret for production
- `CLIENT_URL` - Your frontend URL (e.g., `https://your-app.vercel.app`)
- `NODE_ENV` - Set to `production`

---

## 🗄️ Step 1: Set Up FREE External Database

**⚠️ Important**: Vercel's free tier does **NOT** include PostgreSQL. But don't worry - there are excellent **100% FREE** alternatives!

### Option A: Neon (⭐ Recommended for Vercel Free Tier)

**Why Neon:**
- ✅ **Completely FREE** - No credit card required
- ✅ **512 MB storage** - Enough for thousands of playlists
- ✅ **Serverless-native** - Built for Vercel
- ✅ **Auto-scales to zero** - No cost when idle
- ✅ **5-minute setup** - Fastest option

**Quick Setup:**
1. Go to [Neon.tech](https://neon.tech/)
2. Sign up with GitHub (no credit card!)
3. Create project: `karaoke-playlists`
4. Copy connection string
5. Run schema in SQL Editor or via psql

📚 **Detailed guide**: See [NEON_SETUP.md](NEON_SETUP.md) for step-by-step instructions with screenshots.

### Option B: Supabase (Free Tier - 500 MB)

**Good if you want extras:**
- ✅ **500 MB database** + 1 GB file storage
- ✅ Built-in authentication (optional)
- ✅ Real-time subscriptions
- ✅ No credit card required

**Quick Setup:**
1. Go to [Supabase.com](https://supabase.com/)
2. Create project (takes ~2 min to provision)
3. Settings → Database → Copy connection string
4. SQL Editor → Run `server/src/schema.sql`

### Option C: Railway (Free $5/month credit)

**Good for multiple services:**
- ✅ $5 free credit monthly (doesn't expire)
- ✅ 512 MB RAM, 1 GB storage
- ✅ Can host multiple services

**Quick Setup:**
1. Go to [Railway.app](https://railway.app/)
2. New Project → Add PostgreSQL
3. Copy connection string
4. Run `server/src/schema.sql`

**All three options are excellent and 100% free! Choose based on preference.**

---

## 🔑 Step 2: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Click on your OAuth 2.0 Client ID
4. Add **Authorized redirect URIs**:
   ```
   https://YOUR-BACKEND-APP.vercel.app/auth/google/callback
   ```
5. Add **Authorized JavaScript origins**:
   ```
   https://YOUR-FRONTEND-APP.vercel.app
   https://YOUR-BACKEND-APP.vercel.app
   ```
6. Click **Save**

---

## 🚀 Step 3: Deploy Backend to Vercel

### 3.1 Create Backend Vercel Project

1. Push your code to GitHub (the .env files will NOT be pushed - they're in .gitignore)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **"Add New..." → Project**
4. Import your GitHub repository
5. **Configure Project:**
   - **Framework Preset**: Other
   - **Root Directory**: `server`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3.2 Add Backend Environment Variables

In Vercel Project Settings → Environment Variables, add:

```env
DATABASE_URL=postgresql://user:pass@host/karaoke_playlists?sslmode=require
GOOGLE_CLIENT_ID=378390134220-xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=https://YOUR-BACKEND-APP.vercel.app/auth/google/callback
SESSION_SECRET=<generate-new-random-secret-for-production>
CLIENT_URL=https://YOUR-FRONTEND-APP.vercel.app
NODE_ENV=production
PORT=5000
```

**⚠️ IMPORTANT**: 
- Use **different secrets** for production than development
- Replace `YOUR-BACKEND-APP` with your actual Vercel backend URL
- Replace `YOUR-FRONTEND-APP` with your actual Vercel frontend URL
- Generate new SESSION_SECRET (don't reuse development secret)

### 3.3 Deploy Backend

Click **Deploy**. Note your backend URL (e.g., `https://karaoke-backend.vercel.app`)

---

## 🎨 Step 4: Deploy Frontend to Vercel

### 4.1 Create Frontend Vercel Project

1. In Vercel Dashboard, click **"Add New..." → Project**
2. Import the **same** GitHub repository
3. **Configure Project:**
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (leave blank - it's the root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 4.2 Add Frontend Environment Variables

In Vercel Project Settings → Environment Variables, add:

```env
VITE_YOUTUBE_API_KEY=your_actual_youtube_api_key_here
VITE_API_URL=https://YOUR-BACKEND-APP.vercel.app
```

Replace `YOUR-BACKEND-APP` with your actual backend URL from Step 3.

### 4.3 Deploy Frontend

Click **Deploy**. Note your frontend URL (e.g., `https://karaoke-app.vercel.app`)

---

## 🔄 Step 5: Update Environment Variables with Actual URLs

Now that you have both URLs, you need to update them:

### Update Backend Environment Variables

Go to your **backend** Vercel project → Settings → Environment Variables and update:
- `CLIENT_URL` → Set to your frontend URL
- `GOOGLE_CALLBACK_URL` → Set to `https://your-backend.vercel.app/auth/google/callback`

**Redeploy** the backend after updating.

### Update Google OAuth Settings

Return to Google Cloud Console and ensure the exact URLs are in Authorized redirect URIs:
- `https://your-actual-backend.vercel.app/auth/google/callback`

---

## ⚠️ Important Changes Required for Production

### 1. Session Storage Issue

**Problem**: Vercel uses serverless functions - in-memory sessions won't work.

**Solution**: Use PostgreSQL session storage. Add to your backend:

```bash
cd server
npm install connect-pg-simple
```

Update `server/src/server.ts`:
```typescript
import pgSession from 'connect-pg-simple';
const PgStore = pgSession(session);

app.use(
  session({
    store: new PgStore({
      pool: pool, // Your existing pool from db.ts
      tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Required for production
      httpOnly: true,
      sameSite: 'none', // Required for cross-origin
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
```

Create session table:
```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
```

### 2. CORS Configuration

Update `server/src/server.ts`:
```typescript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Trust Proxy (for sessions behind Vercel)

Add to `server/src/server.ts` before session middleware:
```typescript
app.set('trust proxy', 1);
```

---

## 🧪 Testing Your Deployment

### Test Checklist:

1. **Frontend loads**: Visit your frontend URL
2. **API health check**: Visit `https://your-backend.vercel.app/health`
3. **Google OAuth**: Click "Sign in with Google" - should redirect to Google
4. **After login**: Should redirect back and show user profile
5. **Search videos**: YouTube API should work
6. **Save playlist**: Should save to database
7. **Reload page**: Session should persist

### Common Issues:

**❌ "CORS Error"**
- Check `CLIENT_URL` in backend matches your frontend URL exactly
- Ensure `credentials: true` in CORS config

**❌ "Session not persisting"**
- Implement `connect-pg-simple` session storage
- Check `trust proxy` is set
- Verify `secure: true` and `sameSite: 'none'` in cookie config

**❌ "Database connection failed"**
- Verify `DATABASE_URL` is correct
- Check if database allows connections from Vercel IPs
- Most providers require `?sslmode=require` at the end of connection string

**❌ "OAuth redirect mismatch"**
- Verify Google Console has exact callback URL
- Check `GOOGLE_CALLBACK_URL` env var matches

---

## 📊 Environment Variables Summary

### Where Secrets Should Be Stored:

| Secret Type | Local Development | Production (Vercel) |
|------------|------------------|---------------------|
| Database URL | `server/.env` (gitignored) | Vercel Dashboard → Backend Project → Settings → Environment Variables |
| Google OAuth | `server/.env` (gitignored) | Vercel Dashboard → Backend Project → Settings → Environment Variables |
| Session Secret | `server/.env` (gitignored) | Vercel Dashboard → Backend Project → Settings → Environment Variables |
| YouTube API Key | `.env` (gitignored) | Vercel Dashboard → Frontend Project → Settings → Environment Variables |
| API URLs | `.env` / `server/.env` (gitignored) | Vercel Dashboard → Respective Projects → Settings → Environment Variables |

**❌ NEVER store in:**
- Source code files
- Git repository
- README or documentation
- Comments in code
- Package.json

**✅ ALWAYS store in:**
- `.env` files (for local development only - these are gitignored)
- Vercel Dashboard Environment Variables (for production)

---

## 🔐 Security Best Practices for Vercel

1. **Different Secrets**: Use completely different secrets for production vs development
2. **Rotate Regularly**: Change production secrets periodically
3. **Least Privilege**: Database user should have minimum required permissions
4. **Monitor Access**: Check Vercel deployment logs for suspicious activity
5. **HTTPS Only**: Ensure all cookies use `secure: true` in production
6. **API Rate Limits**: Implement rate limiting on your backend
7. **Environment Scopes**: Use Vercel's environment scopes (production/preview/development)

---

## 🔄 Continuous Deployment

Once set up, Vercel will automatically:
- Deploy when you push to main branch
- Create preview deployments for pull requests
- Use the same environment variables

To deploy updates:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Vercel will automatically build and deploy both frontend and backend.

---

## 📞 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs/introduction)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [Express Session on Vercel](https://github.com/vercel/examples/tree/main/solutions/sessions)

## 🎉 Deployment Complete!

Your app should now be live at:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.vercel.app`

Don't forget to update your README with the live URLs!

# YT Karaoke Player with User Authentication

Complete setup guide for the karaoke player with Google login and PostgreSQL playlist persistence.

## ⚠️ Security First

**Before starting, read [SECURITY.md](SECURITY.md)** for best practices on handling credentials and environment variables.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- Google Cloud account for OAuth credentials
- OpenSSL (for generating secure secrets)

## Setup Instructions

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb karaoke_playlists

# Run the schema (from server directory)
cd server
psql -d karaoke_playlists -f src/schema.sql
```

### 2. YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the API key (you'll use this in step 4)

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. In the same project, go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add these authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback` (for local development)
5. Copy **Client ID** and **Client Secret** (you'll use these in step 5)

### 4. Frontend Environment Setup

```bash
# From project root
cp .env.example .env

# Edit .env and add your credentials:
# - VITE_YOUTUBE_API_KEY: Your YouTube API key from step 2
# - VITE_API_URL: Keep as http://localhost:5000 for local development
```

**Example `.env` file:**
```env
VITE_YOUTUBE_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567
VITE_API_URL=http://localhost:5000
```

### 5. Backend Environment Setup

```bash
cd server

# Copy environment example
cp .env.example .env

# Generate a secure session secret
openssl rand -base64 32

# Edit server/.env with your credentials:
# - DATABASE_URL: Your PostgreSQL connection string
# - GOOGLE_CLIENT_ID: From step 3
# - GOOGLE_CLIENT_SECRET: From step 3
# - SESSION_SECRET: Use the output from openssl command above
```

**Example `server/.env` file:**
```env
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/karaoke_playlists
GOOGLE_CLIENT_ID=378390134220-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789jkl012
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=Xj9K+mNpQrStUvWxYz1234567890AbCdEfGhIjKl=
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### 6. Install Dependencies and Start

```bash
# Install backend dependencies
cd server
npm install

# Start backend server (in one terminal)
npm run dev

# Install frontend dependencies (in another terminal)
cd ..
npm install

# Start frontend dev server
npm run dev
```

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`

## 🔐 Important Security Notes

- ✅ `.env` files are in `.gitignore` and **will NOT be committed**
- ✅ `.env.example` files are safe to commit (no real credentials)
- ❌ **NEVER** commit actual API keys or secrets to version control
- ❌ **NEVER** share your `.env` files
- ✅ Use different secrets for development and production
- ✅ See [SECURITY.md](SECURITY.md) for complete security guidelines

## Features

✅ **Google Authentication**
- Sign in with Google account
- Secure session management
- User profile with statistics

✅ **Playlist Management**
- Create and save playlists to database
- Load saved playlists
- Delete playlists
- View all saved playlists

✅ **User Profile Page**
- Display user information
- Show playlist and song statistics
- View member since date

✅ **Persistent Storage**
- All playlists saved to PostgreSQL
- Data persists across sessions
- User-specific playlists

## Usage

1. **Sign In**: Click "Sign in with Google" in the header
2. **Search Songs**: Use the search bar to find karaoke videos
3. **Build Playlist**: Click "Add to Playlist" on search results
4. **Save Playlist**: Click "Save" button, enter a name
5. **Load Playlist**: Click your profile → "My Playlists" → "Load"
6. **View Profile**: Click your profile → "Profile" to see stats

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL
- **Authentication**: Passport.js + Google OAuth 2.0
- **Session**: express-session with server-side storage

## API Endpoints

### Auth
- `GET /auth/google` - Initiate OAuth
- `GET /auth/status` - Check auth status
- `POST /auth/logout` - Logout

### Playlists
- `GET /api/playlists` - Get all user playlists
- `POST /api/playlists` - Create playlist
- `GET /api/playlists/:id` - Get playlist details
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/stats` - Get statistics

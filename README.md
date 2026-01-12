# YT Karaoke Player

A modern karaoke player with user authentication, playlist management, and persistent storage. Built with React, TypeScript, Express, and PostgreSQL.

## ✨ Features

### User Experience
- 🎤 **Search karaoke songs** using YouTube Data API v3
- 📺 **Embedded YouTube player** for seamless playback
- 🎵 **Create and save playlists** to your account
- 👤 **Google OAuth authentication** for secure user login
- 📊 **User profile** with playlist and song statistics
- 💾 **Persistent storage** using PostgreSQL database

### Technical Features
- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Built with Vite for fast development
- 📱 Mobile-friendly responsive design
- 🔐 Secure session management
- 🌐 RESTful API with Express
- 🗄️ PostgreSQL database for data persistence

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete local development setup guide
- **[SECURITY.md](SECURITY.md)** - Security best practices and credential management
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Comprehensive Vercel deployment guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL installed and running
- Google Cloud account (for API credentials)

### Local Development Setup

1. **Clone and install dependencies:**
```bash
npm install
cd server && npm install && cd ..
```

2. **Set up environment variables:**
```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env

# Edit .env files with your credentials
# See SETUP.md for detailed instructions
```

3. **Configure database:**
```bash
createdb karaoke_playlists
cd server
psql -d karaoke_playlists -f src/schema.sql
```

4. **Get API credentials:**
   - YouTube Data API v3 key → Add to `.env` as `VITE_YOUTUBE_API_KEY`
   - Google OAuth credentials → Add to `server/.env`
   - See [SETUP.md](SETUP.md) for detailed instructions

5. **Run the application:**
```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
npm run dev
```

6. **Open browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🌐 Deployment to Vercel

See **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** for complete deployment instructions.

### Quick Deployment Summary:

1. **Set up external database** (Neon, Supabase, or Railway)
2. **Deploy backend** as separate Vercel project (use `server/` directory)
3. **Deploy frontend** as main Vercel project (root directory)
4. **Add environment variables** in Vercel Dashboard
5. **Update Google OAuth** redirect URIs with production URLs

**⚠️ Important**: All secrets must be stored in Vercel Environment Variables, never in code.

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React YouTube** for video embedding
- **Context API** for authentication state

### Backend
- **Express** with TypeScript
- **Passport.js** for Google OAuth
- **PostgreSQL** with node-postgres (pg)
- **Express Session** for session management
- **RESTful API** design

## Usage

1. **Sign in** with your Google account
2. **Search** for karaoke songs using the search bar
3. **Add songs** to your current playlist
4. **Save playlist** with a custom name
5. **Load playlists** from your saved collection
6. **View profile** to see your statistics

## Technologies Used

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- YouTube Data API v3
- react-youtube

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- Passport.js
- Google OAuth 2.0

## 🔐 Security

This project follows security best practices:

- ✅ Environment variables for all sensitive data
- ✅ OAuth 2.0 for secure authentication
- ✅ Session-based authentication
- ✅ HTTPS in production
- ✅ Credentials never committed to repository
- ✅ CORS properly configured

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

## Project Structure

```
├── src/                      # Frontend source
│   ├── components/           # React components
│   │   ├── SearchBar.tsx    # Search and results
│   │   ├── VideoPlayer.tsx  # YouTube player
│   │   ├── Playlist.tsx     # Playlist management
│   │   ├── SavedPlaylists.tsx
│   │   └── UserProfile.tsx  # User stats
│   ├── contexts/            # React context providers
│   │   └── AuthContext.tsx  # Authentication state
│   ├── api/                 # API client
│   │   └── api.ts          # Backend API calls
│   ├── App.tsx             # Main component
│   └── main.tsx            # Entry point
├── server/                  # Backend source
│   └── src/
│       ├── server.ts       # Express server
│       ├── auth.ts         # Passport configuration
│       ├── db.ts           # Database connection
│       ├── schema.sql      # Database schema
│       └── routes/         # API routes
│           ├── auth.ts
│           ├── playlists.ts
│           └── user.ts
├── .env.example            # Frontend env template
├── server/.env.example     # Backend env template
└── vercel.json            # Vercel configuration
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### Playlists
- `GET /api/playlists` - Get all user playlists
- `POST /api/playlists` - Create new playlist
- `GET /api/playlists/:id` - Get specific playlist
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/stats` - Get user statistics

## Building for Production

### Frontend
```bash
npm run build
```

### Backend
```bash
cd server
npm run build
```

The build outputs will be in their respective `dist` directories.

## 📝 Environment Variables

### Frontend (`.env`)
```env
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_API_URL=http://localhost:5000
```

### Backend (`server/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/karaoke_playlists
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=your_random_secret
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**⚠️ NEVER commit `.env` files to version control!**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT

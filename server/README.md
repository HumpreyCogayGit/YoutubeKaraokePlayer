# YT Karaoke Player - Server

Backend API for the YT Karaoke Player application with user authentication and playlist persistence.

## Setup

1. **Install PostgreSQL** if not already installed

2. **Create Database:**
```bash
createdb karaoke_playlists
```

3. **Run Database Schema:**
```bash
psql -d karaoke_playlists -f src/schema.sql
```

4. **Install Dependencies:**
```bash
npm install
```

5. **Configure Environment:**
   - Copy `.env.example` to `.env`
   - Update the following values:

```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/karaoke_playlists
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=generate_a_random_secret
```

6. **Get Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
   - Copy Client ID and Client Secret to `.env`

7. **Start Server:**
```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/logout` - Logout user
- `GET /auth/status` - Check authentication status

### Playlists
- `GET /api/playlists` - Get all user playlists
- `GET /api/playlists/:id` - Get specific playlist with items
- `POST /api/playlists` - Create new playlist
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/stats` - Get user statistics

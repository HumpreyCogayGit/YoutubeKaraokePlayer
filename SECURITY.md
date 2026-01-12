# Security Best Practices

## Environment Variables

This project uses environment variables to store sensitive information. **NEVER commit actual credentials to version control.**

### What's Protected

- ✅ `.env` files are in `.gitignore` and will NOT be committed
- ✅ `.env.example` files show the required structure but contain no real credentials
- ✅ `Asset/*.json` files (containing OAuth credentials) are ignored

### Setup Instructions

1. **Copy the example files:**
   ```bash
   # Frontend
   cp .env.example .env
   
   # Backend
   cp server/.env.example server/.env
   ```

2. **Fill in your actual credentials** in the `.env` files (NOT the `.env.example` files)

3. **Never share your `.env` files** - they contain real secrets

### Required Secrets

#### Frontend (`.env`)
- `VITE_YOUTUBE_API_KEY` - YouTube Data API v3 key from Google Cloud Console
- `VITE_API_URL` - Backend API URL (http://localhost:5000 for local dev)

#### Backend (`server/.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `SESSION_SECRET` - Random secret for session encryption
- `CLIENT_URL` - Frontend URL for CORS
- `NODE_ENV` - Environment (development/production)

### Obtaining Credentials

#### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Add to `.env` as `VITE_YOUTUBE_API_KEY`

#### Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Credentials → Create Credentials → OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
5. Copy Client ID and Client Secret to `server/.env`

#### Session Secret
Generate a strong random secret:
```bash
openssl rand -base64 32
```

### Production Deployment (Vercel)

For production deployment:

1. **Never** commit `.env` files
2. Add all environment variables in **Vercel Dashboard** → Project Settings → Environment Variables
3. Use different secrets for production than development
4. Update URLs to production domains:
   - `VITE_API_URL` → your backend URL
   - `GOOGLE_CALLBACK_URL` → your backend URL + `/auth/google/callback`
   - `CLIENT_URL` → your frontend URL

### What NOT to Do

❌ **NEVER** commit files containing:
- API keys or tokens
- Database credentials
- OAuth client secrets
- Session secrets
- Any `.env` file with real values

❌ **NEVER** hardcode credentials in source code

❌ **NEVER** share credentials via email, chat, or screenshots

✅ **ALWAYS** use environment variables for sensitive data

✅ **ALWAYS** use different secrets for development and production

✅ **ALWAYS** rotate credentials if they're accidentally exposed

## If You Accidentally Commit Secrets

1. **Immediately** revoke/regenerate the exposed credentials
2. Remove them from git history (use tools like `git-filter-repo`)
3. Update all systems using the new credentials
4. Audit access logs for unauthorized usage

## Questions?

See [SETUP.md](SETUP.md) for detailed setup instructions.

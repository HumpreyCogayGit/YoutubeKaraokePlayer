# Database Deployment Guide

## Quick Start

### Option 1: Using the Deployment Script (Recommended)

**Windows (PowerShell):**
```powershell
cd server
.\deploy-db.ps1
```

**Linux/Mac (Bash):**
```bash
cd server
chmod +x deploy-db.sh
./deploy-db.sh
```

The script will:
1. Load `DATABASE_URL` from `server/.env`
2. Warn you about data loss
3. Drop all existing tables
4. Create all tables fresh
5. Verify the deployment

### Option 2: Manual psql Command

```bash
psql 'postgresql://user:password@host:5432/database' -f server/src/schema-complete.sql
```

### Option 3: Railway CLI

```bash
railway login
railway link
railway run psql -f server/src/schema-complete.sql
```

## Files

### `server/src/schema-complete.sql`
**Complete database schema** - Single file containing:
- DROP statements for all tables
- CREATE statements for all tables (users, playlists, parties, sessions)
- All indexes for performance
- Triggers and functions
- Guest user support built-in

### `server/deploy-db.ps1`
PowerShell deployment script for Windows

### `server/deploy-db.sh`
Bash deployment script for Linux/Mac

## What Gets Created

### Core Tables
- `users` - User accounts (Google OAuth)
- `session` - Express session storage
- `playlists` - User playlists
- `playlist_items` - Songs in playlists

### Party Mode Tables
- `parties` - Party sessions
- `party_members` - Authenticated members
- `party_songs` - Shared queue (supports both users and guests)

### Indexes
All necessary indexes for optimal query performance

### Functions & Triggers
- `update_updated_at_column()` - Auto-update timestamps
- Triggers on `users` and `playlists` tables

## Environment Setup

Create `server/.env` with:
```env
DATABASE_URL=postgresql://username:password@host:5432/database
SESSION_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:3000
```

## Safety Notes

⚠️ **WARNING**: Running the deployment script will:
- **DROP ALL EXISTING TABLES**
- **DELETE ALL DATA**
- Cannot be undone

### For Production Databases:
1. **Backup first**: `pg_dump` your database
2. Test in a staging environment
3. Schedule during maintenance window
4. Have rollback plan ready

### For Development:
Just run it - no worries! 🎉

## Verification

After deployment, verify tables:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected tables:
- parties
- party_members
- party_songs
- playlist_items
- playlists
- session
- users

## Troubleshooting

### "psql: command not found"
Install PostgreSQL client tools:
- **Windows**: Download from postgresql.org
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`

### "DATABASE_URL not found"
Set it in `server/.env` or export it:
```bash
export DATABASE_URL='postgresql://...'
```

### Connection errors
- Check firewall rules
- Verify database credentials
- Ensure database exists
- Check SSL requirements (add `?sslmode=require` if needed)

### Railway specific
```bash
# Get your database URL
railway variables

# Or run directly
railway run psql -f server/src/schema-complete.sql
```

## Migration from Old Schema

If you're upgrading from the old multi-file schema:
1. This replaces all of: `schema.sql`, `schema-party.sql`, `schema-party-update.sql`, `schema-session.sql`
2. Includes all updates (guest support, etc.)
3. Fresh start - drops everything first

## Next Steps

After successful deployment:
1. Start your server: `npm run dev`
2. Server will run automatic migrations on startup (for future updates)
3. Test authentication and party features
4. All 500 errors should be resolved

## Support

If you encounter issues:
1. Check server logs
2. Verify `DATABASE_URL` is correct
3. Ensure PostgreSQL version is 12+
4. Check network connectivity to database

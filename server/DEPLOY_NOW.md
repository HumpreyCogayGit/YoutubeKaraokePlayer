# 🚀 Quick Database Deployment

## Deploy to Production (Railway)

```bash
# Method 1: Using psql directly
psql 'postgresql://neondb_owner:npg_TMaV8fu2tjCX@ep-withered-water-ade602gh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -f server/src/schema-complete.sql

# Method 2: Using environment variable
cd server
.\deploy-db.ps1
```

## What This Does
✅ Drops all existing tables  
✅ Creates fresh schema  
✅ Adds all indexes  
✅ Fixes the 500 errors  
✅ Adds guest user support  

## File Reference
- **Deploy**: `server/src/schema-complete.sql` (THE ONLY FILE YOU NEED)
- **Script**: `server/deploy-db.ps1` (helper script)
- **Docs**: `server/DATABASE_DEPLOYMENT.md` (full guide)

## After Deployment
1. Test: `GET /api/party/my-parties` ✓
2. Test: Party creation and joining ✓
3. All 500 errors should be gone ✓

---
⚠️ **Backup first if production has data!**

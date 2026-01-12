-- Session table for production (Vercel serverless)
-- Required when using connect-pg-simple for session storage

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

-- Index for efficient session cleanup
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- You can run this on your production database:
-- psql "your-production-database-url" -f server/src/schema-session.sql

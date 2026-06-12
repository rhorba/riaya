-- ══════════════════════════════════════════════════════════════════════════
-- Riaya — Database Initialization
-- Run ONCE before first migration, as a superuser.
-- ══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector for caregiver matching
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- trigram for name search

-- App role (used by the application; not a superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'riaya_app') THEN
    CREATE ROLE riaya_app LOGIN PASSWORD 'change-me-in-production';
  END IF;
END
$$;

-- Database
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'riaya') THEN
    CREATE DATABASE riaya OWNER riaya_app;
  END IF;
END
$$;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO riaya_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO riaya_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO riaya_app;

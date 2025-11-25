-- Migration: Create email_whitelist table for user profile data
-- Date: 2024-11-25
-- Description: Move user profile data from users table to email_whitelist table for better organization

-- Create email_whitelist table to store user profile information
CREATE TABLE IF NOT EXISTS email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  avatar_url TEXT,
  organization VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'team', 'user', 'member')),
  auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
  provider_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  verification_expires_at TIMESTAMPTZ,
  password_hash VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_whitelist_email ON email_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_email_whitelist_username ON email_whitelist(username);
CREATE INDEX IF NOT EXISTS idx_email_whitelist_role ON email_whitelist(role);
CREATE INDEX IF NOT EXISTS idx_email_whitelist_provider ON email_whitelist(auth_provider);
CREATE INDEX IF NOT EXISTS idx_email_whitelist_active ON email_whitelist(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_email_whitelist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_whitelist_updated_at
  BEFORE UPDATE ON email_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION update_email_whitelist_updated_at();

-- Add comments for documentation
COMMENT ON TABLE email_whitelist IS 'Stores user profile data and authentication information';
COMMENT ON COLUMN email_whitelist.id IS 'Primary key UUID';
COMMENT ON COLUMN email_whitelist.email IS 'User email address (unique)';
COMMENT ON COLUMN email_whitelist.full_name IS 'User full name (required)';
COMMENT ON COLUMN email_whitelist.username IS 'Unique username for the user profile';
COMMENT ON COLUMN email_whitelist.gender IS 'User gender preference: male, female, other, prefer_not_to_say';
COMMENT ON COLUMN email_whitelist.avatar_url IS 'URL to user profile picture stored in Supabase Storage';
COMMENT ON COLUMN email_whitelist.organization IS 'User organization/company';
COMMENT ON COLUMN email_whitelist.phone IS 'User phone number';
COMMENT ON COLUMN email_whitelist.role IS 'User role: admin, team, user, member';
COMMENT ON COLUMN email_whitelist.auth_provider IS 'Authentication provider: email, google, github';
COMMENT ON COLUMN email_whitelist.provider_id IS 'Provider-specific user ID for OAuth';
COMMENT ON COLUMN email_whitelist.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN email_whitelist.is_verified IS 'Whether the user email is verified';
COMMENT ON COLUMN email_whitelist.verification_token IS 'Token for email verification';
COMMENT ON COLUMN email_whitelist.verification_expires_at IS 'Expiration time for verification token';
COMMENT ON COLUMN email_whitelist.password_hash IS 'Hashed password for email authentication';
COMMENT ON COLUMN email_whitelist.last_login_at IS 'Timestamp of last login';
COMMENT ON COLUMN email_whitelist.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN email_whitelist.updated_at IS 'Record last update timestamp';

-- Migrate existing data from users table to email_whitelist (if users table exists and has data)
-- This is optional and should be run carefully in production
DO $$
BEGIN
  -- Check if users table exists and has profile data
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'users' 
    AND table_schema = 'public'
  ) THEN
    -- Migrate data from users to email_whitelist
    INSERT INTO email_whitelist (
      email, 
      full_name, 
      username, 
      gender, 
      avatar_url, 
      organization, 
      phone, 
      role, 
      auth_provider, 
      provider_id,
      created_at, 
      updated_at
    )
    SELECT 
      email,
      full_name,
      username,
      gender,
      avatar_url,
      organization,
      phone,
      COALESCE(role, 'user')::VARCHAR as role,
      COALESCE(auth_provider, 'email')::VARCHAR as auth_provider,
      provider_id,
      COALESCE(created_at, NOW()) as created_at,
      COALESCE(updated_at, NOW()) as updated_at
    FROM users
    WHERE email IS NOT NULL 
    AND full_name IS NOT NULL
    ON CONFLICT (email) DO NOTHING; -- Skip duplicates
    
    RAISE NOTICE 'Successfully migrated user data to email_whitelist table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Migration from users table skipped or failed: %', SQLERRM;
END $$;

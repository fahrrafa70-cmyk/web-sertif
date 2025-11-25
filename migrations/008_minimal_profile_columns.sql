-- Minimal columns for profile page functionality
-- Add these columns to your existing email_whitelist table

-- Core profile columns that are used in profile page
ALTER TABLE email_whitelist 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Essential columns for basic functionality  
ALTER TABLE email_whitelist
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NOT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_whitelist_email ON email_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_email_whitelist_username ON email_whitelist(username);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_email_whitelist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_email_whitelist_updated_at
  BEFORE UPDATE ON email_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION update_email_whitelist_updated_at();

-- Comments for profile columns
COMMENT ON COLUMN email_whitelist.full_name IS 'User full name (required for profile)';
COMMENT ON COLUMN email_whitelist.username IS 'Unique username for profile (3-50 chars, lowercase alphanumeric + underscore)';
COMMENT ON COLUMN email_whitelist.gender IS 'User gender: male, female, other, prefer_not_to_say (optional)';
COMMENT ON COLUMN email_whitelist.avatar_url IS 'Profile picture URL from Supabase Storage (optional)';

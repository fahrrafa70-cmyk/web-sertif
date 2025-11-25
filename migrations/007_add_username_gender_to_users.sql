-- Migration: Add username and gender fields to users table
-- Date: 2024-11-24
-- Description: Add username (unique) and gender fields for user profile editing functionality

-- Add username column (unique, nullable initially for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Add gender column (nullable, enum-like constraint)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Create index for username for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add comments
COMMENT ON COLUMN users.username IS 'Unique username for the user profile, can be changed by user';
COMMENT ON COLUMN users.gender IS 'User gender preference: male, female, other, prefer_not_to_say';

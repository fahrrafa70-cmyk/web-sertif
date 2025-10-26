-- Migration: Add score image URL to certificates table for dual templates
-- This migration adds support for storing both certificate and score images in the same certificate record

-- Add score_image_url column to certificates table
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS score_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN certificates.score_image_url IS 'URL for the score image (for dual templates)';

-- Note: No index created on score_image_url as TEXT columns can contain very long URLs
-- that exceed PostgreSQL's index entry size limit (8191 bytes)

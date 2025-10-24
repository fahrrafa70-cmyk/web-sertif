-- Migration: Add dual template support fields
-- This migration adds fields to support dual templates (certificate + score)

-- Add new columns to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS certificate_image_url TEXT,
ADD COLUMN IF NOT EXISTS score_image_url TEXT,
ADD COLUMN IF NOT EXISTS is_dual_template BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN templates.certificate_image_url IS 'URL for the certificate image (front side)';
COMMENT ON COLUMN templates.score_image_url IS 'URL for the score image (back side)';
COMMENT ON COLUMN templates.is_dual_template IS 'Whether this template supports both certificate and score modes';

-- Update existing templates to have is_dual_template = false
UPDATE templates SET is_dual_template = FALSE WHERE is_dual_template IS NULL;

-- Make is_dual_template NOT NULL with default
ALTER TABLE templates ALTER COLUMN is_dual_template SET NOT NULL;
ALTER TABLE templates ALTER COLUMN is_dual_template SET DEFAULT FALSE;

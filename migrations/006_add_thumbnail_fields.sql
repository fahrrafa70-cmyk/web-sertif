-- Migration: Add thumbnail fields to templates table
-- This migration adds optimized thumbnail path fields for better performance

-- Add thumbnail path columns
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS preview_thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS certificate_thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS score_thumbnail_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN templates.thumbnail_path IS 'Optimized thumbnail path for main template image';
COMMENT ON COLUMN templates.preview_thumbnail_path IS 'Optimized thumbnail path for preview image';
COMMENT ON COLUMN templates.certificate_thumbnail_path IS 'Optimized thumbnail path for certificate image (dual templates)';
COMMENT ON COLUMN templates.score_thumbnail_path IS 'Optimized thumbnail path for score image (dual templates)';

-- Create index for better query performance on thumbnail fields
CREATE INDEX IF NOT EXISTS idx_templates_thumbnail_path ON templates(thumbnail_path) WHERE thumbnail_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_preview_thumbnail_path ON templates(preview_thumbnail_path) WHERE preview_thumbnail_path IS NOT NULL;

-- Update existing templates to use optimized cache busting
-- This is a one-time update to improve existing template performance
UPDATE templates 
SET updated_at = NOW() 
WHERE (image_path IS NOT NULL OR preview_image_path IS NOT NULL)
  AND (thumbnail_path IS NULL AND preview_thumbnail_path IS NULL);

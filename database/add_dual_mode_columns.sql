-- Add dual-mode template support to templates table
-- Run this SQL in your Supabase SQL Editor

-- Add mode column (single or dual)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS mode VARCHAR(10) DEFAULT 'single' CHECK (mode IN ('single', 'dual'));

-- Add score_image_path column for dual mode templates
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS score_image_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN templates.mode IS 'Template mode: single (certificate only) or dual (certificate + score)';
COMMENT ON COLUMN templates.score_image_path IS 'Path to score sheet image (only for dual mode templates)';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'templates'
ORDER BY ordinal_position;

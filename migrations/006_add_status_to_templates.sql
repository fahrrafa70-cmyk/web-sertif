-- Migration: Add status field to templates
-- This migration adds a status field to track template status (ready or draft)

-- Add status column to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Add comment for documentation
COMMENT ON COLUMN templates.status IS 'Template status: ready or draft';

-- Migrate existing templates:
-- - If is_layout_configured = true, set status = 'ready'
-- - Otherwise, set status = 'draft'
UPDATE templates 
SET status = CASE 
  WHEN is_layout_configured = TRUE THEN 'ready'
  ELSE 'draft'
END
WHERE status IS NULL OR status = 'draft';

-- Add constraint to ensure status is either 'ready' or 'draft'
ALTER TABLE templates 
ADD CONSTRAINT templates_status_check 
CHECK (status IN ('ready', 'draft'));


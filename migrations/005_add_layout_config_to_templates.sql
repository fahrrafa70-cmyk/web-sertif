-- Migration: Add layout configuration to templates
-- This migration adds fields to store complete layout configuration in database
-- instead of localStorage for better persistence and shareability

-- Add new columns to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS layout_config_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS layout_config_updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_layout_configured BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN templates.layout_config IS 'Complete layout configuration including text layers, overlay images, and font settings (JSONB format)';
COMMENT ON COLUMN templates.layout_config_updated_at IS 'Timestamp when layout configuration was last updated';
COMMENT ON COLUMN templates.layout_config_updated_by IS 'User ID who last updated the layout configuration';
COMMENT ON COLUMN templates.is_layout_configured IS 'Whether this template has complete layout configuration ready for Quick Generate';

-- Create index for faster queries on configured templates
CREATE INDEX IF NOT EXISTS idx_templates_is_layout_configured 
ON templates(is_layout_configured);

-- Create index for layout config updates tracking
CREATE INDEX IF NOT EXISTS idx_templates_layout_updated_at 
ON templates(layout_config_updated_at DESC);

-- Mark all existing templates as not configured
UPDATE templates 
SET is_layout_configured = FALSE 
WHERE layout_config IS NULL;

-- Add constraint to ensure layout_config is valid JSON when present
ALTER TABLE templates 
ADD CONSTRAINT check_layout_config_valid 
CHECK (layout_config IS NULL OR jsonb_typeof(layout_config) = 'object');

-- Grant necessary permissions (adjust based on your RLS policies)
-- Note: This assumes you have proper RLS policies in place
-- If not, you may need to add them separately

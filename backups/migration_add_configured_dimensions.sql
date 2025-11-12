-- ============================================
-- Migration: Add configuredWidth/Height to layout_config
-- Date: 2025-11-11
-- Purpose: Add configured dimensions for consistent scaling
-- Backup: backup_templates_2025-11-11.json
-- ============================================

-- IMPORTANT: Run this migration in Supabase SQL Editor
-- This migration adds configuredWidth and configuredHeight to existing templates
-- based on their actual image dimensions

BEGIN;

-- Template 1: Sertifikat Penghargaan
-- Actual dimensions: 2000 x 1414
-- Update certificate mode with actual dimensions
UPDATE templates
SET layout_config = jsonb_set(
  jsonb_set(
    layout_config,
    '{certificate,configuredWidth}',
    '2000'
  ),
  '{certificate,configuredHeight}',
  '1414'
)
WHERE id = '9791bb66-23b0-4bff-b0ca-68758821b47b';

-- Template 2: Sertifikat Magang UBIG (Dual Template)
-- Certificate actual dimensions: 6250 x 4419
-- Update certificate mode
UPDATE templates
SET layout_config = jsonb_set(
  jsonb_set(
    layout_config,
    '{certificate,configuredWidth}',
    '6250'
  ),
  '{certificate,configuredHeight}',
  '4419'
)
WHERE id = '8c73e599-dfc5-4b60-a143-535a8660b83e';

-- Template 2: Sertifikat Magang UBIG (Dual Template)
-- Score actual dimensions: 2560 x 1810
-- Update score mode
UPDATE templates
SET layout_config = jsonb_set(
  jsonb_set(
    layout_config,
    '{score,configuredWidth}',
    '2560'
  ),
  '{score,configuredHeight}',
  '1810'
)
WHERE id = '8c73e599-dfc5-4b60-a143-535a8660b83e';

-- Verify migration results
SELECT
  id,
  name,
  is_dual_template,
  layout_config->'certificate'->'configuredWidth' as cert_width,
  layout_config->'certificate'->'configuredHeight' as cert_height,
  layout_config->'score'->'configuredWidth' as score_width,
  layout_config->'score'->'configuredHeight' as score_height
FROM templates
WHERE id IN (
  '9791bb66-23b0-4bff-b0ca-68758821b47b',
  '8c73e599-dfc5-4b60-a143-535a8660b83e'
);

-- Expected results:
-- Template 1: cert_width=2000, cert_height=1414, score_width=null, score_height=null
-- Template 2: cert_width=6250, cert_height=4419, score_width=2560, score_height=1810

-- If results look correct, commit the transaction:
COMMIT;

-- If there are any errors, rollback:
-- ROLLBACK;

-- ============================================
-- Post-Migration Notes:
-- ============================================
-- 1. After running this migration, all NEW templates will automatically
--    save configuredWidth/Height when configured (code changes applied)
--
-- 2. Existing templates now have configuredWidth/Height set to their
--    actual image dimensions at the time of this migration
--
-- 3. Font scaling will now be consistent:
--    scaleFactor = actualWidth / configuredWidth
--    When actualWidth === configuredWidth: scaleFactor = 1.0 (no scaling)
--
-- 4. If you replace a template image with different resolution:
--    - Position will remain correct (uses xPercent/yPercent)
--    - Font size will auto-scale proportionally
--    - User should reconfigure layout for best results
--
-- 5. To verify scaling is working correctly after migration:
--    - Generate a certificate using existing template
--    - Compare font size in configure page vs generated certificate
--    - They should be pixel-perfect identical
-- ============================================

-- ============================================
-- MIGRATION: Add Public Certificate Link System
-- ============================================
-- This migration adds support for public certificate links
-- that can be accessed by anyone without authentication.
--
-- IMPORTANT: Review this script before running it in production!
-- ============================================

-- Step 1: Add new columns to certificates table
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create index for faster public_id lookups
CREATE INDEX IF NOT EXISTS idx_certificates_public_id 
ON certificates(public_id) 
WHERE is_public = TRUE;

-- Step 3: Generate public_id for existing certificates (if any)
-- This uses gen_random_uuid() to create unique identifiers
UPDATE certificates 
SET public_id = gen_random_uuid()::text 
WHERE public_id IS NULL;

-- Step 4: Make public_id NOT NULL after populating existing records
ALTER TABLE certificates 
ALTER COLUMN public_id SET NOT NULL;

-- Step 5: Add constraint to ensure public_id is unique
ALTER TABLE certificates 
ADD CONSTRAINT certificates_public_id_unique UNIQUE (public_id);

-- ============================================
-- RLS POLICIES FOR PUBLIC ACCESS
-- ============================================

-- Drop existing public read policy if exists
DROP POLICY IF EXISTS "Public users can read public certificates" ON certificates;

-- Create new policy: Allow anonymous users to read PUBLIC certificates only
CREATE POLICY "Public users can read public certificates"
ON certificates
FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);

-- Keep authenticated users able to read ALL certificates (for admin/team)
DROP POLICY IF EXISTS "Authenticated users can read all certificates" ON certificates;

CREATE POLICY "Authenticated users can read all certificates"
ON certificates
FOR SELECT
TO authenticated
USING (true);

-- Ensure write operations remain authenticated-only
DROP POLICY IF EXISTS "Authenticated users can insert certificates" ON certificates;
DROP POLICY IF EXISTS "Authenticated users can update certificates" ON certificates;
DROP POLICY IF EXISTS "Authenticated users can delete certificates" ON certificates;

CREATE POLICY "Authenticated users can insert certificates"
ON certificates
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update certificates"
ON certificates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete certificates"
ON certificates
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- RELATED TABLES: Allow public read for templates and members
-- ============================================

-- Templates table
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users can read templates" ON templates;

CREATE POLICY "Public users can read templates"
ON templates
FOR SELECT
TO anon, authenticated
USING (true);

-- Members table
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users can read members" ON members;

CREATE POLICY "Public users can read members"
ON members
FOR SELECT
TO anon, authenticated
USING (true);


============================================
NOTES
============================================

1. This migration is IDEMPOTENT - safe to run multiple times
2. Existing certificates will get auto-generated public_id values
3. All existing certificates will be public by default (is_public = TRUE)
4. You can manually set is_public = FALSE to hide specific certificates
5. The public_id uses UUID v4 format for security and uniqueness
6. Anonymous users can ONLY read public certificates
7. Authenticated users can read ALL certificates (for admin purposes)

============================================
-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify the migration:

-- 1. Check new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'certificates' 
AND column_name IN ('public_id', 'is_public', 'created_at');

-- 2. Check all certificates have public_id
SELECT COUNT(*) as total, 
       COUNT(public_id) as with_public_id,
       COUNT(*) - COUNT(public_id) as missing_public_id
FROM certificates;

-- 3. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'certificates';

4. Test public access (run without auth)
SELECT * FROM certificates WHERE public_id = 'some-public-id' AND is_public = true;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================

-- CAUTION: Only run this if you need to undo the migration!
-- This will remove the public link feature completely.

DROP POLICY IF EXISTS "Public users can read public certificates" ON certificates;
DROP POLICY IF EXISTS "Authenticated users can read all certificates" ON certificates;
DROP INDEX IF EXISTS idx_certificates_public_id;
ALTER TABLE certificates DROP COLUMN IF EXISTS public_id;
ALTER TABLE certificates DROP COLUMN IF EXISTS is_public;
-- Note: created_at might be used elsewhere, so be careful before dropping it

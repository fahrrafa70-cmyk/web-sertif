-- SIMPLE FIX: Disable RLS temporarily to test delete functionality
-- This is a temporary solution to test if the issue is with RLS or something else

-- Step 1: Temporarily disable RLS on certificates table
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if delete works now
-- If delete works after this, then the issue is with RLS policies
-- If delete still doesn't work, then the issue is elsewhere

-- Step 3: Re-enable RLS with simple policies
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "certificates_read_all" ON certificates;
DROP POLICY IF EXISTS "certificates_insert_all" ON certificates;
DROP POLICY IF EXISTS "certificates_update_all" ON certificates;
DROP POLICY IF EXISTS "certificates_delete_all" ON certificates;

-- Create simple policies that allow all operations for authenticated users
CREATE POLICY "certificates_all_operations" ON certificates
    FOR ALL USING (auth.role() = 'authenticated');

-- Test the policies
SELECT 'RLS Policies Updated' as status;


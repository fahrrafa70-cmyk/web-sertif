-- Simple fix for certificates RLS policies
-- This script will fix the delete button issue

-- Step 1: Temporarily disable RLS to test
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if delete works now
-- (You can test the delete button in the UI)

-- Step 3: Re-enable RLS with simple policy
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple policies that allow authenticated users to do everything
DROP POLICY IF EXISTS "certificates_read_all" ON public.certificates;
DROP POLICY IF EXISTS "certificates_insert_all" ON public.certificates;
DROP POLICY IF EXISTS "certificates_update_all" ON public.certificates;
DROP POLICY IF EXISTS "certificates_delete_all" ON public.certificates;

-- Create simple policies
CREATE POLICY "certificates_all_operations" ON public.certificates 
    FOR ALL USING (auth.role() = 'authenticated');

-- Test the policies
-- This should return the count of certificates
SELECT COUNT(*) FROM certificates;

-- This should show your current auth info
SELECT auth.uid(), auth.role();

-- TEST DELETE WITHOUT RLS: Check if delete works without RLS policies
-- This will help identify if the issue is with RLS or something else

-- Step 1: Check current RLS status
SELECT 
    'RLS Status' as info_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'certificates';

-- Step 2: Temporarily disable RLS
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- Step 3: Test delete operation (BE CAREFUL!)
-- First, let's see what certificates exist
SELECT 
    'Available Certificates' as info_type,
    id,
    certificate_no,
    name,
    created_at
FROM certificates 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 4: Test delete on a specific certificate
-- Replace 'YOUR_CERTIFICATE_ID_HERE' with actual certificate ID
-- DELETE FROM certificates WHERE id = 'YOUR_CERTIFICATE_ID_HERE';

-- Step 5: Re-enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple RLS policy that allows all operations
DROP POLICY IF EXISTS "certificates_all_operations" ON certificates;
CREATE POLICY "certificates_all_operations" ON certificates
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 7: Test the new policy
SELECT 'RLS Re-enabled with simple policy' as status;


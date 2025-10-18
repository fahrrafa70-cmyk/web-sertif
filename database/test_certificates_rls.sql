-- Test RLS policies for certificates table
-- Run this script to test if the policies are working correctly

-- Test 1: Check if user can read certificates
SELECT 
    'READ TEST' as test_type,
    COUNT(*) as certificate_count,
    'Should return count of certificates' as expected_result
FROM certificates;

-- Test 2: Check if user can delete certificates (this will fail if RLS blocks it)
-- Uncomment the line below to test delete (BE CAREFUL - this will actually delete!)
-- DELETE FROM certificates WHERE id = 'some-test-id';

-- Test 3: Check current user session info
SELECT 
    'SESSION INFO' as test_type,
    auth.uid() as user_id,
    auth.role() as auth_role,
    'Should show current user info' as expected_result;

-- Test 4: Check if get_user_role function works
SELECT 
    'ROLE FUNCTION TEST' as test_type,
    public.get_user_role() as user_role,
    'Should return user role from users table' as expected_result;

-- Test 5: Check RLS policies on certificates table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'certificates'
ORDER BY policyname;


-- DIAGNOSTIC SCRIPT: Check what's preventing certificate deletion
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check current RLS policies on certificates table
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

-- 2. Check if RLS is enabled on certificates table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'certificates';

-- 3. Check current user session info
SELECT 
    'Current Session Info' as info_type,
    auth.uid() as user_id,
    auth.role() as auth_role,
    'Should show current user info' as expected_result;

-- 4. Check if user exists in auth.users
SELECT 
    'Auth Users Check' as info_type,
    COUNT(*) as user_count,
    'Should show count of users in auth.users' as expected_result
FROM auth.users;

-- 5. Check if user exists in public.users table
SELECT 
    'Public Users Check' as info_type,
    COUNT(*) as user_count,
    'Should show count of users in public.users' as expected_result
FROM public.users;

-- 6. Test if we can read certificates (should work)
SELECT 
    'Read Test' as test_type,
    COUNT(*) as certificate_count,
    'Should return count of certificates' as expected_result
FROM certificates;

-- 7. Check certificate data structure
SELECT 
    'Certificate Structure' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'certificates' 
ORDER BY ordinal_position;

-- 8. Test delete operation (BE CAREFUL - this will actually delete!)
-- Uncomment the line below to test delete (replace 'test-id' with actual ID)
-- DELETE FROM certificates WHERE id = 'test-id';

-- 9. Check if there are any foreign key constraints
SELECT 
    'Foreign Keys' as info_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'certificates';


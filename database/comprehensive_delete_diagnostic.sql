-- COMPREHENSIVE DELETE DIAGNOSTIC
-- This script will help identify exactly what's preventing certificate deletion

-- 1. Check RLS status and policies
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'certificates';

-- 2. List all RLS policies on certificates table
SELECT 
    'RLS Policies' as check_type,
    policyname,
    cmd as operation,
    qual as condition,
    with_check as insert_check
FROM pg_policies 
WHERE tablename = 'certificates'
ORDER BY policyname;

-- 3. Check current user session
SELECT 
    'Session Info' as check_type,
    auth.uid() as user_id,
    auth.role() as auth_role,
    'Current session details' as description;

-- 4. Check if user exists in auth.users
SELECT 
    'Auth Users' as check_type,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = auth.uid();

-- 5. Check if user exists in public.users table
SELECT 
    'Public Users' as check_type,
    id,
    email,
    role,
    created_at
FROM public.users 
WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
);

-- 6. Test read operation (should work)
SELECT 
    'Read Test' as check_type,
    COUNT(*) as certificate_count,
    'Should return count of certificates' as expected_result
FROM certificates;

-- 7. Check certificate data structure
SELECT 
    'Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'certificates' 
ORDER BY ordinal_position;

-- 8. Check foreign key constraints
SELECT 
    'Foreign Keys' as check_type,
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

-- 9. Test delete with RLS disabled (BE CAREFUL!)
-- Uncomment the lines below to test delete without RLS
-- ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
-- DELETE FROM certificates WHERE id = 'test-id-here';
-- ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 10. Check if there are any triggers on certificates table
SELECT 
    'Triggers' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'certificates';


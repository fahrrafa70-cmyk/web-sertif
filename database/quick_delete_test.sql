-- QUICK DELETE TEST: Test delete functionality step by step
-- This will help identify if the issue is authentication or RLS

-- Step 1: Check if user is authenticated
SELECT 
    'Authentication Check' as test_step,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
        ELSE 'User is NOT authenticated'
    END as auth_status,
    auth.uid() as user_id,
    auth.role() as auth_role;

-- Step 2: Check RLS status
SELECT 
    'RLS Status Check' as test_step,
    CASE 
        WHEN rowsecurity = true THEN 'RLS is ENABLED'
        ELSE 'RLS is DISABLED'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'certificates';

-- Step 3: Test read operation
SELECT 
    'Read Test' as test_step,
    COUNT(*) as certificate_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'Read operation SUCCESS'
        ELSE 'Read operation FAILED'
    END as read_status
FROM certificates;

-- Step 4: Test insert operation (create a test record)
-- Uncomment the lines below to test insert
-- INSERT INTO certificates (
--     certificate_no, 
--     name, 
--     description, 
--     issue_date, 
--     category, 
--     template_id, 
--     created_by
-- ) VALUES (
--     'TEST-' || extract(epoch from now())::text,
--     'Test User',
--     'Test Certificate',
--     current_date,
--     'Test',
--     (SELECT id FROM templates LIMIT 1),
--     auth.uid()
-- );

-- Step 5: Test delete operation (BE CAREFUL!)
-- First, let's see what certificates exist
SELECT 
    'Available Certificates' as test_step,
    id,
    certificate_no,
    name,
    created_at
FROM certificates 
ORDER BY created_at DESC 
LIMIT 3;

-- Uncomment the line below to test delete (replace with actual ID)
-- DELETE FROM certificates WHERE id = 'YOUR_CERTIFICATE_ID_HERE';

-- Step 6: Check for any error logs
-- This would show in Supabase logs, not in SQL

-- Step 7: Test with RLS disabled (BE CAREFUL!)
-- Uncomment the lines below to test without RLS
-- ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
-- DELETE FROM certificates WHERE id = 'YOUR_CERTIFICATE_ID_HERE';
-- ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;


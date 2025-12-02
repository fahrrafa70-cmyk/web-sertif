-- Check if email_whitelist table exists and show its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'email_whitelist'
ORDER BY 
    ordinal_position;

-- Show constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'email_whitelist';

-- Count records
SELECT COUNT(*) as total_records FROM email_whitelist;

-- Show recent records
SELECT 
    email,
    full_name,
    role,
    auth_provider,
    is_verified,
    created_at
FROM email_whitelist
ORDER BY created_at DESC
LIMIT 10;

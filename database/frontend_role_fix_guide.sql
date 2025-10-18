-- FRONTEND ROLE FIX: Fix role checking in certificates page
-- The issue is that certificates page uses localStorage role instead of AuthContext

-- This is a JavaScript fix, not a database fix
-- The problem is in src/app/certificates/page.tsx

-- CURRENT ISSUE:
-- 1. AuthContext uses: "admin" | "team" | "user" (lowercase)
-- 2. Certificates page uses: "Admin" | "Team" | "Public" (capitalized)
-- 3. RLS policies use: auth.role() = 'authenticated'

-- SOLUTION OPTIONS:

-- Option 1: Use AuthContext in certificates page (RECOMMENDED)
-- Replace localStorage role checking with AuthContext

-- Option 2: Fix localStorage role mapping
-- Ensure localStorage stores lowercase roles

-- Option 3: Fix RLS policies to work with actual authentication
-- Use auth.role() = 'authenticated' for all operations

-- The real issue is likely that:
-- 1. User is not properly authenticated (no session)
-- 2. RLS policies are blocking the delete operation
-- 3. Role checking is inconsistent between frontend and backend

-- To fix this, run the comprehensive diagnostic script first:
-- database/comprehensive_delete_diagnostic.sql

-- Then apply the appropriate fix based on the diagnostic results.


-- Fix RLS policies for certificates table - CORRECTED VERSION
-- This file fixes the RLS policies to work with the actual authentication system

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "certs_read_admin_team" ON public.certificates;
DROP POLICY IF EXISTS "certs_read_public_own" ON public.certificates;
DROP POLICY IF EXISTS "certs_write_admin_team" ON public.certificates;
DROP POLICY IF EXISTS "certs_update_admin_team" ON public.certificates;
DROP POLICY IF EXISTS "certs_delete_admin" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to read certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to update certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to delete certificates" ON public.certificates;

-- Create a function to get user role from users table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_email TEXT;
    user_role TEXT;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- If no email found, return null
    IF user_email IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get role from users table
    SELECT role INTO user_role 
    FROM public.users 
    WHERE email = user_email;
    
    -- Return role or null if not found
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies that work with the actual authentication system
-- Read: Allow all authenticated users to read certificates
CREATE POLICY "certificates_read_all" ON public.certificates 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert: Allow all authenticated users to create certificates
CREATE POLICY "certificates_insert_all" ON public.certificates 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update: Allow all authenticated users to update certificates
CREATE POLICY "certificates_update_all" ON public.certificates 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Delete: Allow all authenticated users to delete certificates
CREATE POLICY "certificates_delete_all" ON public.certificates 
    FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: If you want role-based access control, use these policies instead:
-- (Comment out the above policies and uncomment these)

-- CREATE POLICY "certificates_read_admin_team" ON public.certificates 
--     FOR SELECT USING (public.get_user_role() IN ('admin', 'team'));
-- 
-- CREATE POLICY "certificates_read_public_own" ON public.certificates 
--     FOR SELECT USING (created_by = auth.uid());
-- 
-- CREATE POLICY "certificates_insert_admin_team" ON public.certificates 
--     FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'team'));
-- 
-- CREATE POLICY "certificates_update_admin_team" ON public.certificates 
--     FOR UPDATE USING (public.get_user_role() IN ('admin', 'team'));
-- 
-- CREATE POLICY "certificates_delete_admin" ON public.certificates 
--     FOR DELETE USING (public.get_user_role() = 'admin');

-- Test the function
-- SELECT public.get_user_role();


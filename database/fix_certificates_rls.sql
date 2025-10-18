-- Fix RLS policies for certificates table
-- This file fixes the RLS policies to match the actual certificates table structure

-- Drop existing policies that reference non-existent columns
DROP POLICY IF EXISTS "certs_read_admin_team" ON public.certificates;
DROP POLICY IF EXISTS "certs_read_public_own" ON public.certificates;
DROP POLICY IF EXISTS "certs_write_admin_team" ON public.certificates;
DROP POLICY IF EXISTS "certs_update_admin_team" ON public.certificates;
DROP POLICY IF EXISTS "certs_delete_admin" ON public.certificates;

-- Drop the old policies from create_certificates_table.sql
DROP POLICY IF EXISTS "Allow authenticated users to read certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to update certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated users to delete certificates" ON public.certificates;

-- Create new policies that work with the actual certificates table structure
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
--     FOR SELECT USING (public.auth_role() IN ('admin', 'team'));
-- 
-- CREATE POLICY "certificates_read_public_own" ON public.certificates 
--     FOR SELECT USING (created_by = public.auth_uid());
-- 
-- CREATE POLICY "certificates_insert_admin_team" ON public.certificates 
--     FOR INSERT WITH CHECK (public.auth_role() IN ('admin', 'team'));
-- 
-- CREATE POLICY "certificates_update_admin_team" ON public.certificates 
--     FOR UPDATE USING (public.auth_role() IN ('admin', 'team'));
-- 
-- CREATE POLICY "certificates_delete_admin" ON public.certificates 
--     FOR DELETE USING (public.auth_role() = 'admin');


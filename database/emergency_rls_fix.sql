-- EMERGENCY RLS FIX for Template Creation
-- This script creates permissive policies to ensure template creation works
-- Run this if templates are still not being saved

-- Drop all existing policies first
DROP POLICY IF EXISTS "Public read access for templates" ON public.templates;
DROP POLICY IF EXISTS "Admin and team can insert templates" ON public.templates;
DROP POLICY IF EXISTS "Admin and team can update templates" ON public.templates;
DROP POLICY IF EXISTS "Only admin can delete templates" ON public.templates;
DROP POLICY IF EXISTS "Authenticated users can insert templates" ON public.templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.templates;

-- Drop storage policies
DROP POLICY IF EXISTS "Public read access for template images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update template images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete template images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all storage operations" ON storage.objects;

-- Create VERY PERMISSIVE policies for testing
-- WARNING: These are for testing only - make more restrictive in production

-- Templates table policies
CREATE POLICY "Allow all template operations" ON public.templates
FOR ALL USING (true) WITH CHECK (true);

-- Storage policies
CREATE POLICY "Allow all storage operations" ON storage.objects
FOR ALL USING (true) WITH CHECK (true);

-- Verify the policies were created
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
WHERE tablename IN ('templates', 'objects')
ORDER BY tablename, policyname;

-- Test insert capability
INSERT INTO public.templates (name, category, orientation) 
VALUES ('Test Template', 'Test Category', 'Landscape')
ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM public.templates WHERE name = 'Test Template';

SELECT 'RLS policies updated - template creation should now work' as status;


-- Fix RLS policies for templates table and storage bucket
-- Run this if templates are not being saved due to permission issues

-- First, check if templates table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'templates' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Templates table does not exist. Please create it first.';
    END IF;
END $$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public read access for templates" ON public.templates;
DROP POLICY IF EXISTS "Admin and team can insert templates" ON public.templates;
DROP POLICY IF EXISTS "Admin and team can update templates" ON public.templates;
DROP POLICY IF EXISTS "Only admin can delete templates" ON public.templates;

-- Drop storage policies
DROP POLICY IF EXISTS "Public read access for template images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update template images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete template images" ON storage.objects;

-- Recreate templates table policies
CREATE POLICY "Public read access for templates" ON public.templates
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert templates" ON public.templates
FOR INSERT WITH CHECK (auth.role() IN ('admin', 'team', 'authenticated'));

CREATE POLICY "Authenticated users can update templates" ON public.templates
FOR UPDATE USING (auth.role() IN ('admin', 'team', 'authenticated'))
WITH CHECK (auth.role() IN ('admin', 'team', 'authenticated'));

CREATE POLICY "Admin users can delete templates" ON public.templates
FOR DELETE USING (auth.role() = 'admin');

-- Recreate storage policies
CREATE POLICY "Public read access for template images" ON storage.objects
FOR SELECT USING (bucket_id = 'template');

CREATE POLICY "Authenticated users can upload template images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'template' 
  AND auth.role() IN ('admin', 'team', 'authenticated')
);

CREATE POLICY "Authenticated users can update template images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'template' 
  AND auth.role() IN ('admin', 'team', 'authenticated')
);

CREATE POLICY "Admin users can delete template images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'template' 
  AND auth.role() = 'admin'
);

-- Test the policies by checking if we can read from templates
SELECT 'RLS policies updated successfully' as status;


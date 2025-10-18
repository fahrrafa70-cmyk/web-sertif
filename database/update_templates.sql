-- Update templates table to support image_url and category as text
-- This script modifies the existing templates table structure

-- Add image_url column to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add category column to templates table (as text instead of foreign key)
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS category text;

-- Update existing templates with category names
UPDATE public.templates 
SET category = c.name 
FROM public.categories c 
WHERE templates.category_id = c.id;

-- Make category column not null after populating it
ALTER TABLE public.templates 
ALTER COLUMN category SET NOT NULL;

-- Drop the foreign key constraint and category_id column
ALTER TABLE public.templates 
DROP CONSTRAINT IF EXISTS templates_category_id_fkey;

ALTER TABLE public.templates 
DROP COLUMN IF EXISTS category_id;

-- Drop the categories table as it's no longer needed
DROP TABLE IF EXISTS public.categories CASCADE;

-- Update RLS policies to remove category_id references
DROP POLICY IF EXISTS templates_read ON public.templates;
DROP POLICY IF EXISTS templates_insert_update ON public.templates;
DROP POLICY IF EXISTS templates_update ON public.templates;
DROP POLICY IF EXISTS templates_delete_admin ON public.templates;

-- Recreate templates policies
CREATE POLICY templates_read ON public.templates FOR SELECT USING (true);
CREATE POLICY templates_insert_update ON public.templates FOR INSERT WITH CHECK (public.auth_role() IN ('admin','team'));
CREATE POLICY templates_update ON public.templates FOR UPDATE USING (public.auth_role() IN ('admin','team')) WITH CHECK (public.auth_role() IN ('admin','team'));
CREATE POLICY templates_delete_admin ON public.templates FOR DELETE USING (public.auth_role() = 'admin');

-- Update the template_fields table to remove category_id references
DROP INDEX IF EXISTS templates_category_idx;
DROP INDEX IF EXISTS templates_created_by_idx;

-- Recreate the index for created_by
CREATE INDEX IF NOT EXISTS templates_created_by_idx ON public.templates(created_by);


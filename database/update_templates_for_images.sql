-- Update templates table to support image storage
-- Add image_path field and update category handling

-- Add image_path column to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS image_path text;

-- Add category column directly to templates (simplified approach)
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS category text;

-- Update existing templates to have a default category if null
UPDATE public.templates 
SET category = 'General' 
WHERE category IS NULL;

-- Make category NOT NULL after setting defaults
ALTER TABLE public.templates 
ALTER COLUMN category SET NOT NULL;

-- Create index for image_path for faster queries
CREATE INDEX IF NOT EXISTS templates_image_path_idx ON public.templates(image_path);

-- Create index for category for faster filtering
CREATE INDEX IF NOT EXISTS templates_category_text_idx ON public.templates(category);

-- Optional: Remove the old category_id foreign key if it exists and is not being used
-- ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_category_id_fkey;
-- ALTER TABLE public.templates DROP COLUMN IF EXISTS category_id;

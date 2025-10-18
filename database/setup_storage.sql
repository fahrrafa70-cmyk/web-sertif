-- Setup Supabase Storage bucket for template images
-- This script creates the template bucket and sets up public access

-- Create the template bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template',
  'template',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the template bucket
CREATE POLICY "Public read access for template images" ON storage.objects
FOR SELECT USING (bucket_id = 'template');

CREATE POLICY "Authenticated users can upload template images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'template' 
  AND auth.role() IN ('admin', 'team')
);

CREATE POLICY "Authenticated users can update template images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'template' 
  AND auth.role() IN ('admin', 'team')
);

CREATE POLICY "Admin users can delete template images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'template' 
  AND auth.role() = 'admin'
);


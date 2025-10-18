-- Create templates table for E-Certificate Management Platform
-- This script creates the templates table with all required columns

-- Create the templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  orientation text NOT NULL CHECK (orientation IN ('Landscape', 'Portrait')),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS templates_category_idx ON public.templates(category);
CREATE INDEX IF NOT EXISTS templates_created_at_idx ON public.templates(created_at);

-- Enable Row Level Security
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access for templates" ON public.templates
FOR SELECT USING (true);

CREATE POLICY "Admin and team can insert templates" ON public.templates
FOR INSERT WITH CHECK (
  auth.role() IN ('admin', 'team')
);

CREATE POLICY "Admin and team can update templates" ON public.templates
FOR UPDATE USING (
  auth.role() IN ('admin', 'team')
) WITH CHECK (
  auth.role() IN ('admin', 'team')
);

CREATE POLICY "Only admin can delete templates" ON public.templates
FOR DELETE USING (
  auth.role() = 'admin'
);

-- Insert some sample templates (optional)
INSERT INTO public.templates (name, category, orientation) VALUES
  ('General Training', 'Training', 'Landscape'),
  ('Internship Certificate', 'Internship', 'Portrait'),
  ('MoU Certificate', 'MoU', 'Landscape'),
  ('Industrial Visit', 'Visit', 'Landscape')
ON CONFLICT DO NOTHING;


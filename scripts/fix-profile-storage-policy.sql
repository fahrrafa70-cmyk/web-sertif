-- Fix Profile Storage Bucket RLS Policies
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own profile pictures" ON storage.objects;

-- Create simple policies for profile bucket

-- 1. Allow authenticated users to INSERT (upload) to profile bucket
CREATE POLICY "Authenticated users can upload to profile bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile');

-- 2. Allow public SELECT (read) from profile bucket
CREATE POLICY "Public can read from profile bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile');

-- 3. Allow authenticated users to UPDATE their files in profile bucket
CREATE POLICY "Authenticated users can update profile bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile')
WITH CHECK (bucket_id = 'profile');

-- 4. Allow authenticated users to DELETE from profile bucket
CREATE POLICY "Authenticated users can delete from profile bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile');

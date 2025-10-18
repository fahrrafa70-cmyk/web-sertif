# 🔧 Debug Template Creation Issue

## Problem
Data appears in console but doesn't save to Supabase (templates table or storage bucket).

## 🚀 Quick Fix Steps

### 1. **Check Environment Variables**
Make sure your `.env.local` file has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. **Run RLS Policy Fix**
Execute this SQL in your Supabase SQL Editor:
```sql
-- Run: database/fix_rls_policies.sql
```

### 3. **Check Console Logs**
Open browser DevTools → Console and look for:
- ✅ "Supabase connection successful"
- ✅ "Starting template creation process..."
- ✅ "Image upload completed, URL: ..."
- ✅ "Template created successfully: ..."

### 4. **Common Issues & Solutions**

#### Issue 1: RLS Policy Blocking
**Symptoms:** Console shows "Failed to create template: new row violates row-level security policy"
**Solution:** Run the RLS policy fix SQL script

#### Issue 2: Storage Bucket Not Found
**Symptoms:** Console shows "Failed to upload image: Bucket not found"
**Solution:** 
1. Go to Supabase Dashboard → Storage
2. Create bucket named `template`
3. Set to Public
4. Run storage setup SQL

#### Issue 3: Authentication Issues
**Symptoms:** Console shows "Auth error" or "Current user: null"
**Solution:** 
1. Check if user is logged in
2. Verify RLS policies allow authenticated users
3. Check if user has proper role

#### Issue 4: Environment Variables Missing
**Symptoms:** Console shows "Supabase env not set"
**Solution:** 
1. Create `.env.local` file in project root
2. Add your Supabase credentials
3. Restart development server

## 🔍 Debug Checklist

### ✅ Database Setup
- [ ] Templates table exists
- [ ] RLS policies are correct
- [ ] User has proper permissions

### ✅ Storage Setup
- [ ] `template` bucket exists
- [ ] Bucket is public
- [ ] RLS policies allow uploads

### ✅ Code Issues
- [ ] Environment variables set
- [ ] Supabase client initialized
- [ ] Error handling in place
- [ ] Console logs show progress

### ✅ User Authentication
- [ ] User is logged in
- [ ] User has correct role
- [ ] RLS policies allow user actions

## 🧪 Test Steps

1. **Open browser DevTools → Console**
2. **Try to create a template**
3. **Check console for these logs:**
   ```
   Supabase connection successful
   Starting template creation process...
   Template data prepared: {...}
   Starting image upload...
   Upload successful: {...}
   Image upload completed, URL: ...
   Inserting template data: {...}
   Template created successfully: {...}
   ```

4. **If any step fails, check the error message**

## 🚨 Emergency Fix

If nothing works, run this complete setup:

```sql
-- 1. Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  orientation text NOT NULL CHECK (orientation IN ('Landscape', 'Portrait')),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies (for testing)
CREATE POLICY "Allow all operations" ON public.templates
FOR ALL USING (true) WITH CHECK (true);

-- 4. Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('template', 'template', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create storage policies
CREATE POLICY "Allow all storage operations" ON storage.objects
FOR ALL USING (true) WITH CHECK (true);
```

## 📞 Still Having Issues?

Check these in order:
1. **Console logs** - Look for specific error messages
2. **Network tab** - Check if requests are being made
3. **Supabase Dashboard** - Check if data appears in tables
4. **Storage** - Check if files appear in bucket

The enhanced logging will show exactly where the process fails!


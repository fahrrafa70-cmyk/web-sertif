# 🔧 FINAL DEBUG GUIDE - Template Creation Fix

## 🚨 Problem
Data appears in console but doesn't save to Supabase (templates table or storage bucket).

## 🚀 IMMEDIATE FIX STEPS

### 1. **Run Emergency RLS Fix**
Execute this SQL in your Supabase SQL Editor:
```sql
-- Run: database/emergency_rls_fix.sql
```

### 2. **Check Environment Variables**
Ensure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. **Test the Fix**
1. Open browser DevTools → Console
2. Try to create a template
3. Look for these SUCCESS logs:
   ```
   🚀 Starting template creation process...
   👤 Current user: {...}
   📤 Image file provided, starting upload...
   📁 Uploading to path: templates/...
   ✅ Upload successful: {...}
   🔗 Public URL generated: ...
   ✅ Image upload completed, URL: ...
   💾 Inserting template data to database: {...}
   ✅ Template created successfully in database: {...}
   🔍 Verifying template was saved by fetching it...
   ✅ Template verification successful: {...}
   🎉 Template creation process completed successfully!
   ```

## 🔍 DEBUG CHECKLIST

### ✅ Database Issues
- [ ] Templates table exists
- [ ] RLS policies are permissive (run emergency fix)
- [ ] User has insert permissions

### ✅ Storage Issues  
- [ ] `template` bucket exists
- [ ] Bucket is public
- [ ] RLS policies allow uploads

### ✅ Code Issues
- [ ] Environment variables set correctly
- [ ] Supabase client initialized
- [ ] All functions use proper async/await
- [ ] Error handling in place

## 🧪 STEP-BY-STEP TEST

1. **Open Browser DevTools → Console**
2. **Navigate to Templates page**
3. **Click "Create Template"**
4. **Fill in the form:**
   - Name: "Test Template"
   - Category: "Test Category"  
   - Orientation: "Landscape"
   - Upload an image (JPG/PNG)
5. **Click "Create Template"**
6. **Watch console for logs**

## 🚨 COMMON ERROR MESSAGES & FIXES

### "Failed to upload image: Bucket not found"
**Fix:** Create bucket in Supabase Dashboard → Storage → Create bucket named `template`

### "Failed to create template: new row violates row-level security policy"
**Fix:** Run the emergency RLS fix SQL script

### "Auth error" or "Current user: null"
**Fix:** Check if user is logged in and has proper role

### "Invalid file type"
**Fix:** Only upload JPG or PNG files

### "Template was not created - no data returned from database"
**Fix:** Check RLS policies and database permissions

## 🎯 EXPECTED CONSOLE OUTPUT

**SUCCESS FLOW:**
```
✅ Supabase connection test passed
🚀 Starting template creation process...
👤 Current user: {id: "...", email: "..."}
📤 Image file provided, starting upload...
📁 Uploading to path: templates/1234567890-abc123.jpg
✅ Upload successful: {path: "templates/1234567890-abc123.jpg"}
🔗 Public URL generated: https://your-project.supabase.co/storage/v1/object/public/template/templates/1234567890-abc123.jpg
✅ Image upload completed, URL: https://your-project.supabase.co/storage/v1/object/public/template/templates/1234567890-abc123.jpg
💾 Inserting template data to database: {name: "Test Template", category: "Test Category", orientation: "Landscape", image_url: "https://..."}
✅ Template created successfully in database: {id: "uuid", name: "Test Template", ...}
🔍 Verifying template was saved by fetching it...
✅ Template verification successful: {id: "uuid", name: "Test Template", ...}
🎉 Template creation process completed successfully!
```

## 🔧 EMERGENCY TROUBLESHOOTING

If nothing works, run this complete reset:

```sql
-- 1. Drop and recreate templates table
DROP TABLE IF EXISTS public.templates CASCADE;

CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  orientation text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Disable RLS temporarily
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

-- 3. Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('template', 'template', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Disable storage RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

## 📞 STILL NOT WORKING?

Check these in order:
1. **Console logs** - Look for specific error messages
2. **Network tab** - Check if requests are being made to Supabase
3. **Supabase Dashboard** - Check if data appears in tables
4. **Storage** - Check if files appear in bucket

The enhanced logging will show exactly where the process fails!


# 🔧 FIX: RLS (Row Level Security) Error

## Error Yang Terjadi
```
Error: 'Failed to create template', 
details: 'new row violates row-level security policy for table "templates"'
```

## Penyebab
API tidak punya permission untuk insert ke table `templates` karena RLS policy.

## SOLUSI 1: Tambahkan Service Role Key (RECOMMENDED)

### Step 1: Get Service Role Key dari Supabase
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Pergi ke **Settings** → **API**
4. Copy **service_role key** (bukan anon key!)
   - ⚠️ JANGAN share key ini ke public!
   - ⚠️ Key ini bypass semua RLS policies

### Step 2: Tambahkan ke .env.local
Buka file `.env.local` di root project dan tambahkan:

```bash
# Existing keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# ADD THIS LINE (NEW)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Restart Development Server
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### Step 4: Test Create Template
Coba create template lagi dengan mode "Certificate + Score"

---

## SOLUSI 2: Update RLS Policy (Alternative)

Jika tidak ingin menggunakan service role key, update RLS policy:

### Step 1: Buka Supabase SQL Editor
Pergi ke Supabase Dashboard → SQL Editor

### Step 2: Run SQL Berikut
```sql
-- Allow INSERT for authenticated users
CREATE POLICY "Allow authenticated users to insert templates"
ON templates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow UPDATE for authenticated users
CREATE POLICY "Allow authenticated users to update templates"
ON templates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow DELETE for authenticated users
CREATE POLICY "Allow authenticated users to delete templates"
ON templates
FOR DELETE
TO authenticated
USING (true);

-- Allow SELECT for everyone (already exists probably)
CREATE POLICY "Allow public to read templates"
ON templates
FOR SELECT
TO public
USING (true);
```

### Step 3: Verify Policies
```sql
-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'templates';
```

---

## SOLUSI 3: Disable RLS (NOT RECOMMENDED for Production)

⚠️ **HANYA untuk development/testing!**

```sql
-- Disable RLS on templates table
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
```

⚠️ **WARNING**: Ini membuat table bisa diakses siapa saja tanpa authentication!

---

## Verification

Setelah apply salah satu solusi, test dengan:

1. **Refresh halaman** (F5)
2. **Buka console** (F12)
3. **Create template** dengan mode "Certificate + Score"
4. **Lihat console log**

Expected result:
```
✅ All validations passed
📋 Template data prepared: {...}
🔄 Calling create function...
💾 API: Inserting template data to database: {...}
✅ API: Template created successfully
✅ Template creation result: {...}
```

---

## Recommended Approach

**Untuk Development:**
- ✅ Gunakan SOLUSI 1 (Service Role Key)
- Mudah dan aman untuk development

**Untuk Production:**
- ✅ Gunakan SOLUSI 2 (RLS Policies)
- Lebih secure dengan proper authentication

---

## Next Steps After Fix

Setelah RLS error fixed, jangan lupa:

1. ✅ **Run SQL migration** untuk add kolom `mode` dan `score_image_path`:
   ```sql
   ALTER TABLE templates 
   ADD COLUMN IF NOT EXISTS mode VARCHAR(10) DEFAULT 'single' 
   CHECK (mode IN ('single', 'dual'));
   
   ALTER TABLE templates 
   ADD COLUMN IF NOT EXISTS score_image_path TEXT;
   ```

2. ✅ **Test single mode** (Certificate Only)
3. ✅ **Test dual mode** (Certificate + Score)
4. ✅ **Verify data** di Supabase table editor

---

## Troubleshooting

### Jika masih error setelah add service role key:
1. Pastikan key sudah benar (copy paste full key)
2. Pastikan tidak ada typo di variable name
3. Restart dev server (stop & start lagi)
4. Clear browser cache (Ctrl+Shift+Delete)

### Jika error "column mode does not exist":
1. Run SQL migration untuk add kolom baru
2. Verify dengan query:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'templates';
   ```

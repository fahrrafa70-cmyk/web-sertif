# 🔍 DEBUG: Template Creation Error

## Langkah-langkah Debugging

### 1. Buka Browser Console
- Tekan `F12` atau `Ctrl+Shift+I`
- Pilih tab **Console**
- Clear console (icon 🚫 atau Ctrl+L)

### 2. Coba Create Template Lagi
- Pilih mode "Certificate + Score"
- Upload semua gambar yang diperlukan
- Klik "Create Template"

### 3. Lihat Error di Console
Cari log dengan emoji berikut:
- 🚀 Starting template creation
- 📋 Template data prepared
- 📤 Image upload logs
- 💾 API inserting data
- ❌ Error messages (PENTING!)
- 💥 Template creation failed

### 4. Copy Error Message
**Screenshot atau copy semua error yang muncul di console**

## Kemungkinan Penyebab Error

### A. Database Columns Belum Ada ❌
**Gejala:**
```
Error: column "mode" does not exist
Error: column "score_image_path" does not exist
```

**Solusi:**
1. Buka Supabase Dashboard
2. Pergi ke SQL Editor
3. Run SQL berikut:

```sql
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS mode VARCHAR(10) DEFAULT 'single' CHECK (mode IN ('single', 'dual'));

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS score_image_path TEXT;
```

### B. RLS (Row Level Security) Policy ❌
**Gejala:**
```
Error: new row violates row-level security policy
Error: permission denied for table templates
```

**Solusi:**
1. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env.local`
2. Atau update RLS policy di Supabase

### C. File Upload Error ❌
**Gejala:**
```
Error: Image upload failed
Error: Failed to upload score image
```

**Solusi:**
1. Check file size (max 10MB)
2. Check file type (hanya .jpg, .jpeg, .png)
3. Check folder permissions di `/public/template/`

### D. Network Error ❌
**Gejala:**
```
Error: Failed to fetch
Error: Network request failed
```

**Solusi:**
1. Check internet connection
2. Check Supabase URL di `.env.local`
3. Restart development server

## Quick Checks

### ✅ Check 1: SQL Migration
```sql
-- Run this in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'templates' 
AND column_name IN ('mode', 'score_image_path');
```

**Expected Result:**
```
mode            | character varying
score_image_path| text
```

### ✅ Check 2: Environment Variables
Check `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (optional but recommended)
```

### ✅ Check 3: File Permissions
```bash
# Check if public/template folder exists and is writable
ls -la public/template/
```

## Temporary Workaround

Jika masih error, coba **Single Mode** dulu:
1. Pilih "Certificate Only" (bukan Certificate + Score)
2. Upload hanya 1 template image
3. Upload thumbnail
4. Create template

Jika single mode berhasil → masalahnya di dual mode logic
Jika single mode juga error → masalahnya di basic setup

## Report Error

Setelah dapat error message dari console, share:
1. Screenshot console error
2. Screenshot network tab (jika ada failed request)
3. Apakah SQL migration sudah dijalankan?
4. Apakah single mode berhasil?

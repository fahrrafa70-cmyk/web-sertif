# 🔧 Configure Page - Fixes & Enhancements

## ❌ MASALAH: Save Configuration Tidak Tersimpan

### Kemungkinan Penyebab:

1. **Migration Belum Dijalankan** ⚠️
   - Kolom `layout_config` belum ada di database
   - Solusi: Run migration di Supabase Dashboard

2. **RLS Policy Blocking** 🔒
   - Row Level Security mencegah update
   - Solusi: Tambahkan policy untuk templates table

3. **Supabase Connection Issue** 🌐
   - Client tidak terkoneksi dengan benar
   - Solusi: Check environment variables

---

## ✅ LANGKAH TROUBLESHOOTING

### Step 1: Verify Migration

Buka **Supabase Dashboard** → **SQL Editor** → Run query ini:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'templates' 
AND column_name IN ('layout_config', 'is_layout_configured', 'layout_config_updated_at');
```

**Expected Result:** Harus return 3 rows

Jika **TIDAK ADA HASIL**, run migration:

```sql
-- Copy-paste SEMUA isi file: migrations/005_add_layout_config_to_templates.sql
-- Lalu run di SQL Editor
```

---

### Step 2: Check RLS Policies

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'templates';
```

Jika tidak ada policy untuk UPDATE, tambahkan:

```sql
-- Allow authenticated users to update templates
CREATE POLICY "Allow authenticated users to update templates"
ON templates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

---

### Step 3: Test Save Manually

Buka **Browser Console** (F12) → **Console tab**

Saat click "Save Layout", perhatikan log:
- ✅ `💾 Starting save process...`
- ✅ `📦 Layout config to save: {...}`
- ✅ `✅ Save successful!`

Jika ada **ERROR**, copy error message dan check:
1. Error message dari Supabase
2. Network tab untuk melihat request/response
3. Console log untuk detail error

---

### Step 4: Verify Data Saved

```sql
-- Check if layout_config is saved
SELECT 
  id, 
  name, 
  is_layout_configured,
  layout_config IS NOT NULL as has_layout,
  layout_config_updated_at
FROM templates
WHERE id = 'YOUR_TEMPLATE_ID';
```

Replace `YOUR_TEMPLATE_ID` dengan ID template yang Anda configure.

---

## 🎯 ENHANCEMENT YANG SUDAH DITAMBAHKAN

### 1. ✅ Text Align Dropdown
- Tambah property `textAlign` di TextLayerConfig
- Dropdown untuk pilih: left, center, right, justify
- Auto-apply ke text layer

### 2. ✅ Rename Layer (Double Click)
- Double-click nama layer untuk rename
- Validation: tidak boleh duplicate ID
- Toast notification saat berhasil

### 3. ✅ Fixed Header
- Header fixed di top (tidak scroll)
- Main content ada margin-top
- Z-index tinggi untuk selalu di atas

### 4. ✅ Better Save Error Handling
- Console log detail untuk debugging
- Error message yang jelas
- Validation sebelum save

---

## 📋 CHECKLIST SEBELUM TEST

- [ ] Migration sudah dijalankan di Supabase
- [ ] RLS policy sudah ditambahkan
- [ ] Environment variables sudah benar
- [ ] Browser console terbuka untuk monitoring
- [ ] Template sudah ada di database

---

## 🚨 JIKA MASIH TIDAK BISA SAVE

1. **Check Browser Console** - Ada error apa?
2. **Check Network Tab** - Request berhasil atau failed?
3. **Check Supabase Logs** - Ada error di server?
4. **Screenshot Error** - Share untuk debugging

---

## 📞 NEXT STEPS

Setelah migration dijalankan dan RLS policy ditambahkan:

1. Refresh page Configure
2. Atur layout text layers
3. Click "Save Layout"
4. Check console log
5. Verify di database

Jika berhasil, badge di Templates page akan berubah dari "⚠ Not Configured" → "✓ Ready"

# Setup Supabase Storage untuk Penyimpanan Hasil Generate

## 📋 Langkah-langkah Manual

### 1. Buat Storage Bucket di Supabase Dashboard

1. Buka **Supabase Dashboard** → pilih project Anda
2. Masuk ke menu **Storage** (sidebar kiri)
3. Klik **"New bucket"** atau **"Create bucket"**
4. Isi form:
   - **Name:** `certificates` (harus sesuai ini)
   - **Public bucket:** ✅ **Enable** (centang ini agar file bisa diakses publik)
   - **File size limit:** Sesuaikan (misal: 10 MB)
   - **Allowed MIME types:** `image/png,image/jpeg,image/jpg` (opsional, untuk keamanan)
5. Klik **"Create bucket"**

### 2. Setup Storage Policies (RLS)

Setelah bucket dibuat, pastikan policy untuk akses publik:

1. Di halaman bucket `certificates`, buka tab **"Policies"**
2. Klik **"New policy"** atau edit policy yang ada
3. Buat policy untuk **SELECT** (read access):
   - Policy name: `Public read access`
   - Allowed operation: `SELECT`
   - Policy definition:
     ```sql
     true
     ```
   - Target roles: `anon`, `authenticated`
4. Klik **"Save policy"**

**Atau menggunakan SQL Editor:**

```sql
-- Allow public read access
CREATE POLICY "Public read access for certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');
```

### 3. Verifikasi Environment Variables

Pastikan file `.env.local` berisi:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Opsional, untuk akses admin
```

**Note:** 
- `SUPABASE_SERVICE_ROLE_KEY` tidak wajib, tapi disarankan untuk bypass RLS jika diperlukan
- Bisa ditemukan di: **Project Settings** → **API** → **Service Role Key** (jangan expose ke client!)

### 4. Test Upload

Setelah setup, test dengan:

1. Generate certificate baru
2. Check console browser untuk log:
   - `📤 Attempting to upload to Supabase Storage...`
   - `✅ Successfully uploaded to Supabase Storage: https://...`
3. Check di Supabase Dashboard → Storage → certificates → files
4. Verify URL di database: `certificate_image_url` harus berisi URL Supabase Storage

---

## 🔧 Cara Kerja

### Alur Upload

1. **Generate Certificate** → Canvas di-convert ke Base64 Data URL
2. **Try Supabase Storage First:**
   - Panggil `/api/upload-to-storage`
   - Upload Base64 ke bucket `certificates`
   - Dapatkan public URL
3. **If Storage Fails:**
   - Fallback ke local storage (`public/generate/`)
   - Atau tetap menggunakan Data URL di database

### Prioritas Penyimpanan

```
1. Supabase Storage (prioritas tertinggi)
   ↓ (jika gagal)
2. Local Storage (public/generate/)
   ↓ (jika gagal)
3. Data URL di Database (fallback terakhir)
```

---

## 📁 File yang Telah Dibuat/Dimodifikasi

1. **`src/lib/supabase/storage.ts`** - Helper functions untuk upload ke storage
2. **`src/app/api/upload-to-storage/route.ts`** - API endpoint untuk upload
3. **`src/app/templates/generate/page.tsx`** - Modified `saveGeneratedPNG()` dan `saveGeneratedScorePNG()`

---

## ⚠️ Troubleshooting

### Error: "Bucket not found"

**Solusi:**
- Pastikan bucket `certificates` sudah dibuat di Supabase Dashboard
- Nama bucket harus persis `certificates` (case-sensitive)

### Error: "Permission denied" atau "403 Forbidden"

**Solusi:**
- Pastikan bucket dibuat sebagai **Public bucket**
- Check Storage Policies (RLS) sudah di-set dengan benar
- Pastikan policy untuk SELECT sudah ada untuk `anon` dan `authenticated`

### Error: "Invalid API key"

**Solusi:**
- Check `.env.local` sudah berisi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart development server setelah update `.env.local`

### Upload selalu fallback ke local storage

**Kemungkinan:**
- Bucket belum dibuat
- API key tidak valid
- RLS policy belum di-set
- Check console browser untuk error detail

---

## ✅ Verifikasi Berhasil

Setelah setup, verify:

1. **Generate certificate baru**
2. **Check database:**
   ```sql
   SELECT certificate_no, certificate_image_url 
   FROM certificates 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   URL harus seperti: `https://xxx.supabase.co/storage/v1/object/public/certificates/CERT-000001.png`

3. **Check Supabase Storage:**
   - Dashboard → Storage → certificates
   - File PNG harus ada di sana

4. **Check console browser:**
   - Harus ada log: `✅ Successfully uploaded to Supabase Storage`

---

## 🎯 Keuntungan Menggunakan Supabase Storage

✅ Database lebih ringan (hanya menyimpan URL string)
✅ Performa query lebih cepat
✅ CDN built-in dari Supabase
✅ Skalabel untuk banyak file
✅ Manajemen file lebih mudah
✅ Tidak perlu cleanup manual (jika setup lifecycle policy)

---

**Setup selesai!** 🎉

Sekarang hasil generate akan otomatis disimpan ke Supabase Storage jika bucket sudah dibuat. Jika gagal, akan fallback ke local storage atau Data URL.


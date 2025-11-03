# Migrasi Data URL ke Supabase Storage

## 📋 Deskripsi

Script ini digunakan untuk memigrasikan certificate images yang terlanjur disimpan sebagai **Data URL** (Base64) di database ke **Supabase Storage**.

---

## 🚀 Cara Menggunakan

### ⚡ **CARA TERMUDAH: Menggunakan Terminal (Recommended)**

Script bisa dijalankan langsung di terminal dengan Node.js:

#### Install Dependencies (jika belum ada)
```bash
npm install dotenv
```

#### 1. Dry Run (Test Tanpa Menyimpan)
```bash
npm run migrate:storage:dry
# atau
node scripts/migrate-to-storage.js --dry-run
```

#### 2. Migrate dengan Limit (Default: 10)
```bash
npm run migrate:storage
# atau
node scripts/migrate-to-storage.js --limit 10
```

#### 3. Migrate Semua Certificate
```bash
npm run migrate:storage:all
# atau
node scripts/migrate-to-storage.js --all
```

#### 4. Custom Limit
```bash
node scripts/migrate-to-storage.js --limit 50
```

---

### 🌐 **Alternative: Menggunakan API Endpoint (Browser/Postman)**

Atau bisa juga menggunakan API endpoint via browser console atau Postman:

### 1. Pastikan Supabase Storage Sudah Setup

Pastikan:
- ✅ Bucket `certificates` sudah dibuat di Supabase Dashboard
- ✅ Bucket sudah di-set sebagai **Public bucket**
- ✅ Storage Policies sudah di-set dengan benar
- ✅ Environment variables sudah di-set (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

**Lihat:** `SETUP_SUPABASE_STORAGE.md` untuk detail setup.

### 2. Dry Run (Test Tanpa Menyimpan)

Sebelum migrasi sesungguhnya, lakukan **dry run** untuk melihat apa yang akan terjadi:

```bash
# Menggunakan curl
curl -X POST http://localhost:3000/api/migrate-to-storage \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "limit": 5}'
```

**Atau menggunakan JavaScript/TypeScript:**

```typescript
// Test script
const response = await fetch('/api/migrate-to-storage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dryRun: true,  // Test mode, tidak akan menyimpan
    limit: 5       // Hanya process 5 certificate pertama
  })
});

const result = await response.json();
console.log(result);
```

**Response akan menunjukkan:**
- Certificate mana yang akan di-migrate
- File name yang akan dibuat
- Tidak akan ada perubahan di database atau storage

### 3. Migrasi Sesungguhnya

Setelah dry run berhasil, lakukan migrasi sesungguhnya:

#### Option A: Migrate Semua (Limit Default: 10)

```bash
curl -X POST http://localhost:3000/api/migrate-to-storage \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

#### Option B: Migrate dengan Limit Kustom

```bash
curl -X POST http://localhost:3000/api/migrate-to-storage \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "limit": 50}'
```

#### Option C: Menggunakan Browser Console

```javascript
// Buka browser console di halaman aplikasi
fetch('/api/migrate-to-storage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dryRun: false,
    limit: 10  // Process 10 certificate sekaligus
  })
})
.then(res => res.json())
.then(data => {
  console.log('Migration Result:', data);
  console.log('Migrated:', data.migrated);
  console.log('Failed:', data.failed);
  console.log('Details:', data.results);
});
```

---

## 📊 Response Format

```json
{
  "success": true,
  "message": "Migration completed. 10 images migrated, 0 failed.",
  "dryRun": false,
  "total": 10,
  "migrated": 10,
  "failed": 0,
  "results": [
    {
      "id": "uuid-here",
      "certificate_no": "CERT-000001",
      "certificate_image_url": {
        "before": "data:image/png;base64,iVBORw0KG...",
        "after": "https://xxx.supabase.co/storage/v1/object/public/certificates/CERT-000001.png",
        "status": "success"
      },
      "score_image_url": {
        "before": "data:image/png;base64,iVBORw0KG...",
        "after": "https://xxx.supabase.co/storage/v1/object/public/certificates/CERT-000001_score.png",
        "status": "success"
      }
    }
  ]
}
```

---

## ⚙️ Parameters

| Parameter | Type | Default | Deskripsi |
|-----------|------|---------|-----------|
| `dryRun` | boolean | `false` | Jika `true`, hanya simulate tanpa menyimpan |
| `limit` | number | `10` | Jumlah certificate yang akan di-process sekaligus |

---

## 🔄 Proses Migrasi

1. **Query Database:**
   - Mencari semua certificate yang memiliki Data URL
   - Filter: `certificate_image_url LIKE 'data:image%'` atau `score_image_url LIKE 'data:image%'`

2. **Process Setiap Certificate:**
   - Extract Base64 dari Data URL
   - Convert ke Buffer
   - Upload ke Supabase Storage bucket `certificates`
   - Generate file name: `{certificate_no}.png` atau `{certificate_no}_score.png`

3. **Update Database:**
   - Replace Data URL dengan Storage URL di kolom `certificate_image_url` atau `score_image_url`

4. **Return Results:**
   - Jumlah yang berhasil di-migrate
   - Jumlah yang gagal
   - Detail untuk setiap certificate

---

## ⚠️ Catatan Penting

### 1. Batch Processing
- Default limit adalah **10 certificate per request**
- Jika ada banyak certificate, perlu dijalankan beberapa kali
- Gunakan pagination atau loop untuk process semua

### 2. Idempotent
- Script menggunakan `upsert: true` di storage upload
- Jika file sudah ada, akan di-overwrite
- Aman untuk dijalankan ulang (tidak akan duplikat)

### 3. Error Handling
- Jika upload gagal, database tidak akan di-update
- Certificate yang gagal akan dicatat di response
- Bisa di-retry untuk certificate yang gagal

### 4. Backup (Disarankan)
Sebelum migrasi, backup database:
```sql
-- Backup certificates table
CREATE TABLE certificates_backup AS SELECT * FROM certificates;
```

---

## 🔍 Verifikasi

Setelah migrasi, verifikasi:

### 1. Check Database

```sql
-- Cek apakah masih ada Data URL
SELECT COUNT(*) 
FROM certificates 
WHERE certificate_image_url LIKE 'data:image%' 
   OR score_image_url LIKE 'data:image%';
```

### 2. Check Storage

- Buka Supabase Dashboard → Storage → certificates
- Pastikan file PNG sudah ada di sana
- Nama file harus sesuai: `CERT-000001.png`, `CERT-000001_score.png`, dll

### 3. Check URL Format

```sql
-- Cek URL format di database
SELECT certificate_no, certificate_image_url 
FROM certificates 
LIMIT 5;
```

URL harus berformat: `https://xxx.supabase.co/storage/v1/object/public/certificates/...`

---

## 📝 Contoh Script untuk Migrate Semua

Jika ada banyak certificate dan perlu di-migrate semuanya:

```typescript
async function migrateAllCertificates() {
  let offset = 0;
  const limit = 10;
  let totalMigrated = 0;
  let totalFailed = 0;

  while (true) {
    const response = await fetch('/api/migrate-to-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dryRun: false,
        limit: limit
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Migration error:', result.error);
      break;
    }

    totalMigrated += result.migrated;
    totalFailed += result.failed;

    console.log(`Batch ${offset / limit + 1}: ${result.migrated} migrated, ${result.failed} failed`);

    // Jika tidak ada yang di-process, berarti sudah selesai
    if (result.total === 0) {
      break;
    }

    // Wait a bit before next batch (to avoid rate limiting)
    await new Promise(resolve => setTimeout(resolve, 1000));
    offset += limit;
  }

  console.log(`\n✅ Migration Complete!`);
  console.log(`Total migrated: ${totalMigrated}`);
  console.log(`Total failed: ${totalFailed}`);
}

// Jalankan
migrateAllCertificates();
```

---

## 🐛 Troubleshooting

### Error: "Bucket not found"

**Solusi:**
- Pastikan bucket `certificates` sudah dibuat di Supabase Dashboard
- Nama bucket harus persis `certificates` (case-sensitive)

### Error: "Permission denied"

**Solusi:**
- Check Storage Policies sudah di-set dengan benar
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` sudah di-set di `.env.local`
- Service role key bypass RLS, jadi lebih aman untuk migration

### Migration Gagal untuk Beberapa Certificate

**Solusi:**
- Check error message di response `results`
- Pastikan file name valid (tidak ada karakter khusus)
- Retry untuk certificate yang gagal secara manual

### Database Tidak Terupdate

**Solusi:**
- Check console log untuk error detail
- Pastikan tidak ada RLS policy yang memblokir UPDATE
- Gunakan Service Role Key untuk bypass RLS

---

## ✅ Checklist

Sebelum migrasi:
- [ ] Supabase Storage bucket `certificates` sudah dibuat
- [ ] Storage Policies sudah di-set
- [ ] Environment variables sudah di-set
- [ ] Backup database sudah dilakukan
- [ ] Dry run sudah dilakukan dan berhasil

Setelah migrasi:
- [ ] Verifikasi database tidak ada Data URL lagi
- [ ] Verifikasi file sudah ada di Storage
- [ ] Test load certificate di aplikasi (harus masih bisa diakses)
- [ ] Check ukuran database sudah mengecil (jika banyak certificate)

---

**Migration selesai!** 🎉

Setelah migration, semua certificate images akan tersimpan di Supabase Storage dan database lebih ringan.


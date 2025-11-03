# Lokasi Penyimpanan Hasil Generate

## 📋 Informasi Umum

Dokumen ini menjelaskan di mana hasil generate sertifikat dan score disimpan dalam sistem.

---

## 🗂️ Lokasi Penyimpanan

### 1. **File Fisik (Local Storage)**

#### Lokasi Folder
```
public/generate/
```

#### Detail Teknis
- **Path Absolute:** `{project_root}/public/generate/`
- **Path URL Public:** `/generate/{fileName}`
- **Format File:** PNG (Portable Network Graphics)
- **Format Data:** Base64 → Buffer → File

#### Struktur Penamaan File

**Single Template (Certificate):**
- Format: `{certificate_no}.png`
- Contoh: `CERT-000001.png`, `CERT-000123.png`

**Dual Template:**
- Certificate: `{certificate_no}_certificate.png`
- Score: `{certificate_no}_score.png`
- Contoh: 
  - `CERT-000001_certificate.png`
  - `CERT-000001_score.png`

**Fallback (jika tidak ada certificate_no):**
- Format: `generated_{timestamp}.png`
- Contoh: `generated_1704123456789.png`

#### Proses Penyimpanan
1. Gambar di-generate dari canvas (background + text layers)
2. Dikonversi ke Base64 Data URL
3. Dikirim ke API endpoint via POST request
4. Base64 di-decode menjadi Buffer
5. Buffer ditulis ke file PNG di folder `public/generate/`
6. URL public (`/generate/{fileName}`) dikembalikan

---

### 2. **Database (Supabase)**

#### Tabel: `certificates`

**Lokasi Metadata:** Database Supabase PostgreSQL

**Kolom yang Menyimpan URL:**

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `certificate_image_url` | TEXT | URL gambar sertifikat (prioritas: file local → data URL) |
| `score_image_url` | TEXT | URL gambar score (untuk dual template) |
| `text_layers` | JSONB | Data layer teks yang digunakan untuk generate |
| `certificate_no` | TEXT | Nomor sertifikat (unik) |

**Urutan Prioritas Penyimpanan URL:**

1. **File Local** (prioritas tertinggi)
   - Format: `/generate/{certificate_no}.png`
   - Atau: `/generate/{certificate_no}_certificate.png`
   - Atau: `/generate/{certificate_no}_score.png`

2. **Data URL** (fallback jika save file gagal)
   - Format: `data:image/png;base64,{base64_string}`
   - Disimpan langsung di database jika penyimpanan file gagal

3. **null** (jika tidak ada gambar)

#### Tabel: `scores`

**Untuk Score yang Di-generate Terpisah:**

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `score_image_url` | TEXT | URL gambar score |
| `text_layers` | JSONB | Data layer teks |
| `score_no` | TEXT | Nomor score (unik, format: SC-000001) |
| `score_data` | JSONB | Data tambahan score (nilai, kompetensi, dll) |

---

## 🔄 Alur Penyimpanan

### Single Template (Certificate Only)

```
1. Generate Canvas → Base64 Data URL
2. Save ke Database (dengan data URL)
   ↓
3. Save PNG ke public/generate/{cert_no}.png
   ↓
4. Update Database (ganti data URL dengan file URL)
   Result: /generate/{cert_no}.png
```

### Dual Template (Certificate + Score)

```
1. Generate Certificate Canvas → Base64 Data URL
2. Generate Score Canvas → Base64 Data URL
   ↓
3. Save Certificate PNG → public/generate/{cert_no}_certificate.png
4. Save Score PNG → public/generate/{cert_no}_score.png
   ↓
5. Save ke Database:
   - certificate_image_url: /generate/{cert_no}_certificate.png
   - score_image_url: /generate/{cert_no}_score.png
```

---

## 📁 API Endpoints

### 1. `/api/save-generated-certificate`
**File:** `src/app/api/save-generated-certificate/route.ts`

**Method:** POST

**Request Body:**
```json
{
  "imageData": "data:image/png;base64,iVBORw0KG...",
  "fileName": "CERT-000001.png"
}
```

**Response:**
```json
{
  "success": true,
  "url": "/generate/CERT-000001.png"
}
```

**Fungsi:**
- Menerima Base64 image data
- Mengkonversi ke Buffer
- Menyimpan ke `public/generate/{fileName}`
- Mengembalikan public URL

### 2. `/api/save-generated-score`
**File:** `src/app/api/save-generated-score/route.ts`

**Method:** POST

**Request Body:**
```json
{
  "imageData": "data:image/png;base64,iVBORw0KG...",
  "fileName": "CERT-000001_score.png"
}
```

**Response:**
```json
{
  "success": true,
  "url": "/generate/CERT-000001_score.png"
}
```

**Fungsi:**
- Sama seperti endpoint certificate
- Khusus untuk menyimpan gambar score

---

## 🛠️ Implementasi Kode

### Fungsi Save PNG (Client Side)

**Lokasi:** `src/app/templates/generate/page.tsx`

```typescript
const saveGeneratedPNG = async (
  imageDataUrl: string, 
  certificateNo?: string, 
  suffix?: string
): Promise<string> => {
  // Generate filename
  const baseName = certificateNo 
    ? certificateNo.replace(/[^a-zA-Z0-9-_]/g, '_') 
    : `generated_${Date.now()}`;
  const fileName = suffix 
    ? `${baseName}_${suffix}.png` 
    : `${baseName}.png`;
  
  // Call API
  const response = await fetch('/api/save-generated-certificate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData: imageDataUrl, fileName })
  });
  
  const result = await response.json();
  return result.url; // Returns: /generate/{fileName}
}
```

### Proses Save di API (Server Side)

**Lokasi:** `src/app/api/save-generated-certificate/route.ts`

```typescript
// Extract base64 data
const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
const buffer = Buffer.from(base64Data, 'base64');

// Ensure directory exists
const uploadDir = path.join(process.cwd(), 'public', 'generate');
await mkdir(uploadDir, { recursive: true });

// Save file
const filePath = path.join(uploadDir, fileName);
await writeFile(filePath, buffer);

// Return public URL
return { success: true, url: `/generate/${fileName}` };
```

---

## 📊 Struktur Database

### Tabel `certificates`

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  certificate_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  certificate_image_url TEXT,      -- URL gambar sertifikat
  score_image_url TEXT,             -- URL gambar score (dual template)
  text_layers JSONB,                -- Data layer untuk re-generate
  member_id UUID,
  template_id UUID,
  -- ... kolom lain
);
```

### Tabel `scores`

```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY,
  score_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  score_image_url TEXT,             -- URL gambar score
  text_layers JSONB,                -- Data layer
  score_data JSONB,                 -- Data tambahan
  member_id UUID,
  template_id UUID,
  -- ... kolom lain
);
```

---

## ⚠️ Error Handling & Fallback

### Jika Penyimpanan File Gagal

**Behavior:**
1. Data tetap disimpan ke database dengan **Data URL** (Base64)
2. Warning log: `⚠️ Save PNG to local failed, keeping dataURL.`
3. Aplikasi tetap berfungsi normal (menggunakan data URL)

**Keuntungan Data URL:**
- Tidak perlu file storage
- Langsung bisa ditampilkan di browser
- Tidak ada dependency file system

**Kerugian Data URL:**
- Ukuran database lebih besar
- Tidak bisa diakses langsung via URL (perlu query database)
- Performa lebih lambat untuk gambar besar

---

## 🔍 Cara Akses File

### 1. Via URL Public (Jika Save File Berhasil)

```
https://yourdomain.com/generate/CERT-000001.png
https://yourdomain.com/generate/CERT-000001_certificate.png
https://yourdomain.com/generate/CERT-000001_score.png
```

### 2. Via Database Query (Jika Menggunakan Data URL)

```typescript
const certificate = await getCertificate(id);
const imageUrl = certificate.certificate_image_url;
// imageUrl bisa berupa:
// - "/generate/CERT-000001.png" (file)
// - "data:image/png;base64,..." (data URL)
```

---

## 📝 Maintenance

### Cleanup File Lama

**Lokasi:** `public/generate/`

**Catatan:**
- File PNG **tidak dihapus otomatis**
- File menumpuk seiring waktu
- Perlu cleanup manual jika diperlukan

**Rekomendasi:**
- Setup cron job untuk menghapus file > 1 tahun
- Atau setup cleanup saat delete certificate dari database
- Backup file penting sebelum cleanup

### Backup

**Yang Perlu Di-backup:**
1. **Database:** Metadata dan Data URL (jika ada)
2. **File Folder:** `public/generate/` (jika menggunakan file storage)

---

## 🎯 Ringkasan

| Aspek | Detail |
|-------|--------|
| **Lokasi File** | `public/generate/` |
| **Format File** | PNG |
| **URL Public** | `/generate/{fileName}` |
| **Database** | Supabase (tabel `certificates` & `scores`) |
| **Kolom URL** | `certificate_image_url`, `score_image_url` |
| **Fallback** | Data URL (Base64) jika save file gagal |
| **API Endpoints** | `/api/save-generated-certificate`, `/api/save-generated-score` |
| **Naming Pattern** | `{cert_no}.png` atau `{cert_no}_{suffix}.png` |

---

## 📚 File Terkait

### Backend/API
- `src/app/api/save-generated-certificate/route.ts`
- `src/app/api/save-generated-score/route.ts`

### Frontend
- `src/app/templates/generate/page.tsx` (fungsi saveGeneratedPNG)

### Database
- `src/lib/supabase/certificates.ts` (createCertificate)
- `src/lib/supabase/scores.ts` (createScore)

### Migration
- `migrations/004_add_score_image_to_certificates.sql`

---

**Dokumen ini dibuat berdasarkan analisis kode di:**
- `src/app/api/save-generated-certificate/route.ts`
- `src/app/api/save-generated-score/route.ts`
- `src/app/templates/generate/page.tsx`
- `src/lib/supabase/certificates.ts`
- `public/generate/README.md`

**Terakhir diupdate:** 2024


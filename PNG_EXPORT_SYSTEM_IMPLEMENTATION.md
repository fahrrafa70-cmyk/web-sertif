# PNG Export System Implementation

## Overview

Sistem penyimpanan hasil edit template sertifikat telah diperbaiki agar setiap kali pengguna selesai mengatur posisi teks dan elemen di atas template, hasil akhirnya disimpan sebagai satu gambar PNG utuh.

## Tujuan

Preview sertifikat harus tampil persis sama seperti tampilan di editor, tanpa pergeseran teks atau perubahan ukuran border, karena seluruh hasil edit sudah dirender menjadi satu file PNG final.

## Perubahan yang Dilakukan

### 1. Database Schema Update

- **File**: `database/add_generated_png_path.sql`
- **Perubahan**: Menambahkan kolom `generated_png_path` ke tabel `certificates`
- **Tujuan**: Menyimpan path file PNG yang dihasilkan

### 2. API Route untuk Menyimpan PNG

- **File**: `src/app/api/save-certificate-png/route.ts`
- **Fungsi**:
  - Menerima data gambar base64 dari frontend
  - Menyimpan file PNG ke folder `./public/generate/`
  - Mengembalikan path file yang tersimpan
- **Fitur**:
  - Membuat folder `generate` otomatis jika belum ada
  - Nama file unik berdasarkan ID sertifikat
  - Konversi base64 ke buffer dan simpan sebagai PNG

### 3. Update Types dan Interface

- **File**: `src/lib/supabase/certificates.ts`
- **Perubahan**:
  - Menambahkan `generated_png_path: string | null` ke interface `Certificate`
  - Menambahkan field yang sama ke `CreateCertificateData` dan `UpdateCertificateData`
  - Update fungsi `createCertificate` dan `updateCertificate` untuk menyimpan path PNG

### 4. Update Proses Generate Certificate

- **File**: `src/app/templates/generate/page.tsx`
- **Perubahan**:
  - Setelah membuat merged image dengan canvas, sistem sekarang:
    1. Generate unique certificate ID
    2. Kirim data PNG ke API `/api/save-certificate-png`
    3. Simpan path file PNG ke database
    4. Simpan data sertifikat lengkap dengan path PNG

### 5. Update Sistem Preview

- **File**: `src/app/certificates/page.tsx`
- **Perubahan**:
  - Prioritas tampilan: `generated_png_path` → `certificate_image_url` → template + text layers
  - Jika ada file PNG yang tersimpan, langsung tampilkan file tersebut
  - Fallback ke sistem lama jika file PNG tidak tersedia

## Cara Kerja Sistem Baru

### 1. Proses Generate Certificate

```
User klik "Generate & Save Certificate"
    ↓
Canvas rendering dengan background + text layers
    ↓
Export canvas ke base64 PNG
    ↓
Kirim ke API /api/save-certificate-png
    ↓
Simpan file PNG ke ./public/generate/certificate_<id>.png
    ↓
Simpan path PNG ke database
    ↓
Simpan data sertifikat lengkap
```

### 2. Proses Preview Certificate

```
Load certificate data
    ↓
Cek apakah ada generated_png_path
    ↓
Jika ada: tampilkan file PNG langsung
    ↓
Jika tidak: fallback ke sistem lama (template + text layers)
```

## Keuntungan Sistem Baru

1. **Konsistensi Tampilan**: Preview selalu identik dengan editor karena menggunakan file PNG final
2. **Performance**: Tidak perlu render ulang text layers saat preview
3. **Reliability**: Tidak ada pergeseran posisi teks atau perubahan ukuran
4. **Lossless Quality**: PNG dengan resolusi asli template (800x600)
5. **Backward Compatibility**: Sistem lama tetap berfungsi sebagai fallback

## File Structure

```
public/
├── generate/                    # Folder untuk file PNG hasil generate
│   ├── certificate_<id>.png    # File PNG hasil generate
│   └── ...
└── template/                   # Folder template asli
    └── ...
```

## Database Schema

```sql
ALTER TABLE certificates
ADD COLUMN generated_png_path TEXT;
```

## Testing

Untuk menguji sistem:

1. Buka template editor
2. Atur posisi teks dan elemen
3. Klik "Generate & Save Certificate"
4. Periksa folder `./public/generate/` untuk file PNG
5. Buka halaman certificates untuk melihat preview
6. Pastikan preview identik dengan editor

## Troubleshooting

- Jika file PNG tidak tersimpan: periksa permission folder `./public/generate/`
- Jika preview tidak muncul: periksa path file di database
- Jika ada error API: periksa log server untuk detail error

# 📚 Panduan Penggunaan E-Certificate Platform

Dokumen ini berisi panduan lengkap untuk menggunakan platform E-Certificate Management System.

---

## 📋 Daftar Isi

1. [Pengenalan Platform](#1-pengenalan-platform)
2. [Mengatur Role Akun](#2-mengatur-role-akun)
3. [Cara Menambah Template](#3-cara-menambah-template)
4. [Cara Menggunakan Fitur Generate](#4-cara-menggunakan-fitur-generate)
5. [Cara Menggunakan Import Excel](#5-cara-menggunakan-import-excel)
6. [Fitur Lainnya](#6-fitur-lainnya)

---

## 1. Pengenalan Platform

### 1.1. Level Akses (Role)

Platform ini memiliki 3 level akses:

| Role | Akses | Deskripsi |
|------|-------|-----------|
| **Admin** | Full Access | Dapat mengelola semua fitur termasuk menghapus data |
| **Team** | Limited Access | Dapat menambah, melihat, dan mengedit data, tetapi tidak dapat menghapus |
| **User/Public** | Read Only | Hanya dapat mencari dan melihat sertifikat tertentu |

### 1.2. Cara Login

1. Klik tombol **"Login"** di pojok kanan atas halaman
2. Pilih metode login:
   - **Email & Password** (untuk akun yang sudah didaftarkan)
   - **Google** (OAuth Google)
   - **GitHub** (OAuth GitHub)
3. Setelah login berhasil, Anda akan diarahkan ke halaman utama

---

## 2. Mengatur Role Akun

### 2.1. Konsep Role Management

Role diatur melalui **Email Whitelist** di database Supabase. Setiap email yang terdaftar di tabel `email_whitelist` akan mendapatkan role sesuai yang ditentukan.

### 2.2. Cara Mengatur Role via SQL Editor (Supabase Dashboard)

#### **Langkah 1: Buka Supabase Dashboard**
1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Buka **SQL Editor** dari menu sidebar

#### **Langkah 2: Tambahkan Email ke Whitelist**

**Menambahkan Admin:**
```sql
INSERT INTO email_whitelist (email, role) 
VALUES ('admin@yourcompany.com', 'admin');
```

**Menambahkan Team Member:**
```sql
INSERT INTO email_whitelist (email, role) 
VALUES ('manager@yourcompany.com', 'team');
```

**Menambahkan Multiple Users:**
```sql
INSERT INTO email_whitelist (email, role) VALUES
  ('admin@yourcompany.com', 'admin'),
  ('manager@yourcompany.com', 'team'),
  ('staff1@yourcompany.com', 'team'),
  ('staff2@yourcompany.com', 'team');
```

#### **Langkah 3: Update Role Existing User**

Jika ingin mengubah role email yang sudah ada:
```sql
UPDATE email_whitelist 
SET role = 'admin', updated_at = NOW()
WHERE email = 'manager@yourcompany.com';
```

#### **Langkah 4: Verifikasi**

Cek semua email yang terdaftar:
```sql
SELECT email, role, created_at 
FROM email_whitelist 
ORDER BY role, email;
```

### 2.3. Cara Login Setelah Role Diatur

1. Setelah email ditambahkan ke whitelist, user dapat login menggunakan email tersebut
2. Role akan otomatis diberikan sesuai dengan yang ada di whitelist
3. Jika email tidak ada di whitelist, user akan mendapatkan role **"user/public"** secara default

### 2.4. Contoh Setup Role

```sql
-- Setup Admin
INSERT INTO email_whitelist (email, role) VALUES
  ('admin@company.com', 'admin'),
  ('superadmin@company.com', 'admin');

-- Setup Team
INSERT INTO email_whitelist (email, role) VALUES
  ('manager@company.com', 'team'),
  ('staff1@company.com', 'team'),
  ('staff2@company.com', 'team');

-- Setup User (Optional - jika ingin explicit)
INSERT INTO email_whitelist (email, role) VALUES
  ('user@company.com', 'user');
```

---

## 3. Cara Menambah Template

### 3.1. Akses Halaman Template

1. Login dengan role **Admin** atau **Team**
2. Klik menu **"Templates"** di sidebar
3. Halaman Template akan menampilkan semua template yang ada

### 3.2. Menambah Template Single Mode (Template Sertifikat Saja)

**Langkah 1: Buka Form Create**
1. Klik tombol **"Create Template"** atau **"Buat Template"**
2. Modal form akan terbuka

**Langkah 2: Isi Data Template**
- **Name**: Nama template (contoh: "Sertifikat Pelatihan")
- **Category**: Kategori template (contoh: "Training", "Internship", "MoU")
- **Orientation**: Pilih **"Landscape"** atau **"Portrait"**
- **Template Image**: Upload gambar template (PNG, JPG, JPEG, WebP, atau GIF)
  - Ukuran recommended: 1200x800px untuk Landscape atau 800x1200px untuk Portrait
  - Format: PNG atau JPG dengan kualitas tinggi

**Langkah 3: Upload Preview Image (Opsional)**
- Preview image adalah thumbnail/gambar kecil untuk preview
- Jika tidak diisi, sistem akan menggunakan template image sebagai preview

**Langkah 4: Simpan**
1. Klik tombol **"Create"** atau **"Buat"**
2. Template akan tersimpan dan muncul di daftar template

### 3.3. Menambah Template Dual Mode (Template + Score)

**Langkah 1: Enable Dual Template**
1. Klik tombol **"Create Template"**
2. Aktifkan opsi **"Dual Template"** (akan muncul checkbox/switch)

**Langkah 2: Upload Certificate Image**
- Upload gambar untuk sisi depan sertifikat (certificate image)

**Langkah 3: Upload Score Image**
- Upload gambar untuk sisi belakang (score image)

**Langkah 4: Isi Data Lainnya**
- **Name**: Nama template
- **Category**: Kategori
- **Orientation**: Pilih orientasi
- **Preview Image**: Opsional (untuk thumbnail)

**Langkah 5: Simpan**
- Klik **"Create"** untuk menyimpan template

### 3.4. Tips Template

- **Kualitas Gambar**: Gunakan gambar berkualitas tinggi (minimal 300 DPI)
- **Format File**: PNG untuk transparansi, JPG untuk file lebih kecil
- **Ukuran File**: Disarankan maksimal 5MB per gambar
- **Area Text**: Pastikan template memiliki area kosong untuk menambahkan text layers nanti

---

## 4. Cara Menggunakan Fitur Generate

### 4.1. Quick Generate (Generate Cepat)

**Langkah 1: Akses Quick Generate**
1. Login dengan role **Admin** atau **Team**
2. Buka halaman **"Certificates"**
3. Klik tombol **"Quick Generate"** atau **"Generate Certificate"**

**Langkah 2: Pilih Template**
1. Pilih template dari dropdown **"Select Template"**
2. Template yang dipilih akan muncul preview

**Langkah 3: Pilih Sumber Data**

Ada 3 pilihan sumber data:

#### **A. Select Member (Dari Database)**
1. Pilih **"Select Member"** sebagai data source
2. Pilih satu atau beberapa member dari daftar
3. Sistem akan menggunakan data member yang dipilih

#### **B. Upload Excel**
1. Pilih **"Upload Excel"** sebagai data source
2. Klik **"Choose Excel File"**
3. Pilih file Excel (.xlsx atau .xls)
4. Sistem akan membaca data dari Excel

**Format Excel untuk Quick Generate:**
- **Kolom Wajib:**
  - `name` - Nama penerima (Required)
  - `certificate_no` - Nomor sertifikat (Required)
  
- **Kolom Opsional:**
  - `organization` - Organisasi
  - `phone` - Nomor telepon
  - `email` - Email
  - `job` - Pekerjaan
  - `date_of_birth` - Tanggal lahir
  - `address` - Alamat
  - `city` - Kota
  - `issue_date` - Tanggal terbit (Format: YYYY-MM-DD)
  - `expired_date` - Tanggal kadaluarsa (Format: YYYY-MM-DD)

**Langkah 4: Set Issue Date & Expired Date**
1. Pilih **Issue Date** (Tanggal Terbit)
2. Pilih **Expired Date** (Tanggal Kadaluarsa) - Opsional
3. Pilih **Date Format** sesuai kebutuhan

**Langkah 5: Generate**
1. Klik tombol **"Generate"**
2. Sistem akan memproses dan membuat sertifikat
3. Setelah selesai, sertifikat akan muncul di halaman Certificates

### 4.2. Generate Manual (dari Halaman Template Generate)

**Langkah 1: Akses Template Generate**
1. Buka halaman **"Templates"**
2. Pilih template yang ingin digunakan
3. Klik tombol **"Use This Template"** atau **"Configure"**

**Langkah 2: Konfigurasi Layout (Pertama Kali)**
Jika template belum dikonfigurasi:
1. **Upload Template Image** atau gunakan yang sudah ada
2. **Tambahkan Text Layers** dengan drag & drop:
   - Klik **"Add Text Layer"**
   - Pilih font, ukuran, warna, alignment
   - Drag layer ke posisi yang diinginkan
   - Atur posisi, ukuran, dan styling
3. **Preview** untuk melihat hasil
4. **Save Layout** untuk menyimpan konfigurasi

**Langkah 3: Pilih Member**
1. Pilih member dari dropdown **"Select Member"**
2. Data member akan otomatis diisi ke text layers yang sudah dikonfigurasi

**Langkah 4: Isi Data Sertifikat**
- **Certificate Number**: Nomor sertifikat (atau biarkan auto-generate)
- **Issue Date**: Tanggal terbit
- **Expired Date**: Tanggal kadaluarsa (opsional)
- **Category**: Kategori sertifikat

**Langkah 5: Preview & Generate**
1. Klik **"Preview"** untuk melihat hasil
2. Jika sudah sesuai, klik **"Generate Certificate"**
3. Sertifikat akan tersimpan dan muncul di halaman Certificates

### 4.3. Batch Generate (Generate Banyak Sekaligus)

**Menggunakan Excel:**
1. Gunakan **Quick Generate** dengan data source **"Upload Excel"**
2. Upload file Excel yang berisi banyak data
3. Sistem akan otomatis generate semua sertifikat sekaligus
4. Progress akan ditampilkan selama proses

**Menggunakan Multiple Members:**
1. Gunakan **Quick Generate** dengan data source **"Select Member"**
2. Pilih beberapa member sekaligus (multi-select)
3. Klik **"Generate"**
4. Semua sertifikat akan dibuat sekaligus

---

## 5. Cara Menggunakan Import Excel

### 5.1. Import Excel untuk Members

**Langkah 1: Siapkan File Excel**
1. Buka Microsoft Excel atau Google Sheets
2. Buat file dengan kolom-kolom berikut:

**Kolom Wajib:**
- `name` atau `Name` - Nama lengkap (Required)

**Kolom Opsional:**
- `email` atau `Email` - Alamat email
- `phone` atau `Phone` - Nomor telepon
- `organization` atau `Organization` - Nama organisasi
- `job` atau `Job` - Pekerjaan/posisi
- `date_of_birth` atau `Date of Birth` - Tanggal lahir (Format: YYYY-MM-DD)
- `address` atau `Address` - Alamat lengkap
- `city` atau `City` - Kota
- `notes` atau `Notes` - Catatan tambahan

**Catatan Penting:**
- Nama kolom **tidak case-sensitive** (bisa "Name", "name", atau "NAME")
- Format tanggal lahir: **YYYY-MM-DD** (contoh: 2000-01-15)
- Email harus unik (tidak boleh duplikat)

**Contoh Format Excel:**

| name           | email           | phone        | organization | job     | date_of_birth | address            | city    |
|----------------|-----------------|--------------|--------------|---------|---------------|--------------------|---------|
| Budi Santoso   | budi@email.com  | 081234567890 | PT ABC       | Manager | 1990-05-20    | Jl. Raya No. 123   | Jakarta |
| Siti Nurhaliza | siti@email.com  | 081987654321 | PT XYZ       | Staff   | 1995-08-15    | Jl. Merdeka No. 45 | Bandung |

**Langkah 2: Import ke Sistem**
1. Login dengan role **Admin** atau **Team**
2. Buka halaman **"Members"**
3. Klik tombol **"Import Excel"** atau ikon spreadsheet
4. Klik **"Choose Excel File"**
5. Pilih file Excel yang sudah disiapkan
6. Klik **"Import Excel"** atau **"Import"**

**Langkah 3: Verifikasi Import**
1. Sistem akan memproses file Excel
2. Hasil import akan ditampilkan:
   - Jumlah data yang berhasil diimport
   - Data yang gagal (jika ada)
3. Cek di halaman Members untuk memastikan data sudah masuk

### 5.2. Import Excel untuk Quick Generate

**Langkah 1: Siapkan File Excel**
Format Excel untuk Quick Generate berbeda dengan import members:

**Kolom Wajib:**
- `name` - Nama penerima sertifikat
- `certificate_no` - Nomor sertifikat

**Kolom Opsional:**
- `organization` - Organisasi
- `phone` - Nomor telepon
- `email` - Email
- `issue_date` - Tanggal terbit (Format: YYYY-MM-DD)
- `expired_date` - Tanggal kadaluarsa (Format: YYYY-MM-DD)

**Contoh Format:**

| name | certificate_no | organization | email | issue_date | expired_date |
|------|----------------|--------------|-------|------------|--------------|
| Budi Santoso | CERT-001 | PT ABC | budi@email.com | 2025-01-15 | 2026-01-15 |
| Siti Nurhaliza | CERT-002 | PT XYZ | siti@email.com | 2025-01-16 | 2026-01-16 |

**Langkah 2: Gunakan Quick Generate**
1. Buka halaman **"Certificates"**
2. Klik **"Quick Generate"**
3. Pilih template
4. Pilih **"Upload Excel"** sebagai data source
5. **Pilih format tanggal** yang diinginkan untuk tampilan di sertifikat:
   - `dd-mm-yyyy` (contoh: 15-01-2025)
   - `mm-dd-yyyy` (contoh: 01-15-2025)
   - `yyyy-mm-dd` (contoh: 2025-01-15)
   - `dd-mmm-yyyy` (contoh: 15-Jan-2025)
   - `dd-mmmm-yyyy` (contoh: 15-January-2025)
   - `dd/mm/yyyy` (contoh: 15/01/2025)
   - `mm/dd/yyyy` (contoh: 01/15/2025)
   - `yyyy/mm/dd` (contoh: 2025/01/15)
   - `dd-indonesian-yyyy` (contoh: 15 Januari 2025)
6. Upload file Excel
7. Mapping kolom Excel ke field sertifikat (otomatis atau manual)
8. Klik **"Generate"**

**Catatan Penting tentang Format Tanggal:**
- Format tanggal di Excel harus tetap menggunakan format ISO: `YYYY-MM-DD` (contoh: 2025-01-15)
- Pilihan format tanggal hanya mengubah **tampilan** di sertifikat yang dihasilkan
- Contoh: Jika Excel berisi `2025-01-15` dan Anda pilih format `dd-indonesian-yyyy`, maka di sertifikat akan tampil `15 Januari 2025`

### 5.3. Tips Import Excel

- **File Format**: Gunakan `.xlsx` atau `.xls`
- **Baris Pertama**: Pastikan baris pertama adalah header kolom
- **Data Validation**: Pastikan email unik, format tanggal benar
- **Encoding**: Jika ada karakter khusus, pastikan file menggunakan UTF-8
- **Ukuran File**: Disarankan maksimal 5MB per file
- **Jumlah Data**: Disarankan maksimal 1000 rows per import untuk performa optimal

---

## 6. Fitur Lainnya

### 6.1. Search Certificate

**Langkah:**
1. Di halaman utama, gunakan search box
2. Masukkan nomor sertifikat atau nama
3. Klik tombol search
4. Hasil akan ditampilkan jika ditemukan

### 6.2. View Certificate Detail

**Langkah:**
1. Klik pada sertifikat yang ingin dilihat
2. Modal detail akan muncul
3. Informasi lengkap sertifikat akan ditampilkan
4. Opsi untuk download atau verify tersedia

### 6.3. Download Certificate

**Langkah:**
1. Buka detail sertifikat
2. Klik tombol **"Download"** atau ikon download
3. Pilih format:
   - **PDF**: Untuk dokumen resmi
   - **PNG**: Untuk gambar

### 6.4. Verify Certificate

**Langkah:**
1. Setiap sertifikat memiliki **Public ID** unik
2. Akses URL: `https://yourdomain.com/cek/{public_id}`
3. Sistem akan menampilkan detail sertifikat untuk verifikasi

### 6.5. Send Certificate via Email

**Langkah:**
1. Buka detail sertifikat
2. Klik tombol **"Send via Email"**
3. Isi:
   - **Recipient Email**: Email penerima
   - **Subject**: Subjek email
   - **Message**: Pesan email
4. Klik **"Send Email"**
5. Email akan dikirim dengan sertifikat sebagai attachment

### 6.6. Edit Template

**Langkah:**
1. Buka halaman **"Templates"**
2. Klik tombol **"Edit"** pada template yang ingin diedit
3. Ubah informasi template
4. Upload gambar baru jika perlu
5. Klik **"Save"**

### 6.7. Edit Member

**Langkah:**
1. Buka halaman **"Members"**
2. Klik tombol **"Edit"** pada member yang ingin diedit
3. Ubah informasi member
4. Klik **"Save Changes"**

### 6.8. Delete Data

**Catatan**: Hanya **Admin** yang dapat menghapus data

**Menghapus Template:**
1. Buka halaman **"Templates"**
2. Klik tombol **"Delete"** pada template
3. Konfirmasi penghapusan
4. Template dan gambar terkait akan dihapus

**Menghapus Member:**
1. Buka halaman **"Members"**
2. Klik tombol **"Delete"** pada member
3. Konfirmasi penghapusan
4. Member akan dihapus (sertifikat terkait tetap ada)

**Menghapus Certificate:**
1. Buka halaman **"Certificates"**
2. Klik tombol **"Delete"** pada sertifikat
3. Konfirmasi penghapusan
4. Sertifikat dan file terkait akan dihapus

---

## 7. Troubleshooting

### 7.1. Login Gagal

**Masalah**: Tidak bisa login atau role tidak sesuai
**Solusi**:
- Pastikan email sudah ditambahkan ke `email_whitelist` di database
- Cek role yang diassign sudah benar (admin/team/user)
- Coba logout dan login kembali

### 7.2. Template Tidak Muncul

**Masalah**: Template tidak muncul setelah dibuat
**Solusi**:
- Refresh halaman
- Cek apakah gambar template berhasil diupload
- Pastikan role Anda memiliki akses (Admin/Team)

### 7.3. Import Excel Gagal

**Masalah**: Error saat import Excel
**Solusi**:
- Pastikan kolom `name` ada dan terisi
- Cek format file adalah .xlsx atau .xls
- Pastikan tidak ada duplikasi email
- Cek format tanggal sesuai (YYYY-MM-DD)

### 7.4. Generate Gagal

**Masalah**: Sertifikat tidak ter-generate
**Solusi**:
- Pastikan template sudah dipilih
- Pastikan member sudah dipilih atau Excel sudah diupload
- Cek koneksi internet
- Pastikan template memiliki area untuk text layers

### 7.5. Gambar Tidak Muncul

**Masalah**: Gambar template atau sertifikat tidak muncul
**Solusi**:
- Refresh halaman (Ctrl+F5 atau Cmd+Shift+R)
- Cek koneksi internet
- Cek apakah file masih ada di Storage
- Hubungi admin jika masalah berlanjut

---

## 8. Tips & Best Practices

### 8.1. Organisasi Data

- **Naming Convention**: Gunakan nama yang konsisten untuk template dan sertifikat
- **Category**: Gunakan kategori yang jelas dan konsisten
- **Certificate Number**: Gunakan format nomor yang konsisten (contoh: CERT-001, CERT-002)

### 8.2. Template Design

- **Resolution**: Gunakan resolusi tinggi (minimal 300 DPI)
- **Safe Area**: Tinggalkan area kosong untuk text layers
- **Colors**: Gunakan warna yang kontras dengan text
- **Font Compatibility**: Pastikan font mudah dibaca

### 8.3. Data Management

- **Backup**: Rutin backup data penting
- **Cleanup**: Hapus data yang tidak diperlukan
- **Validation**: Validasi data sebelum import besar-besaran

### 8.4. Security

- **Role Management**: Hanya berikan role yang diperlukan
- **Email Whitelist**: Jaga keamanan whitelist email
- **Password**: Gunakan password yang kuat untuk akun admin

---

## 9. Support & Contact

Jika mengalami masalah atau pertanyaan:
- Cek dokumentasi ini terlebih dahulu
- Hubungi admin sistem
- Buka issue di repository (jika open source)

---

**Versi Dokumen**: 1.0  
**Terakhir Diupdate**: 2025  
**Platform**: E-Certificate Management System


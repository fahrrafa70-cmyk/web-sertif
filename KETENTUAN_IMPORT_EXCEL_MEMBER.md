# Ketentuan Tabel untuk Insert Member dengan Excel

## 📋 Informasi Umum

Dokumen ini menjelaskan ketentuan format tabel Excel yang digunakan untuk import data member ke dalam sistem.

---

## ✅ Kolom yang Diperlukan (Required)

### 1. **Name** ⚠️ WAJIB
- **Nama Kolom di Excel:** 
  - `Name` (kapital N) atau 
  - `name` (huruf kecil)
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Field ini **WAJIB** diisi, tidak boleh kosong
  - Baris yang tidak memiliki Name akan diabaikan (skip) saat import
  - Tidak ada limit panjang karakter (akan di-trim otomatis)
- **Contoh:** `John Doe`, `Jane Smith`, `Budi Santoso`

---

## 📝 Kolom Opsional (Optional)

### 2. **Email**
- **Nama Kolom di Excel:** 
  - `Email` atau 
  - `email`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Email akan otomatis dikonversi ke lowercase
  - Sistem akan mengecek duplikasi email
  - Jika email sudah ada di database, row tersebut akan gagal di-import dengan error: "A member with this email already exists"
  - Format email harus valid (contoh: `user@example.com`)
- **Contoh:** `john@example.com`, `jane.smith@company.com`

### 3. **Organization**
- **Nama Kolom di Excel:** 
  - `Organization` atau 
  - `organization`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Nama organisasi/instansi/lembaga tempat member bekerja
  - Bisa dikosongkan
- **Contoh:** `ABC Corporation`, `PT. XYZ Indonesia`, `Universitas Indonesia`

### 4. **Phone**
- **Nama Kolom di Excel:** 
  - `Phone` atau 
  - `phone`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Nomor telepon member
  - Bisa dikosongkan
  - Tidak ada format khusus yang dipaksa
- **Contoh:** `08123456789`, `+6281234567890`, `021-1234567`

### 5. **Job**
- **Nama Kolom di Excel:** 
  - `Job` atau 
  - `job`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Posisi/jabatan pekerjaan member
  - Bisa dikosongkan
- **Contoh:** `Software Engineer`, `Manager`, `Dosen`, `Mahasiswa`

### 6. **Date of Birth**
- **Nama Kolom di Excel:** 
  - `Date of Birth` (dengan spasi) atau 
  - `date_of_birth` (dengan underscore)
- **Tipe Data:** Text/String atau Date (akan dikonversi ke string)
- **Keterangan:** 
  - Format tanggal lahir
  - Direkomendasikan format: `YYYY-MM-DD` (contoh: `1990-01-15`)
  - Akan disimpan sebagai ISO date string
  - Bisa dikosongkan
- **Contoh:** `1990-01-15`, `1985-12-25`

### 7. **Address**
- **Nama Kolom di Excel:** 
  - `Address` atau 
  - `address`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Alamat lengkap member
  - Bisa dikosongkan
- **Contoh:** `Jl. Sudirman No. 123`, `Komp. Perumahan ABC Blok D-5`

### 8. **City**
- **Nama Kolom di Excel:** 
  - `City` atau 
  - `city`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Kota tempat tinggal member
  - Bisa dikosongkan
- **Contoh:** `Jakarta`, `Bandung`, `Surabaya`

### 9. **Notes**
- **Nama Kolom di Excel:** 
  - `Notes` atau 
  - `notes`
- **Tipe Data:** Text/String
- **Keterangan:** 
  - Catatan tambahan tentang member
  - Bisa dikosongkan
- **Contoh:** `Peserta training bulan Januari`, `Anggota aktif`

---

## 📊 Contoh Format Excel

### Contoh Tabel Excel:

| Name* | Email | Organization | Phone | Job | Date of Birth | Address | City | Notes |
|-------|-------|--------------|-------|-----|---------------|---------|------|-------|
| John Doe | john@example.com | ABC Corp | 08123456789 | Software Engineer | 1990-01-15 | Jl. Sudirman No. 123 | Jakarta | Peserta training |
| Jane Smith | jane@example.com | XYZ Inc | 08198765432 | Manager | 1985-05-20 | Jl. Gatot Subroto No. 45 | Bandung | - |
| Budi Santoso | budi@example.com | PT. Indonesia | 08211234567 | Dosen | 1988-12-10 | Jl. Merdeka No. 10 | Surabaya | - |

**Keterangan:**
- `*` = Kolom wajib
- `-` atau kosong = Boleh dikosongkan untuk kolom opsional

---

## 🔍 Ketentuan Penting

### 1. **Nama Kolom (Case Insensitive)**
- Sistem mendukung nama kolom dengan huruf besar/kecil
- Contoh: `Name`, `name`, `EMAIL`, `email` semua akan dikenali

### 2. **Data Trimming**
- Semua data akan otomatis di-trim (spasi di awal/akhir dihapus)
- Baris kosong akan diabaikan

### 3. **Validasi Data**
- **Name wajib:** Baris tanpa Name akan di-skip
- **Email unique:** Jika email sudah ada, row akan gagal di-import
- Email otomatis di-convert ke lowercase

### 4. **Format File**
- File yang didukung: `.xlsx` atau `.xls`
- Sheet pertama (`Sheet1`) akan digunakan untuk import
- Header row (baris pertama) harus berisi nama kolom

### 5. **Proses Import**
- Import dilakukan per baris secara sequential
- Jika ada error pada satu baris, baris tersebut akan di-skip dan melanjutkan ke baris berikutnya
- Sistem akan menampilkan jumlah sukses dan jumlah error setelah import selesai

### 6. **Error Handling**
- Baris tanpa Name: **SKIP** (tidak di-import)
- Email duplikat: **ERROR** (baris tersebut gagal, baris lain tetap diproses)
- Format file tidak valid: **ERROR** (seluruh import gagal)

---

## 📋 Checklist Sebelum Import

Sebelum melakukan import, pastikan:

- [ ] File Excel menggunakan format `.xlsx` atau `.xls`
- [ ] Baris pertama berisi header (nama kolom)
- [ ] Setiap baris data memiliki kolom **Name** yang terisi
- [ ] Email (jika ada) tidak duplikat dengan data yang sudah ada
- [ ] Format Date of Birth menggunakan format `YYYY-MM-DD` (disarankan)
- [ ] Tidak ada baris kosong di antara data
- [ ] Nama kolom sesuai dengan yang ditentukan (case insensitive)

---

## 🗂️ Struktur Database

### Tabel: `members`

| Kolom | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `id` | UUID | Auto | Primary key, auto-generated |
| `name` | TEXT | ✅ Yes | Nama lengkap |
| `email` | TEXT | ❌ No | Email (unique jika ada) |
| `organization` | TEXT | ❌ No | Organisasi/instansi |
| `phone` | TEXT | ❌ No | Nomor telepon |
| `job` | TEXT | ❌ No | Pekerjaan/jabatan |
| `date_of_birth` | DATE | ❌ No | Tanggal lahir |
| `address` | TEXT | ❌ No | Alamat |
| `city` | TEXT | ❌ No | Kota |
| `notes` | TEXT | ❌ No | Catatan |
| `created_at` | TIMESTAMP | Auto | Waktu dibuat (auto) |
| `updated_at` | TIMESTAMP | Auto | Waktu diupdate (auto) |

---

## 📝 Contoh File Excel Minimal

### Format Minimal (hanya Name):

| Name* |
|-------|
| John Doe |
| Jane Smith |
| Budi Santoso |

### Format Lengkap:

| Name* | Email | Organization | Phone | Job | Date of Birth | Address | City | Notes |
|-------|-------|--------------|-------|-----|---------------|---------|------|-------|
| John Doe | john@example.com | ABC Corp | 08123456789 | Software Engineer | 1990-01-15 | Jl. Sudirman No. 123 | Jakarta | Peserta training |
| Jane Smith | jane@example.com | XYZ Inc | 08198765432 | Manager | 1985-05-20 | Jl. Gatot Subroto No. 45 | Bandung | - |
| Budi Santoso | budi@example.com | PT. Indonesia | 08211234567 | Dosen | 1988-12-10 | Jl. Merdeka No. 10 | Surabaya | - |

---

## ⚠️ Catatan Penting

1. **Baris Pertama = Header:** Pastikan baris pertama berisi nama kolom, bukan data
2. **Name Wajib:** Setiap baris data HARUS memiliki Name, jika tidak akan di-skip
3. **Email Unik:** Email yang sama tidak boleh ada di database (jika ingin import ulang, gunakan email berbeda atau hapus data lama terlebih dahulu)
4. **Case Insensitive:** Nama kolom tidak case-sensitive (`Name` = `name` = `NAME`)
5. **Multiple Sheets:** Hanya sheet pertama yang akan di-import

---

## 🎯 Ringkasan

| Kategori | Detail |
|----------|--------|
| **Kolom Wajib** | Name |
| **Kolom Opsional** | Email, Organization, Phone, Job, Date of Birth, Address, City, Notes |
| **Format File** | .xlsx atau .xls |
| **Header Row** | Baris pertama harus berisi nama kolom |
| **Validasi** | Name wajib, Email harus unique (jika ada) |
| **Case Sensitivity** | Nama kolom tidak case-sensitive |

---

**Dokumen ini dibuat berdasarkan analisis kode di:**
- `src/lib/supabase/members.ts` (struktur Member interface)
- `src/app/members/page.tsx` (logika import Excel)

**Terakhir diupdate:** 2024


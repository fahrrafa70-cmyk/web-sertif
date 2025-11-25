# 📘 Dokumentasi Lengkap E-Certificate Management System

Dokumen ini menjelaskan secara lengkap tentang sistem, fitur, alur kerja, serta aspek teknis dari **E-Certificate Management System** yang digunakan untuk mengelola sertifikat elektronik.

---

## 1. Gambaran Umum Aplikasi

### 1.1 Tujuan Sistem

Sistem ini dirancang untuk:

- **Digitalisasi proses sertifikat**  
  Menggantikan proses manual (Word/Excel/Photoshop) menjadi otomatis dan terstruktur.
- **Skalabilitas**  
  Mampu membuat sertifikat dalam jumlah besar (ratusan–ribuan) dalam sekali proses.
- **Verifikasi Online**  
  Setiap sertifikat memiliki link publik & QR code untuk verifikasi.
- **Manajemen Data Terpusat**  
  Data peserta, template, dan sertifikat tersimpan rapi dalam satu sistem.

### 1.2 Peran (Role) Pengguna

- **Admin**

  - Akses penuh ke semua fitur
  - Dapat menghapus data sensitif (template, sertifikat, member)
  - Mengatur role user via email whitelist

- **Team**

  - Dapat menambah, memperbarui, dan menggunakan template
  - Dapat mengelola member
  - Dapat generate sertifikat
  - Tidak memiliki akses penuh untuk delete kritikal tertentu (tergantung konfigurasi)

- **User/Public**
  - Mengakses fitur publik:
    - Mencari sertifikat
    - Melihat detail sertifikat
    - Verifikasi melalui URL/QR code

---

## 2. Arsitektur & Teknologi

### 2.1 Stack Teknologi

- **Frontend**

  - Next.js 15 (App Router)
  - React 19
  - TailwindCSS
  - shadcn/ui + Radix UI (komponen UI siap pakai)
  - Framer Motion (animasi)

- **Backend / Data**

  - Supabase:
    - PostgreSQL (database)
    - Supabase Auth (login & OAuth)
    - Supabase Storage (file/gambar sertifikat, template, avatar)

- **Library Pendukung**
  - `html2canvas` – render sertifikat dari canvas ke gambar
  - `sharp` – optimasi & konversi gambar di sisi server
  - `xlsx` – membaca dan memproses file Excel
  - `qrcode` – generate QR code sebagai data URL
  - `jspdf` – membuat file PDF dari hasil render sertifikat
  - `sonner` – toast notification

### 2.2 Struktur Folder Utama

- `src/app/`
  - `templates/` – halaman list & manajemen template
  - `templates/configure/` – layout editor (text/photo/QR)
  - `certificates/` – generate & list sertifikat
  - `data/` – manajemen members
  - `search/` – pencarian sertifikat publik
  - `c/[public_id]/` – halaman verifikasi sertifikat publik
  - `profile/` – halaman edit profil user
  - `auth/` – login/OAuth callback
  - `api/` – API routes (profile, templates, upload, send email, dll.)
- `src/lib/supabase/` – helper Supabase (templates, certificates, users, dll.)
- `migrations/` – file SQL untuk schema database
- `scripts/` – script Node.js (migrasi, analisa bundle, setup storage, dll.)

---

## 3. Autentikasi & Role

### 3.1 Metode Login

- **Email & Password** via Supabase Auth
- **Google OAuth**
- **GitHub OAuth**

Setelah login, sistem akan:

1. Mengecek email di tabel `users`
2. Mengecek email di tabel `email_whitelist` untuk menentukan role
3. Menyimpan role di `localStorage` (`ecert-role`) untuk dipakai di UI

### 3.2 Role & Hak Akses

| Role        | Akses Utama                                                   |
| ----------- | ------------------------------------------------------------- |
| Admin       | Full access: mengelola semua data, termasuk delete            |
| Team        | Tambah/edit template, member, sertifikat; generate sertifikat |
| User/Public | Mengakses fitur publik: search & view sertifikat              |

Role diatur melalui tabel `email_whitelist` di database Supabase. Detail cara setup sudah dijelaskan di `PANDUAN_PENGGUNAAN.md`.

---

## 4. Manajemen Template Sertifikat

### 4.1 Jenis Template

1. **Single Template**  
   Template dengan satu gambar sertifikat.

2. **Dual Template**  
   Template dengan dua sisi:
   - `certificate_image` (sisi depan)
   - `score_image` (sisi belakang, misalnya untuk nilai/rapor)

### 4.2 Halaman Templates (`/templates`)

Fitur utama:

- Melihat daftar semua template yang tersedia
- Filter berdasarkan:
  - Tenant (jika multi-tenant diaktifkan)
  - Kategori
  - Orientasi (Landscape/Portrait)
  - Status (Draft/Ready)
- Aksi per template:
  - Create template baru
  - Edit informasi template
  - Hapus template (role Admin)
  - Buka halaman configure layout

### 4.3 Data yang Disimpan per Template

Beberapa field penting di database (disederhanakan):

- `name` – nama template
- `category` – kategori (Training, Webinar, Internship, dsb.)
- `orientation` – Landscape / Portrait
- `image_path` – gambar utama (single mode)
- `preview_image_path` – thumbnail untuk preview (opsional)
- `certificate_image_url` – gambar sisi depan (dual mode)
- `score_image_url` – gambar sisi belakang (dual mode)
- `status` – draft/ready
- `is_layout_configured` – apakah layout sudah diatur di configure page

---

## 5. Layout Editor (Configure Template)

Lokasi: `/templates/configure?template={id}`

### 5.1 Konsep Dasar

Layout editor memungkinkan kamu menyusun tampilan final sertifikat di atas gambar template:

- Menambahkan dan mengatur **Text Layer**
- Menambahkan dan mengatur **Photo Layer**
- Menambahkan dan mengatur **QR Code Layer**
- Menyimpan konfigurasi layout ke database untuk dipakai saat generate

Semua posisi dan ukuran layer disimpan sebagai kombinasi **pixel** dan **persentase**, sehingga tetap proporsional meski ukuran gambar berubah.

### 5.2 Text Layers

Fitur utama text layer:

- Tambah / rename / delete text layer
- Drag & drop langsung di canvas
- Pengaturan style:
  - Font family
  - Font weight (normal/bold)
  - Font size (dan persentasenya terhadap tinggi gambar)
  - Warna teks
  - Alignment (left/center/right)
  - Line-height (jarak antar baris)
  - Max width (lebar kotak teks)
- Mapping ke field data otomatis, misalnya:
  - `name`
  - `certificate_no`
  - `issue_date`
  - `expired_date`
  - `description`

Khusus layer `description`, sistem otomatis menambahkan **default text** berupa kalimat penghargaan, yang bisa dinyalakan/dimatikan dengan `useDefaultText`.

### 5.3 Photo Layers

Fitur photo layer:

- Menambahkan gambar/foto kecil di atas template (misalnya logo tambahan, tanda tangan, dsb.)
- Upload gambar ke Supabase Storage (bucket `templates`)
- Pengaturan:
  - Posisi (x, y)
  - Ukuran (width, height)
  - Z-index (urutan depan/belakang terhadap layer lain)

### 5.4 QR Code Layers

Fitur QR code layer:

- Menambah satu atau beberapa QR code di template
- Properti yang bisa diatur:
  - Posisi (x, y)
  - Ukuran (selalu persegi / square)
  - Warna foreground & background
  - Error correction level (L, M, Q, H)
  - Data QR menggunakan placeholder, misalnya: `{{CERTIFICATE_URL}}`
- Resize menggunakan drag handle di sudut/border
- Panel pengaturan QR akan tertutup otomatis saat layer lain (text/photo) dipilih, agar konsisten dengan behavior UI lainnya.

### 5.5 Penyimpanan Layout

Saat klik **Save Layout**:

1. Semua konfigurasi layer (text, photo, QR) di-serialize ke JSON.
2. JSON tersebut disimpan di database sebagai konfigurasi layout template.
3. Saat proses generate sertifikat, konfigurasi ini digunakan untuk me-render gambar final.

---

## 6. Manajemen Member

Lokasi: biasanya di halaman `Data` atau `Members` (bergantung struktur routing).

### 6.1 Data Member yang Dikelola

Beberapa field umum:

- `name` – nama lengkap
- `email` – email
- `phone` – nomor telepon
- `organization` – organisasi/perusahaan
- `job` – jabatan/pekerjaan
- `date_of_birth` – tanggal lahir (format `YYYY-MM-DD`)
- `address` – alamat lengkap
- `city` – kota
- `notes` – catatan tambahan (opsional)

### 6.2 Import Excel Members

Fitur import Excel memungkinkan input data member dalam jumlah besar.

- **Kolom wajib**: `name`
- **Kolom opsional**: email, phone, organization, job, date_of_birth, address, city, notes
- Nama kolom tidak case-sensitive (`Name`, `name`, `NAME` akan diproses sama)
- Sistem akan menampilkan hasil import: jumlah yang berhasil, dan jika ada error.

Detail contoh format tabel dan langkah-langkah sudah dijelaskan rinci di `PANDUAN_PENGGUNAAN.md`.

---

## 7. Generate Sertifikat

Lokasi utama: `/certificates`

### 7.1 Quick Generate

Mode ini digunakan untuk membuat banyak sertifikat sekaligus dengan cepat.

#### Sumber Data:

1. **Select Member (dari database)**

   - Pilih satu atau beberapa member yang sudah tersimpan.

2. **Upload Excel**
   - File Excel dengan kolom:
     - **Wajib**: `name`, `certificate_no`
     - **Opsional**: organization, phone, email, issue_date, expired_date, dst.

#### Langkah Umum Quick Generate:

1. Login sebagai Admin/Team.
2. Buka halaman **Certificates**.
3. Klik tombol **Quick Generate**.
4. Pilih template yang ingin digunakan.
5. Pilih sumber data: **Select Member** atau **Upload Excel**.
6. Atur **Issue Date** dan opsional **Expired Date**.
7. Pilih format tampilan tanggal (dd-mm-yyyy, dd-indonesian-yyyy, dll.).
8. Klik **Generate**.
9. Sistem akan:
   - Membaca data input (member/Excel)
   - Menggabungkan data dengan layout template
   - Merender sertifikat menjadi gambar
   - Mengupload file ke Supabase Storage (bucket `certificates`)
   - Menyimpan record ke tabel `certificates` di database.

### 7.2 Generate dari Halaman Template

Selain Quick Generate, kamu bisa generate dari konteks template tertentu:

1. Buka halaman **Templates**.
2. Pilih template.
3. Klik **Configure** atau tombol yang mengarah ke halaman generate.
4. Pilih member atau input data manual.
5. Preview hasil.
6. Klik **Generate Certificate** untuk menyimpan hasil.

---

## 8. QR Code & Verifikasi Sertifikat

### 8.1 XID & URL Publik

Setiap sertifikat memiliki **XID** unik di database. Contoh:

- XID: `abc123`
- URL verifikasi publik: `/c/abc123`

URL ini digunakan:

- Sebagai link verifikasi di website
- Sebagai data di dalam QR code

### 8.2 Alur Integrasi QR Code

1. Saat konfigurasi layout, QR layer menggunakan data placeholder `{{CERTIFICATE_URL}}`.
2. Saat generate sertifikat:
   - Sertifikat disimpan terlebih dahulu ke database → mendapatkan XID.
   - Placeholder `PLACEHOLDER_XID` atau `{{CERTIFICATE_URL}}` diganti menjadi URL sebenarnya `/c/{xid}`.
   - Sertifikat di-render ulang dengan QR code final.
   - File diupload ke storage dengan nama konsisten:
     - `{xid}_cert.png`
     - `{xid}_score.png` (jika ada score side)

Dengan cara ini:

- XID di database = XID di filename = XID di QR code.
- Scan QR akan selalu mengarah ke sertifikat yang benar.

### 8.3 Halaman Verifikasi (`/c/[public_id]`)

Ketika URL `/c/{xid}` diakses:

- Sistem mencari sertifikat berdasarkan XID.
- Jika ditemukan, halaman menampilkan detail sertifikat (nama, nomor, tanggal, dsb.).
- Halaman ini bisa dipakai pihak ketiga untuk verifikasi keaslian sertifikat.

---

## 9. Pencarian & Detail Sertifikat

### 9.1 Pencarian Sertifikat

Lokasi: `/search`

Fitur:

- Search berdasarkan:
  - Nomor sertifikat
  - Nama penerima
- Pagination responsif:
  - Mobile: hanya icon chevron + teks `Page X of Y`
  - Desktop: tombol **Previous/Next** dengan nomor halaman.

### 9.2 Detail Sertifikat

Dari halaman search atau certificates:

- Klik pada salah satu sertifikat.
- Akan muncul modal/detail view berisi:
  - Nomor sertifikat
  - Nama penerima
  - Tanggal terbit & kadaluarsa
  - Kategori
  - Preview gambar sertifikat
- Aksi yang tersedia:
  - **Download** sertifikat (PNG/PDF)
  - **Send via Email** ke penerima
  - **Open public link** untuk verifikasi

---

## 10. Kirim Sertifikat via Email

Fitur pengiriman email memungkinkan admin/team mengirim sertifikat langsung ke email penerima.

### 10.1 Fitur Utama

- Mengirim email dengan lampiran sertifikat (PDF/PNG).
- Memakai format pesan default yang konsisten di seluruh halaman.
- Dapat menyesuaikan subject dan message.

Contoh format pesan default:

```text
Certificate Information:

• Certificate Number: {certificate_no}
• Recipient Name: {name}
• Issue Date: {issue_date}
• Expiry Date: {expired_date}
• Category: {category}
```

---

## 11. Profil Pengguna

Lokasi: `/profile`

### 11.1 Data Profil

Field yang dapat dikelola:

- `full_name` – nama lengkap (wajib)
- `username` – username unik
  - Huruf kecil, angka, dan underscore saja
  - 3–50 karakter
- `gender` – male / female / kosong
- `avatar_url` – link foto profil (disimpan di bucket `profile`)

### 11.2 Fitur Halaman Profile

- Menampilkan data profil saat ini (diambil dari API `/api/profile`).
- Mengubah nama, username, gender.
- Upload foto profil:
  - File divalidasi tipe & ukurannya.
  - Disimpan di Supabase Storage bucket `profile`.
- Validasi username real-time:
  - Dicek ke endpoint `/api/profile/username-check`.
  - Menggunakan debounce 500ms untuk menghindari spam request.
  - Jika username sama dengan username saat ini → otomatis dianggap valid.

UI/UX:

- Sidebar disembunyikan khusus di halaman profile untuk fokus.
- Tombol **Update Profile** hanya aktif saat:
  - Ada perubahan data, dan
  - Validasi nama & username lolos.
- State button jelas (enabled/disabled) dengan styling berbeda.

---

## 12. Setup & Deployment (Ringkas)

### 12.1 Environment Variables

Buat file `.env.local` di root project, minimal berisi:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Opsional (contoh)
NEXT_PUBLIC_AUTH_REDIRECT_URL=https://yourdomain.com/auth/callback
```

### 12.2 Langkah Setup Lokal

1. Clone repository.
2. Jalankan `npm install`.
3. Salin `env.example.txt` menjadi `.env.local` dan isi nilainya.
4. Jalankan semua file SQL di folder `migrations/` ke database Supabase.
5. Jalankan script setup storage jika ada (misal `node scripts/setup-profile-storage.js`).
6. Jalankan development server:
   ```bash
   npm run dev
   ```
7. Buka `http://localhost:3000` di browser.

### 12.3 Deploy

- Rekomendasi: **Vercel** untuk Next.js.
- Pastikan semua environment variables juga diset di platform deploy.
- Pastikan Supabase sudah terkonfigurasi (database, auth, storage, RLS).

---

## 13. Troubleshooting & Best Practices

Bagian troubleshooting detail (login gagal, import Excel gagal, generate gagal, dsb.) sudah dijelaskan di `PANDUAN_PENGGUNAAN.md`. Berikut ringkasan singkat:

### 13.1 Tips Umum

- Pastikan role user sudah diset benar di `email_whitelist`.
- Cek error di browser (Console & Network tab).
- Cek log error di sisi server bila ada.
- Gunakan format tanggal `YYYY-MM-DD` di Excel.
- Hindari upload gambar lebih dari 5MB per file.
- Rutin backup data penting (database & storage).

---

## 14. Versi & Informasi Tambahan

- **Nama Aplikasi**: E-Certificate Management System
- **Versi Dokumentasi**: 1.0
- **Terakhir Diperbarui**: 2025
- **Platform**: Next.js + Supabase

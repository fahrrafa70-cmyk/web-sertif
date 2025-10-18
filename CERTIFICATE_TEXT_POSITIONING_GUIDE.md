# Panduan Penempatan Teks Sertifikat

## Masalah yang Diperbaiki

### 1. Ketidakkonsistenan Penempatan Teks
- **Masalah Sebelumnya**: Posisi teks berubah antara editor dan tampilan final di menu sertifikat
- **Solusi**: Sistem sekarang menyimpan posisi teks yang tepat (x, y) ke database dan menampilkan dengan koordinat yang sama

### 2. Perbedaan Ukuran Font
- **Masalah Sebelumnya**: Ukuran font berbeda antara editor dan hasil akhir
- **Solusi**: Font size disesuaikan dan disimpan secara konsisten:
  - Certificate Number: 16px
  - Nama: 28px (bold)
  - Deskripsi: 14px
  - Tanggal: 14px
  - QR Code: 12px

### 3. Posisi Teks Berubah Saat Edit
- **Masalah Sebelumnya**: Saat mengedit elemen lain (misal: deskripsi), posisi nama kembali ke posisi awal
- **Solusi**: Fungsi `updateTextLayer` sekarang hanya mengubah property yang diupdate, mempertahankan posisi yang sudah diatur

## Cara Menggunakan Fitur Baru

### 1. Menempatkan Teks di Tengah Canvas
1. Pilih/klik teks yang ingin diposisikan
2. Di panel kanan, klik tombol **"Center"** (biru)
3. Teks akan otomatis terposisi di tengah canvas

### 2. Mengatur Posisi Teks Secara Manual
1. Klik dan drag teks ke posisi yang diinginkan
2. Posisi akan tersimpan otomatis
3. Saat beralih mengedit teks lain, posisi tidak akan berubah

### 3. Mengedit Teks Tanpa Mengubah Posisi
1. Pilih teks yang ingin diedit
2. Ubah konten teks di input field panel kanan
3. Atau double-click teks di canvas untuk edit langsung
4. Posisi teks tetap konsisten

### 4. Menyimpan dan Melihat Hasil
1. Setelah semua teks diatur, klik **"Generate & Save Certificate"**
2. Sistem akan menyimpan:
   - Data sertifikat
   - Posisi setiap elemen teks (x, y)
   - Style teks (font size, color, weight, family)
3. Di halaman Certificates, tampilan akan sama persis dengan editor

## Teknis: Data yang Disimpan

Setiap layer teks menyimpan:
```json
{
  "id": "name",
  "text": "John Doe",
  "x": 400,
  "y": 300,
  "fontSize": 28,
  "color": "#1f2937",
  "fontWeight": "bold",
  "fontFamily": "Arial"
}
```

Semua data ini disimpan ke database dalam kolom `text_layers` (JSONB) dan digunakan untuk rendering yang konsisten.

## Tips Penggunaan

1. **Gunakan tombol Center** untuk alignment sempurna di tengah
2. **Drag dengan hati-hati** - sistem akan memastikan teks tetap di dalam canvas
3. **Edit teks di panel kanan** untuk perubahan tanpa mengubah posisi
4. **Gunakan Preview** untuk melihat hasil sebelum disimpan

## Troubleshooting

### Jika posisi masih berubah:
1. Pastikan Anda mengklik "Generate & Save Certificate" setelah mengatur posisi
2. Refresh halaman jika diperlukan
3. Periksa bahwa text_layers tersimpan dengan benar di database

### Jika ukuran font berbeda:
1. Periksa setting di panel Text Editing Controls
2. Font size akan konsisten antara editor dan final jika tidak diubah manual
3. Gunakan font size yang sudah diset secara default untuk konsistensi optimal


# Generated Certificates Folder

Folder ini berisi file PNG hasil generate sertifikat yang telah diedit oleh pengguna.

## Struktur File

- `certificate_<id>.png` - File PNG hasil generate dengan ID unik
- Setiap file PNG berisi background template + text layers yang sudah dirender menjadi satu gambar utuh

## Spesifikasi File

- **Format**: PNG (lossless)
- **Resolusi**: 800x600 pixels (sesuai dengan template asli)
- **Kualitas**: High quality, tidak ada kompresi lossy
- **Konten**: Background template + seluruh text layers yang sudah diposisikan

## Cara Kerja

1. User mengedit template di editor
2. Sistem render canvas dengan background + text layers
3. Export canvas ke PNG dengan resolusi asli
4. Simpan file PNG ke folder ini dengan nama unik
5. Simpan path file ke database untuk preview

## Maintenance

- File PNG tidak akan dihapus otomatis
- Untuk cleanup, hapus file lama secara manual jika diperlukan
- Pastikan folder memiliki permission write untuk aplikasi

# 📁 Local File Storage Setup

## 🎯 Perubahan Sistem Storage

Template images sekarang disimpan di folder lokal `./public/template` alih-alih Supabase Storage.

## 📂 Struktur File

```
public/
└── template/
    ├── .gitkeep
    └── [uploaded-images]
        ├── 1703123456789-abc123.jpg
        ├── 1703123456790-def456.png
        └── ...
```

## 🔧 API Endpoints

### 1. **Upload Template** - `POST /api/upload-template`
- **Input**: FormData dengan file dan fileName
- **Output**: JSON dengan URL public file
- **Validasi**: 
  - File type: JPG, PNG only
  - File size: Max 5MB
  - Nama file: timestamp-random.extension

### 2. **Delete Template** - `DELETE /api/delete-template`
- **Input**: JSON dengan fileName
- **Output**: JSON dengan status sukses/gagal

## 📋 Cara Kerja

### **Upload Process:**
1. User pilih file di form
2. File dikirim ke `/api/upload-template`
3. File disimpan di `public/template/`
4. URL public dikembalikan: `/template/filename.jpg`
5. URL disimpan di database sebagai `image_url`

### **Delete Process:**
1. User hapus template
2. Sistem panggil `/api/delete-template`
3. File dihapus dari `public/template/`
4. Record dihapus dari database

## 🚀 Keuntungan Local Storage

✅ **Tidak perlu Supabase Storage bucket**  
✅ **File langsung accessible via URL**  
✅ **Tidak ada biaya storage**  
✅ **Kontrol penuh atas file**  
✅ **Upload lebih cepat**  

## ⚠️ Catatan Penting

- File disimpan di `public/template/` sehingga accessible via URL
- URL format: `http://localhost:3000/template/filename.jpg`
- File otomatis ter-commit ke git (kecuali di .gitignore)
- Untuk production, pertimbangkan CDN atau cloud storage

## 🔍 Testing

1. **Upload file** melalui form template
2. **Check console** untuk log upload
3. **Verify file** ada di `public/template/`
4. **Test URL** di browser: `http://localhost:3000/template/filename.jpg`

## 📁 File Structure

```
src/
├── app/
│   └── api/
│       ├── upload-template/
│       │   └── route.ts
│       └── delete-template/
│           └── route.ts
├── lib/
│   └── supabase/
│       └── templates.ts (updated)
└── public/
    └── template/
        └── .gitkeep
```

## 🎉 Hasil Akhir

- ✅ Template images tersimpan di `public/template/`
- ✅ URL accessible langsung: `/template/filename.jpg`
- ✅ Database menyimpan URL lokal
- ✅ Upload/delete bekerja dengan API endpoints
- ✅ Tidak perlu Supabase Storage configuration


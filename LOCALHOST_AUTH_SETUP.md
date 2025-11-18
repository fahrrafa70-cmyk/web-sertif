# 🔧 Setup OAuth untuk Testing di Localhost

## Masalah
Ketika login dengan OAuth (Google/GitHub) di localhost, aplikasi redirect ke production URL yang sudah di-deploy, bukan ke localhost.

## ✅ Solusi Otomatis (AUTO-DETECTION)

**Aplikasi sekarang otomatis mendeteksi environment!**

- 🔧 **Localhost** → OAuth redirect ke `http://localhost:3000/auth/callback`
- 🚀 **Production** → OAuth redirect ke production URL

**Tidak perlu konfigurasi tambahan!** Cukup:

1. **Tambahkan localhost ke Supabase Dashboard** (satu kali saja):
   - Buka Supabase Dashboard → Authentication → URL Configuration
   - Tambahkan ke **Redirect URLs**:
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000/**
     ```
   - Save dan tunggu 2-3 menit

2. **Jalankan development server**:
   ```bash
   npm run dev
   ```

3. **Test login** - OAuth akan otomatis redirect ke localhost! ✅

## Solusi Manual (Jika Auto-Detection Tidak Bekerja)

### Opsi 1: Menggunakan Environment Variable

1. **Buat file `.env.local`** di root project:
   ```bash
   # Copy dari env.example.txt
   cp env.example.txt .env.local
   ```

2. **Tambahkan konfigurasi berikut** di `.env.local`:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # OAuth Redirect URL untuk localhost
   NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
   ```

3. **Restart development server**:
   ```bash
   npm run dev
   ```

4. **Test login** - Sekarang OAuth akan redirect ke localhost

### Opsi 2: Konfigurasi Supabase Dashboard

Jika Opsi 1 tidak bekerja, Anda perlu menambahkan localhost ke Supabase Dashboard:

1. **Buka Supabase Dashboard** → Project → Authentication → URL Configuration

2. **Tambahkan Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```

3. **Tambahkan Site URL** (jika perlu):
   ```
   http://localhost:3000
   ```

4. **Save changes** dan tunggu beberapa menit untuk propagasi

### Opsi 3: Temporary Workaround (Tanpa OAuth)

Jika masih tidak bisa, gunakan email/password login untuk testing:

1. Login menggunakan email dan password (bukan OAuth)
2. Ini akan langsung bekerja di localhost tanpa perlu konfigurasi tambahan

## Cara Kerja

### Auto-Detection Logic:
```typescript
// Deteksi environment otomatis
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

if (isLocalhost) {
  // 🔧 Development: Paksa redirect ke localhost
  redirectUrl = `${window.location.origin}/auth/callback`;
  // Result: http://localhost:3000/auth/callback
} else {
  // 🚀 Production: Gunakan production URL
  redirectUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL 
    || `${window.location.origin}/auth/callback`;
  // Result: https://yourdomain.com/auth/callback
}
```

### Keuntungan:
- ✅ **Zero Configuration**: Tidak perlu `.env.local` untuk localhost
- ✅ **Production Safe**: Production tetap menggunakan URL yang benar
- ✅ **Auto Switch**: Otomatis switch berdasarkan hostname
- ✅ **No Code Change**: Tidak perlu ubah kode saat deploy

## Testing

1. **Cek redirect URL di console**:
   - Buka browser console
   - Klik login dengan Google/GitHub
   - Lihat log: `Google OAuth redirect URL: http://localhost:3000/auth/callback`

2. **Verify redirect**:
   - Setelah OAuth success, harus redirect ke `http://localhost:3000/auth/callback`
   - Bukan ke production URL

## Troubleshooting

### Masih redirect ke production?

**Kemungkinan penyebab:**
1. `.env.local` belum dibuat atau salah format
2. Development server belum di-restart setelah buat `.env.local`
3. Supabase Dashboard belum dikonfigurasi untuk localhost

**Solusi:**
```bash
# 1. Pastikan .env.local ada dan benar
cat .env.local

# 2. Restart server
# Stop server (Ctrl+C)
npm run dev

# 3. Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)
```

### OAuth error "redirect_uri_mismatch"?

**Penyebab:** Supabase Dashboard belum dikonfigurasi untuk localhost

**Solusi:**
1. Buka Supabase Dashboard
2. Authentication → URL Configuration
3. Tambahkan `http://localhost:3000/auth/callback` ke Redirect URLs
4. Save dan tunggu 2-3 menit

### Email/Password login tidak bekerja?

**Solusi:** Email/password login tidak terpengaruh oleh redirect URL, jadi seharusnya selalu bekerja di localhost.

## Production Deployment

Ketika deploy ke production:

1. **Hapus atau comment** `NEXT_PUBLIC_AUTH_REDIRECT_URL` dari environment variables
2. Atau **set ke production URL**:
   ```env
   NEXT_PUBLIC_AUTH_REDIRECT_URL=https://yourdomain.com/auth/callback
   ```

3. **Update Supabase Dashboard** dengan production URL:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/auth/callback`

## Notes

- File `.env.local` sudah ada di `.gitignore`, jadi tidak akan ter-commit
- Environment variable `NEXT_PUBLIC_*` bisa diakses di browser
- Perubahan `.env.local` memerlukan restart development server
- Untuk production, gunakan environment variables dari hosting platform (Vercel, Netlify, dll)

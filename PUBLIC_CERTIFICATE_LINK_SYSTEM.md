# Public Certificate Link System - Implementation Guide

## 📋 Overview

Sistem **Public Certificate Link** memungkinkan siapa saja (termasuk yang belum login) untuk melihat sertifikat melalui URL permanen seperti:

```
https://sertifikat.ubig.co.id/cek/{public_id}
```

Contoh:
```
https://sertifikat.ubig.co.id/cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
```

## ✅ Fitur yang Diimplementasikan

### 1. **Database Schema**
- ✅ Field `public_id` (TEXT, UNIQUE) - UUID v4 identifier
- ✅ Field `is_public` (BOOLEAN, DEFAULT TRUE) - Public visibility flag
- ✅ Field `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Timestamp
- ✅ Index untuk performa query cepat
- ✅ RLS Policy untuk akses public

### 2. **Backend Functions**
- ✅ `generatePublicId()` - Generate UUID v4 untuk public_id
- ✅ `getCertificateByPublicId()` - Query certificate by public_id
- ✅ Auto-generate public_id saat create certificate
- ✅ Set `is_public = true` by default

### 3. **Public Route**
- ✅ Route `/cek/[public_id]` untuk public view
- ✅ Accessible tanpa authentication
- ✅ Display certificate details lengkap
- ✅ Buttons: Download PDF, Copy Link, Share
- ✅ 404 page untuk certificate not found

### 4. **UI Integration**
- ✅ Update "Generate Certificate Link" di certificates page
- ✅ Update "Generate Certificate Link" di home search modal
- ✅ Link menggunakan format `/cek/{public_id}`
- ✅ Toast notification dengan link yang di-copy

## 🚀 Cara Deploy

### Step 1: Run Database Migration

1. Buka **Supabase Dashboard**
2. Navigasi ke **SQL Editor**
3. Copy isi file `migrations/001_add_public_certificate_link.sql`
4. Paste dan klik **Run**

### Step 2: Verify Migration

Jalankan query berikut untuk verifikasi:

```sql
-- Check new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'certificates' 
AND column_name IN ('public_id', 'is_public', 'created_at');

-- Check all certificates have public_id
SELECT COUNT(*) as total, 
       COUNT(public_id) as with_public_id
FROM certificates;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'certificates';
```

### Step 3: Deploy Application

```bash
# Build and deploy
npm run build
npm run start

# Or deploy to your hosting platform
```

### Step 4: Test Public Access

1. Create a new certificate (akan auto-generate public_id)
2. Click "Generate Certificate Link" button
3. Copy link yang muncul (format: `/cek/{public_id}`)
4. Open link di incognito/private window
5. Certificate details harus muncul tanpa login

## 📖 How It Works

### Certificate Creation Flow

```
1. User creates certificate
   ↓
2. System generates UUID v4 as public_id
   ↓
3. Save to database with is_public = true
   ↓
4. Public link ready: /cek/{public_id}
```

### Public Access Flow

```
1. Anyone opens /cek/{public_id}
   ↓
2. Query Supabase (anon role)
   ↓
3. RLS checks: is_public = true?
   ↓
4. If YES: Show certificate details
   If NO: Show 404 page
```

## 🔐 Security & RLS Policies

### Public Read Access

```sql
CREATE POLICY "Public users can read public certificates"
ON certificates
FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);
```

**Artinya:**
- ✅ Anonymous users dapat READ certificates yang `is_public = true`
- ✅ Authenticated users juga dapat READ
- ❌ Anonymous users TIDAK dapat INSERT/UPDATE/DELETE

### Authenticated Write Access

```sql
-- Only authenticated users can write
CREATE POLICY "Authenticated users can insert certificates"
ON certificates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update certificates"
ON certificates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete certificates"
ON certificates FOR DELETE TO authenticated USING (true);
```

## 🎯 Use Cases

### 1. Share Certificate to Recipient

Admin/Team dapat:
1. Create certificate untuk member
2. Click "Generate Certificate Link"
3. Send link via email/WhatsApp/etc
4. Recipient buka link tanpa perlu login

### 2. Verify Certificate Authenticity

Siapa saja dapat:
1. Receive certificate link
2. Open link di browser
3. Verify certificate details
4. Download PDF jika diperlukan

### 3. Social Media Sharing

Certificate holder dapat:
1. Open public certificate link
2. Click "Share" button
3. Share ke social media (LinkedIn, Twitter, etc)

## 🛠️ Technical Details

### Database Fields

| Field | Type | Description |
|-------|------|-------------|
| `public_id` | TEXT | UUID v4, unique identifier for public link |
| `is_public` | BOOLEAN | Visibility flag (default: TRUE) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### API Functions

```typescript
// Generate unique public_id
generatePublicId(): string

// Get certificate by public_id (public access)
getCertificateByPublicId(public_id: string): Promise<Certificate | null>

// Get certificate by number (backward compatibility)
getCertificateByNumber(certificate_no: string): Promise<Certificate | null>
```

### Route Structure

```
/cek/[public_id]
  ├── page.tsx (Public certificate view)
  ├── Loading state
  ├── Not found state
  └── Success state with certificate details
```

## 📊 Features on Public Page

### Certificate Information Displayed

- ✅ Certificate Number
- ✅ Recipient Name
- ✅ Organization (if available)
- ✅ Category
- ✅ Issue Date
- ✅ Expiry Date (if available)
- ✅ Description (if available)
- ✅ Certificate Image/Preview

### Action Buttons

1. **Download PDF**
   - Export certificate as PDF file
   - Uses existing PDF generation logic
   - No authentication required

2. **Copy Link**
   - Copy public link to clipboard
   - Format: `/cek/{public_id}`
   - Toast notification on success

3. **Share**
   - Native share API (mobile)
   - Fallback to copy link (desktop)
   - Share to social media, email, etc

## 🔄 Backward Compatibility

### Old System vs New System

| Feature | Old System | New System |
|---------|-----------|------------|
| Link Format | `/certificate/{certificate_no}` | `/cek/{public_id}` |
| Identifier | Certificate Number | UUID v4 |
| Security | Predictable | Random UUID |
| Access | May require auth | Public by default |

### Migration Notes

- ✅ Existing certificates akan auto-generate `public_id`
- ✅ Old link format masih berfungsi (via `certificate_no`)
- ✅ New certificates otomatis dapat `public_id`
- ✅ Tidak ada breaking changes

## 🐛 Troubleshooting

### Issue: "Certificate does not have a public link ID"

**Cause:** Certificate dibuat sebelum migration
**Solution:** 
```sql
-- Regenerate public_id for old certificates
UPDATE certificates 
SET public_id = gen_random_uuid()::text 
WHERE public_id IS NULL;
```

### Issue: "Certificate not found" padahal ada

**Cause:** `is_public = false` atau RLS policy belum aktif
**Solution:**
```sql
-- Check certificate visibility
SELECT certificate_no, public_id, is_public 
FROM certificates 
WHERE public_id = 'your-public-id';

-- Make certificate public
UPDATE certificates 
SET is_public = true 
WHERE public_id = 'your-public-id';
```

### Issue: "Permission denied" saat akses public

**Cause:** RLS policy belum diterapkan
**Solution:** Jalankan ulang migration script

## 📝 Best Practices

### 1. Always Use Public Link for Sharing

❌ **Don't:**
```
Share: /certificate/CERT-2024-001
```

✅ **Do:**
```
Share: /cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
```

### 2. Check is_public Before Sharing

```typescript
if (certificate.is_public) {
  // Safe to share public link
  sharePublicLink(certificate.public_id);
} else {
  // Certificate is private
  showPrivateWarning();
}
```

### 3. Handle Missing public_id Gracefully

```typescript
if (!certificate.public_id) {
  toast.error('Certificate does not have a public link');
  return;
}
```

## 🎉 Summary

### What Changed

1. ✅ Added `public_id`, `is_public`, `created_at` fields
2. ✅ Created `/cek/[public_id]` public route
3. ✅ Updated certificate link generation
4. ✅ Implemented RLS policies for public access
5. ✅ Auto-generate public_id on certificate creation

### What Stayed the Same

1. ✅ PDF download functionality
2. ✅ Certificate CRUD operations
3. ✅ Admin/Team permissions
4. ✅ Email sending feature
5. ✅ Certificate search on home

### Next Steps

1. Run database migration
2. Deploy application
3. Test public link access
4. Share certificates with recipients
5. Monitor usage and feedback

---

**Created:** 21 Oktober 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Production

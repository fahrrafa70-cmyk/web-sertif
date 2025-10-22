# 🔍 Certificate Search Functionality

## Overview

Search di landing page sekarang mendukung **3 format pencarian**:

## ✅ Format yang Didukung

### 1. Certificate Number (Original)
```
CERT-2024-001
```
**Cara kerja:** Langsung search di database berdasarkan `certificate_no`

### 2. Old Certificate Link
```
/certificate/CERT-2024-001
https://sertifikat.ubig.co.id/certificate/CERT-2024-001
```
**Cara kerja:** Extract `CERT-2024-001` dari URL, lalu search berdasarkan `certificate_no`

### 3. New Public Link (UUID)
```
/cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
https://sertifikat.ubig.co.id/cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
```
**Cara kerja:** Extract UUID dari URL, lalu search berdasarkan `public_id`

## 🎯 Contoh Penggunaan

### User paste full URL
```
Input: https://sertifikat.ubig.co.id/cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
Result: ✅ Certificate found (search by public_id)
```

### User paste partial URL
```
Input: /cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
Result: ✅ Certificate found (search by public_id)
```

### User paste UUID only
```
Input: 9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a
Result: ✅ Certificate found (detected as UUID, search by public_id)
```

### User type certificate number
```
Input: CERT-2024-001
Result: ✅ Certificate found (search by certificate_no)
```

## 🔧 Technical Implementation

### Regex Pattern untuk Public Link
```typescript
const publicLinkMatch = q.match(/(?:\/cek\/|cek\/)([a-f0-9-]{36})/i);
```
**Matches:**
- `/cek/uuid`
- `cek/uuid`
- Full URL dengan `/cek/uuid`

### Regex Pattern untuk UUID (36 characters)
```typescript
/[a-f0-9-]{36}/i
```
**Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Search Logic Flow
```
1. User input → trim whitespace
2. Check if input matches /cek/{uuid} format
   ├─ YES → Extract UUID → getCertificateByPublicId()
   └─ NO → Check if old /certificate/{cert_no} format
       ├─ YES → Extract cert_no → getCertificateByNumber()
       └─ NO → Use input as-is → getCertificateByNumber()
3. Display result or show "not found"
```

## 📊 Supported Input Examples

| Input | Detected As | Search Method |
|-------|-------------|---------------|
| `CERT-2024-001` | Certificate Number | `getCertificateByNumber()` |
| `/certificate/CERT-2024-001` | Old Link | `getCertificateByNumber()` |
| `https://domain.com/certificate/CERT-2024-001` | Old Link | `getCertificateByNumber()` |
| `/cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a` | Public Link | `getCertificateByPublicId()` |
| `https://domain.com/cek/9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a` | Public Link | `getCertificateByPublicId()` |
| `9e8a1a42-f5b1-4b0b-9c41-89b33b9d3f1a` | UUID | `getCertificateByPublicId()` |

## 🚀 Benefits

1. ✅ **User-friendly** - Users can paste any format
2. ✅ **Backward compatible** - Old links still work
3. ✅ **Flexible** - Supports full URL or just identifier
4. ✅ **Smart detection** - Auto-detect format
5. ✅ **No confusion** - Works with both old and new system

## 🔐 Security Note

- Public link search uses `getCertificateByPublicId()` which checks `is_public = true`
- Private certificates won't appear in search results
- RLS policies enforce access control

---

**Updated:** 22 Oktober 2025  
**Version:** 1.1  
**Status:** ✅ Production Ready

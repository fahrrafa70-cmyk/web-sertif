# DEBUG GUIDE: FITUR DELETE SERTIFIKAT TIDAK BERFUNGSI

## 🔍 **LANGKAH DEBUGGING:**

### **1. ✅ Cek Console Browser**
Buka Developer Tools (F12) dan lihat tab Console saat mencoba delete:

**Log yang harus muncul:**
```
🔍 Checking role from localStorage: Admin
✅ Role set to: Admin
🗑️ Delete request initiated: {id: "xxx", role: "Admin", canDelete: true}
📋 Certificate to delete: {id: "xxx", name: "John Doe", certificate_no: "CERT-001"}
✅ User confirmed deletion, starting delete process...
🗑️ Starting certificate deletion process... {certificateId: "xxx"}
📋 Certificate found: {certificate_no: "CERT-001", name: "John Doe"}
🔐 Current session: {hasSession: true, userId: "xxx", email: "admin@example.com"}
🗃️ Deleting certificate from database...
✅ Certificate deleted successfully from database
✅ Delete successful!
```

**Jika ada error, akan muncul:**
```
❌ Database deletion error: {code: "42501", message: "new row violates row-level security policy"}
```

### **2. ✅ Jalankan Script Database**
Jalankan script berikut di Supabase SQL Editor:

**Option A: Simple Fix (Recommended)**
```sql
-- File: database/simple_rls_fix.sql
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
-- Test delete
-- Re-enable with simple policy
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_all_operations" ON certificates
    FOR ALL USING (auth.role() = 'authenticated');
```

**Option B: Test RLS Policies**
```sql
-- File: database/test_certificates_rls.sql
SELECT COUNT(*) FROM certificates; -- Should work
SELECT auth.uid(), auth.role(); -- Should show user info
```

### **3. ✅ Cek Role di LocalStorage**
Di Console browser, jalankan:
```javascript
console.log("Role:", localStorage.getItem("ecert-role"));
console.log("All localStorage:", localStorage);
```

### **4. ✅ Cek Session Supabase**
Di Console browser, jalankan:
```javascript
// Cek session
supabase.auth.getSession().then(console.log);

// Cek user
supabase.auth.getUser().then(console.log);
```

## 🚨 **KEMUNGKINAN MASALAH:**

### **Masalah 1: RLS Policy Salah**
**Gejala:** Error "new row violates row-level security policy"
**Solusi:** Jalankan `database/simple_rls_fix.sql`

### **Masalah 2: Role Tidak Sesuai**
**Gejala:** `canDelete: false` di console
**Solusi:** Pastikan localStorage berisi "Admin"

### **Masalah 3: Session Tidak Aktif**
**Gejala:** `hasSession: false` di console
**Solusi:** Login ulang ke aplikasi

### **Masalah 4: Database Connection**
**Gejala:** Error connection atau timeout
**Solusi:** Cek koneksi internet dan Supabase status

## 🔧 **SOLUSI BERDASARKAN ERROR:**

### **Error: "new row violates row-level security policy"**
```sql
-- Jalankan di Supabase SQL Editor
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
-- Test delete
-- Jika berhasil, re-enable dengan policy yang benar
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_all_operations" ON certificates
    FOR ALL USING (auth.role() = 'authenticated');
```

### **Error: "No active session"**
1. Login ulang ke aplikasi
2. Cek apakah cookie/session tersimpan
3. Cek apakah Supabase auth berfungsi

### **Error: "Certificate not found"**
1. Cek apakah certificate ID benar
2. Cek apakah certificate ada di database
3. Cek apakah user bisa read certificates

## 📝 **CHECKLIST DEBUGGING:**

- [ ] Console browser tidak ada error JavaScript
- [ ] Role di localStorage = "Admin"
- [ ] Session Supabase aktif
- [ ] RLS policy sudah diperbaiki
- [ ] Database connection normal
- [ ] Certificate ID valid
- [ ] User sudah login

## 🎯 **TEST MANUAL:**

1. **Login sebagai Admin**
2. **Buka halaman /certificates**
3. **Buka Developer Tools (F12)**
4. **Klik tombol Delete pada sertifikat**
5. **Lihat console untuk log debugging**
6. **Konfirmasi delete**
7. **Cek apakah sertifikat hilang dari tabel**

**Jika masih tidak berfungsi, kirimkan log console dan error message yang muncul!**


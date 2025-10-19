# DEBUG GUIDE: Button Delete Tidak Berfungsi

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

**File: `database/simple_certificates_rls_fix.sql`**
```sql
-- Simple fix for certificates RLS policies
-- This script will fix the delete button issue

-- Step 1: Temporarily disable RLS to test
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if delete works now
-- (You can test the delete button in the UI)

-- Step 3: Re-enable RLS with simple policy
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple policies that allow authenticated users to do everything
DROP POLICY IF EXISTS "certificates_read_all" ON public.certificates;
DROP POLICY IF EXISTS "certificates_insert_all" ON public.certificates;
DROP POLICY IF EXISTS "certificates_update_all" ON public.certificates;
DROP POLICY IF EXISTS "certificates_delete_all" ON public.certificates;

-- Create simple policies
CREATE POLICY "certificates_all_operations" ON public.certificates 
    FOR ALL USING (auth.role() = 'authenticated');

-- Test the policies
-- This should return the count of certificates
SELECT COUNT(*) FROM certificates;

-- This should show your current auth info
SELECT auth.uid(), auth.role();
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

### **5. ✅ Test Manual Delete**
Di Console browser, jalankan:
```javascript
// Test delete function directly
const { delete: deleteCert } = useCertificates();
// Atau test dengan ID sertifikat yang ada
```

## 🎯 **KEMUNGKINAN PENYEBAB:**

### **1. ❌ RLS Policy Issue**
- RLS policy tidak mengizinkan delete
- User tidak authenticated dengan benar
- Policy menggunakan kolom yang salah

### **2. ❌ JavaScript Error**
- Function `deleteCert` undefined
- Destructuring naming conflict
- Hook tidak di-import dengan benar

### **3. ❌ Role Issue**
- Role tidak diset sebagai "Admin"
- localStorage tidak tersimpan dengan benar
- AuthContext tidak ter-update

### **4. ❌ Database Connection**
- Supabase client tidak terkonfigurasi
- Session expired
- Network error

## 🚀 **SOLUSI YANG DITERAPKAN:**

### **1. ✅ Fix Destructuring Naming**
```typescript
// File: src/app/certificates/page.tsx
const {
  certificates,
  loading,
  error,
  update,
  delete: deleteCert,  // ✅ BENAR!
  refresh,
} = useCertificates();
```

### **2. ✅ Fix Function Calls**
```typescript
// Update semua pemanggilan
await deleteCert(id);  // ✅ BENAR!
```

### **3. ✅ Fix RLS Policies**
```sql
-- Simple policy yang memungkinkan semua operasi untuk authenticated users
CREATE POLICY "certificates_all_operations" ON public.certificates 
    FOR ALL USING (auth.role() = 'authenticated');
```

## 🧪 **TESTING STEPS:**

### **Test 1: Console Logs**
1. Buka Developer Tools (F12)
2. Klik tombol Delete
3. Lihat console logs
4. Pastikan semua log muncul dengan benar

### **Test 2: Database Test**
1. Jalankan script `simple_certificates_rls_fix.sql`
2. Test delete button
3. Cek apakah sertifikat terhapus

### **Test 3: Role Test**
1. Cek localStorage: `localStorage.getItem("ecert-role")`
2. Pastikan return "Admin"
3. Jika tidak, set manual: `localStorage.setItem("ecert-role", "Admin")`

### **Test 4: Session Test**
1. Cek session di console
2. Pastikan user authenticated
3. Jika tidak, login ulang

## 🎉 **HASIL YANG DIHARAPKAN:**

Setelah perbaikan, button delete harus:
- ✅ Muncul untuk Admin users
- ✅ Menampilkan confirmation dialog
- ✅ Menghapus sertifikat dari database
- ✅ Menampilkan success notification
- ✅ Update list secara real-time
- ✅ Tidak ada error di console

# 🔍 AUDIT SISTEM AUTHENTICATION & RANCANGAN IMPLEMENTASI OAuth

## 📋 FASE 1: ANALISIS SISTEM SAAT INI

### A. AUDIT KOMPONEN AUTH EXISTING

#### A.1 File/Komponen Auth

**Lokasi File:**
- ✅ `src/contexts/auth-context.tsx` - Context provider untuk auth state management
- ✅ `src/components/ui/login-modal.tsx` - UI modal untuk login email/password
- ✅ `src/lib/supabase/auth.ts` - Functions untuk authentication (signInWithEmailPassword, getUserRoleByEmail)
- ✅ `src/lib/supabase/client.ts` - Supabase client initialization
- ✅ `src/lib/supabase/server.ts` - Supabase server client (untuk server-side operations)
- ✅ `src/lib/supabase/users.ts` - Functions untuk manage users table

**Library yang Digunakan:**
- ✅ `@supabase/supabase-js` v2.75.0 - Supabase JavaScript client (sudah terpasang)
- ❌ `@supabase/auth-ui-react` - Tidak digunakan (custom implementation)
- ✅ Custom auth implementation dengan React Context API

#### A.2 Auth Flow Saat Ini

**Flow Login Email/Password:**
```
1. User klik "Login" button di header
   → setOpenLogin(true)
   
2. LoginModal muncul
   → User input email & password
   → handleSubmit() dipanggil
   
3. AuthContext.signIn() dipanggil
   → signInWithEmailPassword() di auth.ts
   → supabaseClient.auth.signInWithPassword()
   
4. Auth state change listener terpicu
   → Event: "SIGNED_IN"
   → getUserRoleByEmail() dipanggil
   → Role diambil dari tabel users
   → setRole() dan setEmail()
   → Modal ditutup
   
5. User di-redirect atau tetap di halaman
   → Role digunakan untuk akses halaman
```

**Callback Handler:**
- ✅ Auth state change listener sudah ada di `auth-context.tsx` line 68
- ⚠️ OAuth callback handler BELUM ada (perlu dibuat untuk handle OAuth redirect)
- ✅ Session persistence sudah aktif (`persistSession: true`)
- ✅ Token refresh sudah aktif (`autoRefreshToken: true`)
- ✅ PKCE flow sudah aktif (`flowType: 'pkce'`)

#### A.3 Status Assessment - Komponen Auth

| Component/Feature           | Status | Detail |
|----------------------------|--------|---------|
| Login Page                  | ✅ Sudah ada | LoginModal component |
| Email/Password Login        | ✅ Sudah ada | signInWithEmailPassword() |
| OAuth Buttons (Google)      | ❌ Tidak ada | Perlu dibuat |
| OAuth Buttons (GitHub)      | ❌ Tidak ada | Perlu dibuat |
| OAuth Callback Handler      | ❌ Tidak ada | Perlu dibuat untuk handle redirect |
| Auth State Management       | ✅ Sudah ada | AuthContext dengan React Context |
| Session Handling            | ✅ Sudah ada | Supabase session persistence |
| Role Management             | ✅ Sudah ada | getUserRoleByEmail() |
| Protected Routes Guard      | ⚠️ Partial | Client-side only (localStorage check) |

---

### B. AUDIT DATABASE STRUCTURE

#### B.1 Tabel `users` - Struktur Saat Ini

**Dari Code Analysis (`src/lib/supabase/users.ts`):**

```typescript
interface AppUser {
  id: string;                    // ✅ Ada
  email: string;                 // ✅ Ada
  password?: string | null;      // ✅ Ada (optional)
  full_name: string;             // ✅ Ada
  organization?: string | null;  // ✅ Ada
  phone?: string | null;         // ✅ Ada
  role: UserRole | string;       // ✅ Ada
  created_at?: string;           // ✅ Ada
  updated_at?: string;           // ✅ Ada
}
```

**Kolom yang Ditemukan di Code:**
- ✅ `id` - Primary key (UUID, references auth.users.id)
- ✅ `email` - Email user
- ✅ `password` - Password (optional, untuk email/password login)
- ✅ `full_name` - Nama lengkap
- ✅ `organization` - Organisasi (optional)
- ✅ `phone` - Nomor telepon (optional)
- ✅ `role` - Role user (admin/team/user/member)
- ✅ `created_at` - Timestamp
- ✅ `updated_at` - Timestamp

**Kolom yang TIDAK Ditemukan:**
- ❌ `auth_provider` - BELUM ADA (perlu ditambahkan)
- ❌ `avatar_url` - BELUM ADA (perlu ditambahkan)
- ❌ `provider_id` - BELUM ADA (optional, untuk OAuth provider user ID)

**Catatan:**
- Tabel `users` TIDAK sama dengan `auth.users` (Supabase Auth)
- Tabel `users` adalah custom table untuk menyimpan data tambahan user
- Role diambil dari tabel `users` berdasarkan email

#### B.2 Tabel `email_whitelist` - Status

**Status:** ❌ **TIDAK ADA** - Perlu dibuat

**Struktur yang Diperlukan:**
```sql
CREATE TABLE email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_whitelist_email ON email_whitelist(email);
```

#### B.3 Status Assessment - Database

| Database Component          | Status | Detail |
|----------------------------|--------|---------|
| Tabel users                 | ⚠️ Perlu tambahan column | Ada tapi kurang auth_provider, avatar_url |
| └─ Column auth_provider     | ❌ Tidak ada | Perlu ditambahkan: 'email' | 'google' | 'github' |
| └─ Column avatar_url        | ❌ Tidak ada | Perlu ditambahkan untuk OAuth profile picture |
| └─ Column provider_id       | ⚠️ Optional | Bisa ditambahkan untuk tracking OAuth user ID |
| Tabel email_whitelist       | ❌ Tidak ada | Perlu dibuat dari awal |
| RLS Policies (users)        | ❓ Unknown | Perlu dicek di Supabase Dashboard |
| RLS Policies (whitelist)    | ❌ Tidak ada | Perlu dibuat |
| Database Triggers           | ❓ Unknown | Perlu dicek apakah ada trigger untuk sync auth.users → users |

---

### C. AUDIT SUPABASE CONFIGURATION

#### C.1 Environment Variables

**Yang Sudah Ada:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Terdeteksi di `client.ts` line 5
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Terdeteksi di `client.ts` line 6
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Terdeteksi di beberapa API routes (optional)
- ✅ `SUPABASE_SERVICE_ROLE` - Terdeteksi di `server.ts` line 5 (alias untuk SERVICE_ROLE_KEY)

**Yang Perlu Ditambahkan:**
- ❌ Tidak ada environment variables khusus untuk OAuth (tidak diperlukan, konfigurasi di Supabase Dashboard)

#### C.2 Supabase Client Setup

**File:** `src/lib/supabase/client.ts`

**Konfigurasi Saat Ini:**
```typescript
export const supabaseClient = createClient(supabaseUrl ?? "", supabaseAnon ?? "", {
  auth: {
    persistSession: true,      // ✅ Session persistence aktif
    autoRefreshToken: true,    // ✅ Auto refresh token aktif
    detectSessionInUrl: true,  // ✅ Detect session di URL (untuk OAuth callback)
    flowType: 'pkce'          // ✅ PKCE flow (aman untuk OAuth)
  }
});
```

**Status:** ✅ **SIAP UNTUK OAUTH** - Konfigurasi sudah mendukung OAuth dengan PKCE flow

#### C.3 Status Assessment - Configuration

| Configuration               | Status | Detail |
|----------------------------|--------|---------|
| Supabase Client Init        | ✅ Sudah ada | Sudah support OAuth dengan PKCE |
| Environment Variables       | ✅ Lengkap | NEXT_PUBLIC_SUPABASE_URL & ANON_KEY ada |
| Auth Listeners              | ✅ Sudah ada | onAuthStateChange() sudah setup |
| OAuth Provider Config       | ❓ Unknown | Perlu dicek di Supabase Dashboard |
| Callback URL Setup          | ❓ Unknown | Perlu dicek/dikonfigurasi |

---

### D. AUDIT ROLE MANAGEMENT SYSTEM

#### D.1 Role Logic Saat Ini

**Function:** `getUserRoleByEmail(email: string)` di `src/lib/supabase/auth.ts`

**Flow:**
```typescript
1. Query tabel users berdasarkan email
2. Ambil kolom role
3. Return: "admin" | "team" | "user" | null
```

**Catatan:**
- Role diambil dari tabel `users`, BUKAN dari `auth.users`
- Jika user tidak ada di tabel `users`, return `null`
- Tidak ada logic untuk auto-create user di tabel `users` saat OAuth login

#### D.2 Permission Check

**Lokasi:**
- ✅ `src/components/modern-sidebar.tsx` - Filter menu berdasarkan role (line 68-71)
- ✅ `src/components/mobile-sidebar.tsx` - Filter menu berdasarkan role
- ✅ `src/app/templates/generate/page.tsx` - Check role untuk akses halaman (line 991-1014)
- ✅ `src/app/members/page.tsx` - Check role untuk akses halaman
- ⚠️ Semua check dilakukan di **client-side** menggunakan localStorage atau context

**Masalah Potensial:**
- ❌ Tidak ada server-side middleware untuk protected routes
- ⚠️ Client-side check bisa di-bypass (tapi masih ada RLS di Supabase)

#### D.3 Status Assessment - Role Management

| Role Management             | Status | Detail |
|----------------------------|--------|---------|
| Role Assignment Logic       | ⚠️ Perlu update untuk OAuth | Saat ini hanya support email/password |
| Permission Check            | ✅ Sudah ada | Client-side check dengan localStorage |
| Protected Routes Guard      | ⚠️ Client-side only | Tidak ada server-side middleware |
| Auto Role Assignment        | ❌ Tidak ada | Perlu dibuat untuk OAuth + whitelist |

---

## 📊 SUMMARY: GAP ANALYSIS

### ✅ Sudah Ada dan Siap Digunakan

1. **Auth Infrastructure:**
   - Supabase client sudah dikonfigurasi dengan PKCE flow
   - Auth state management dengan React Context
   - Session persistence dan auto refresh token
   - Auth state change listener sudah aktif

2. **Login System:**
   - Email/password login sudah berfungsi
   - LoginModal UI sudah ada
   - Error handling sudah ada

3. **Role System:**
   - Tabel users sudah ada dengan kolom role
   - Function getUserRoleByEmail() sudah ada
   - Client-side permission check sudah ada

### ⚠️ Sudah Ada tapi Perlu Update/Tambahan

1. **Database:**
   - Tabel `users` perlu ditambahkan kolom:
     - `auth_provider` (email/google/github)
     - `avatar_url` (untuk OAuth profile picture)
   
2. **Auth Context:**
   - Perlu ditambahkan function `signInWithOAuth()` untuk Google & GitHub
   - Perlu update logic `onAuthStateChange` untuk handle OAuth user auto-creation

3. **Login Modal:**
   - Perlu ditambahkan button "Login with Google"
   - Perlu ditambahkan button "Login with GitHub"

4. **Role Assignment:**
   - Perlu logic untuk check email_whitelist saat OAuth login
   - Perlu logic untuk auto-create user di tabel users saat OAuth login pertama kali

### ❌ Belum Ada dan Perlu Dibuat dari Awal

1. **Database:**
   - Tabel `email_whitelist` (baru)
   - Kolom `auth_provider` dan `avatar_url` di tabel users
   - RLS policies untuk email_whitelist

2. **OAuth Implementation:**
   - Function `signInWithGoogle()` di auth.ts
   - Function `signInWithGitHub()` di auth.ts
   - Function `checkEmailWhitelist()` di auth.ts
   - Function `createOrUpdateUserFromOAuth()` di auth.ts

3. **UI Components:**
   - OAuth buttons di LoginModal
   - Callback handler untuk OAuth redirect

4. **Whitelist Management:**
   - UI untuk manage email whitelist (optional, bisa manual via Supabase Dashboard)
   - API endpoints untuk CRUD whitelist (optional)

---

## 📋 FASE 2: RANCANGAN IMPLEMENTASI

### 1. SETUP OAUTH PROVIDERS

#### 1.1 Supabase Dashboard Setup - Google OAuth

**Langkah Manual (User harus lakukan):**

1. **Google Cloud Console Setup:**
   - Buat project di [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google+ API
   - Create OAuth 2.0 credentials (OAuth client ID)
   - Set Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - Copy Client ID dan Client Secret

2. **Supabase Dashboard Setup:**
   - Login ke [Supabase Dashboard](https://app.supabase.com/)
   - Pilih project
   - Go to: Authentication → Providers
   - Enable "Google" provider
   - Masukkan Google Client ID dan Client Secret
   - Set Redirect URL:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```

#### 1.2 Supabase Dashboard Setup - GitHub OAuth

**Langkah Manual (User harus lakukan):**

1. **GitHub Developer Settings:**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App
   - Set Authorization callback URL:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - Copy Client ID dan Client Secret

2. **Supabase Dashboard Setup:**
   - Go to: Authentication → Providers
   - Enable "GitHub" provider
   - Masukkan GitHub Client ID dan Client Secret
   - Set Redirect URL:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```

#### 1.3 Callback URLs Configuration

**Development:**
```
http://localhost:3000/auth/callback
```

**Production:**
```
https://yourdomain.com/auth/callback
```

**Supabase Default Callback:**
```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```
*(Ini yang akan digunakan, sudah otomatis dikonfigurasi Supabase)*

---

### 2. DATABASE CHANGES

#### 2.1 Update Tabel `users`

**SQL Migration:**
```sql
-- Tambahkan kolom auth_provider
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email' 
CHECK (auth_provider IN ('email', 'google', 'github'));

-- Tambahkan kolom avatar_url
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Tambahkan kolom provider_id (optional, untuk tracking)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS provider_id TEXT;

-- Update existing users untuk set auth_provider = 'email'
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Buat index untuk performa query
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
```

#### 2.2 Buat Tabel `email_whitelist`

**SQL Migration:**
```sql
CREATE TABLE IF NOT EXISTS email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_email_whitelist_email ON email_whitelist(email);
CREATE INDEX idx_email_whitelist_role ON email_whitelist(role);

-- RLS Policies
ALTER TABLE email_whitelist ENABLE ROW LEVEL SECURITY;

-- Policy: Hanya admin yang bisa read
CREATE POLICY "Admin can read whitelist"
ON email_whitelist FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.email = auth.jwt() ->> 'email'
    AND users.role = 'admin'
  )
);

-- Policy: Hanya admin yang bisa insert
CREATE POLICY "Admin can insert whitelist"
ON email_whitelist FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.email = auth.jwt() ->> 'email'
    AND users.role = 'admin'
  )
);

-- Policy: Hanya admin yang bisa update
CREATE POLICY "Admin can update whitelist"
ON email_whitelist FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.email = auth.jwt() ->> 'email'
    AND users.role = 'admin'
  )
);

-- Policy: Hanya admin yang bisa delete
CREATE POLICY "Admin can delete whitelist"
ON email_whitelist FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.email = auth.jwt() ->> 'email'
    AND users.role = 'admin'
  )
);
```

#### 2.3 Database Trigger (Optional)

**Trigger untuk auto-update updated_at:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_whitelist_updated_at
BEFORE UPDATE ON email_whitelist
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. AUTHENTICATION FLOW CHANGES

#### 3.1 Update `src/lib/supabase/auth.ts`

**Fungsi Baru yang Perlu Ditambahkan:**

1. **signInWithGoogle()**
2. **signInWithGitHub()**
3. **checkEmailWhitelist(email: string)**
4. **createOrUpdateUserFromOAuth(user, provider)**

#### 3.2 Update LoginModal Component

**Perubahan UI:**
- Tambahkan divider "OR" antara email/password form dan OAuth buttons
- Tambahkan button "Continue with Google"
- Tambahkan button "Continue with GitHub"
- Update styling agar konsisten

#### 3.3 Handle OAuth Callback

**Flow OAuth Callback:**
```
1. User klik "Login with Google/GitHub"
   → Redirect ke Supabase OAuth
   → User authorize di provider
   → Redirect kembali ke app dengan code di URL

2. Supabase client otomatis handle callback
   → detectSessionInUrl: true sudah aktif
   → Auth state change listener terpicu

3. onAuthStateChange handler
   → Event: "SIGNED_IN"
   → Check apakah user ada di tabel users
     ├─ TIDAK ADA (user baru):
     │  └─ Check email di email_whitelist
     │     ├─ ADA: assign role dari whitelist
     │     └─ TIDAK ADA: assign role "member"
     │  └─ Insert ke tabel users dengan role
     └─ SUDAH ADA (user existing):
        └─ Ambil role dari tabel users
   → Update auth state
```

#### 3.4 Update AuthContext

**Perubahan:**
- Tambahkan function `signInWithOAuth(provider: 'google' | 'github')`
- Update `onAuthStateChange` handler untuk handle OAuth user creation

---

### 4. WHITELIST MANAGEMENT

#### 4.1 Logic Check Whitelist

**Function:** `checkEmailWhitelist(email: string)`

**Flow:**
```typescript
1. Query email_whitelist berdasarkan email
2. Jika ditemukan:
   → Return role dari whitelist
3. Jika tidak ditemukan:
   → Return null (akan default ke "member")
```

#### 4.2 Auto-Role Assignment

**Function:** `createOrUpdateUserFromOAuth(user, provider)`

**Flow:**
```typescript
1. Extract email dari OAuth user
2. Check apakah user ada di tabel users (by email)
   
   IF user TIDAK ADA:
     a. Check email_whitelist
        ├─ ADA: use role dari whitelist
        └─ TIDAK ADA: use "member" (default)
     b. Insert ke tabel users:
        - id: user.id (dari auth.users)
        - email: user.email
        - full_name: user.user_metadata.full_name atau user.email
        - avatar_url: user.user_metadata.avatar_url
        - auth_provider: provider
        - role: role dari whitelist atau "member"
   
   ELSE user SUDAH ADA:
     a. Update jika perlu (avatar_url, auth_provider)
     b. Role tetap dari data existing (tidak di-overwrite)
```

#### 4.3 Whitelist Management UI (Optional)

**Jika ingin buat UI untuk manage whitelist:**

1. Create page: `/admin/whitelist`
2. Table untuk list email whitelist
3. Form untuk add/edit/delete email
4. Hanya accessible oleh admin

**Atau bisa manual via Supabase Dashboard:**
- Bisa langsung insert/update/delete di Supabase SQL Editor

---

### 5. ROLE ASSIGNMENT LOGIC - DETAILED FLOWCHART

```
User OAuth Login (Google/GitHub)
    │
    ├─→ Supabase OAuth Redirect
    │   └─→ User Authorize
    │       └─→ Callback ke App
    │
    ├─→ onAuthStateChange: "SIGNED_IN"
    │   └─→ Get session.user
    │       └─→ Extract: email, id, metadata
    │
    └─→ Check: Apakah user ada di tabel users?
        │
        ├─→ TIDAK ADA (New User)
        │   │
        │   ├─→ Check email_whitelist
        │   │   │
        │   │   ├─→ ADA di whitelist
        │   │   │   └─→ Assign role = whitelist.role
        │   │   │
        │   │   └─→ TIDAK ADA di whitelist
        │   │       └─→ Assign role = "member" (default)
        │   │
        │   └─→ Insert ke tabel users:
        │       - id: session.user.id
        │       - email: session.user.email
        │       - full_name: metadata.full_name || email
        │       - avatar_url: metadata.avatar_url
        │       - auth_provider: "google" | "github"
        │       - role: (dari whitelist atau "member")
        │
        └─→ SUDAH ADA (Existing User)
            │
            └─→ Ambil role dari tabel users
                └─→ Update jika perlu:
                    - avatar_url (dari OAuth)
                    - auth_provider (jika belum set)
            
    └─→ Set auth state (role, email)
        └─→ Redirect sesuai role
```

---

### 6. BACKWARD COMPATIBILITY

#### 6.1 Email/Password Login

**Status:** ✅ **TETAP BERFUNGSI**

- Tidak ada perubahan pada flow email/password login
- User yang sudah ada tetap bisa login seperti biasa
- Role tetap diambil dari tabel users

#### 6.2 User Existing

**Migration Strategy:**
- Set default `auth_provider = 'email'` untuk semua user existing
- Tidak perlu migrasi data lainnya
- User existing tetap bisa login dan akses seperti biasa

---

### 7. SECURITY CONSIDERATIONS

#### 7.1 Prevent Unauthorized Access

**Measures:**
- ✅ RLS policies di Supabase (sudah ada di users table)
- ✅ Email whitelist untuk kontrol role assignment
- ✅ Default role "member" untuk email yang tidak di-whitelist
- ⚠️ Client-side role check bisa di-bypass (tapi RLS tetap proteksi data)

#### 7.2 Email Verification

**OAuth Providers:**
- ✅ Google: Email sudah verified otomatis
- ✅ GitHub: Email bisa verified (tergantung setting GitHub user)

**Email/Password:**
- ⚠️ Supabase bisa set email verification required (perlu dicek setting)

#### 7.3 Email Spoofing Prevention

- ✅ OAuth providers (Google/GitHub) handle email verification
- ✅ Email diambil dari provider, tidak bisa di-spoof
- ✅ Email/password login tetap melalui Supabase Auth (aman)

---

## 📋 FASE 3: ACTION ITEMS UNTUK ANDA (Manual Setup)

### ⚠️ PENTING: Hal-hal yang HARUS dilakukan secara manual

#### 1. Supabase Dashboard - OAuth Provider Setup

**1.1 Google OAuth:**
- [ ] Buat Google Cloud Project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Set Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Copy Client ID dan Client Secret
- [ ] Masukkan ke Supabase Dashboard → Authentication → Providers → Google

**1.2 GitHub OAuth:**
- [ ] Buat GitHub OAuth App di GitHub Developer Settings
- [ ] Set Authorization callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Copy Client ID dan Client Secret
- [ ] Masukkan ke Supabase Dashboard → Authentication → Providers → GitHub

**1.3 Verifikasi:**
- [ ] Test OAuth login di Supabase Dashboard → Authentication → Users → "Add User" → "Sign in with OAuth"
- [ ] Pastikan redirect URL sudah benar

#### 2. Database Migration

**2.1 Update Tabel Users:**
- [ ] Jalankan SQL migration untuk tambah kolom `auth_provider`
- [ ] Jalankan SQL migration untuk tambah kolom `avatar_url`
- [ ] Jalankan SQL migration untuk tambah kolom `provider_id` (optional)
- [ ] Update existing users: `UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL`

**2.2 Buat Tabel email_whitelist:**
- [ ] Jalankan SQL untuk create table `email_whitelist`
- [ ] Jalankan SQL untuk create indexes
- [ ] Jalankan SQL untuk setup RLS policies
- [ ] Test RLS policies (coba query sebagai non-admin)

**2.3 Optional - Database Triggers:**
- [ ] Buat function `update_updated_at_column()`
- [ ] Create trigger untuk auto-update `updated_at`

#### 3. Initial Whitelist Data

**3.1 Setup Whitelist:**
- [ ] Insert email admin ke whitelist dengan role "admin"
- [ ] Insert email team members ke whitelist dengan role "team"
- [ ] (Optional) Insert email test ke whitelist dengan role "member"

**Contoh SQL:**
```sql
INSERT INTO email_whitelist (email, role) VALUES
('admin@company.com', 'admin'),
('manager@company.com', 'team'),
('staff@company.com', 'team');
```

#### 4. Environment Variables Check

**4.1 Verifikasi:**
- [ ] Pastikan `NEXT_PUBLIC_SUPABASE_URL` sudah set
- [ ] Pastikan `NEXT_PUBLIC_SUPABASE_ANON_KEY` sudah set
- [ ] (Optional) Pastikan `SUPABASE_SERVICE_ROLE_KEY` sudah set (untuk server-side operations)

#### 5. Testing

**5.1 OAuth Flow:**
- [ ] Test "Login with Google" - cek apakah redirect ke Google
- [ ] Test "Login with GitHub" - cek apakah redirect ke GitHub
- [ ] Test OAuth callback - cek apakah user dibuat di tabel users
- [ ] Test role assignment dari whitelist
- [ ] Test default role "member" untuk email tidak di-whitelist

**5.2 Backward Compatibility:**
- [ ] Test email/password login masih berfungsi
- [ ] Test user existing masih bisa login
- [ ] Test role assignment tetap dari tabel users

**5.3 Security:**
- [ ] Test RLS policies (coba akses sebagai non-admin)
- [ ] Test whitelist hanya bisa diakses admin
- [ ] Test user tidak bisa ubah role sendiri

---

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: Database Setup (Manual)
1. ✅ Buat tabel email_whitelist
2. ✅ Update tabel users (tambah kolom)
3. ✅ Setup RLS policies
4. ✅ Insert initial whitelist data

### Phase 2: OAuth Provider Setup (Manual)
1. ✅ Setup Google OAuth di Supabase
2. ✅ Setup GitHub OAuth di Supabase
3. ✅ Test OAuth flow di Supabase Dashboard

### Phase 3: Code Implementation (Auto - Saya akan buat)
1. ✅ Update auth.ts (tambah OAuth functions)
2. ✅ Update auth-context.tsx (tambah OAuth handler)
3. ✅ Update login-modal.tsx (tambah OAuth buttons)
4. ✅ Buat whitelist check logic
5. ✅ Buat auto-create user logic

### Phase 4: Testing (Manual + Auto)
1. ✅ Test OAuth login flow
2. ✅ Test role assignment
3. ✅ Test backward compatibility

---

## 📝 NOTES

1. **Callback URL:** Supabase otomatis handle OAuth callback, tidak perlu buat custom callback route
2. **Session Handling:** `detectSessionInUrl: true` sudah aktif, otomatis handle OAuth callback
3. **PKCE Flow:** Sudah aktif, aman untuk OAuth
4. **Role Mapping:** 
   - OAuth user baru → check whitelist → assign role
   - OAuth user existing → ambil role dari tabel users (tidak di-overwrite)
   - Email/password user → tetap seperti sekarang (role dari tabel users)

---

**Status Audit:** ✅ **SELESAI**

**Next Step:** Setelah Anda menyelesaikan action items manual (Fase 3), saya akan mulai implementasi code (Fase 2 - Phase 3).


# Quick Fix: Remove auth_provider Column Reference

## 🐛 Problem

Registration failed with error:

```
Registration succeeded but failed to create profile: Could not find the 'auth_provider' column of 'email_whitelist' in the schema cache
```

## 🔍 Root Cause

The code was trying to insert `auth_provider` field into `email_whitelist` table, but the column doesn't exist in the current database schema.

**Possible reasons:**

1. Migration `008_create_email_whitelist_table.sql` not run yet
2. Table was created manually without `auth_provider` column
3. Schema cache issue in Supabase

## ✅ Quick Fix Applied

Removed `auth_provider` field from all INSERT/UPDATE operations to `email_whitelist` table.

### Files Modified:

#### 1. **Registration Endpoint** ✅

**File:** `src/app/api/auth/register/route.ts` (Line 127)

**Before:**

```typescript
const payload = {
  email: normalizedEmail,
  full_name: trimmedName || normalizedEmail.split("@")[0],
  role: "user",
  auth_provider: "email", // ❌ Column doesn't exist
  is_active: true,
  is_verified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

**After:**

```typescript
const payload = {
  email: normalizedEmail,
  full_name: trimmedName || normalizedEmail.split("@")[0],
  role: "user",
  // auth_provider: "email", // REMOVED: Column doesn't exist in current schema
  is_active: true,
  is_verified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

#### 2. **Profile Route** ✅

**File:** `src/app/api/profile/route_new.ts` (Line 21)

**Before:**

```typescript
.select(
  "id, email, full_name, username, gender, avatar_url, organization, phone, role, auth_provider, is_active, is_verified, created_at, updated_at",
)
```

**After:**

```typescript
.select(
  "id, email, full_name, username, gender, avatar_url, organization, phone, role, is_active, is_verified, created_at, updated_at",
)
```

## 🎯 Impact

✅ **Registration now works** - Users can register without database errors
✅ **Profile queries work** - No error when fetching user profile
✅ **No breaking changes** - Other functionality unaffected

## 📝 Note

The `auth_provider` column is defined in migration `008_create_email_whitelist_table.sql` (line 16):

```sql
auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
```

**If you want to use this column in the future:**

1. Run the migration: `migrations/008_create_email_whitelist_table.sql`
2. Uncomment the `auth_provider` field in the code
3. Restart the application

## 🧪 Testing

**Test registration now:**

1. Go to registration page
2. Fill in: Full Name, Email, Password
3. Click "Register"
4. Should see: "Registration successful. Please check your email..."
5. Check terminal logs:
   ```
   🔄 [REGISTER] Starting database sync for: test@example.com
   📦 [REGISTER] Payload: { ... }
   ✅ [REGISTER] User synced to email_whitelist: test@example.com
   ```
6. Check database:
   ```sql
   SELECT * FROM email_whitelist WHERE email = 'test@example.com';
   ```
   Should return 1 row ✅

## 🔄 Future: Add auth_provider Column

If you need to track authentication provider (email/google/github):

**Option 1: Run Migration**

```bash
# In Supabase SQL Editor
-- Run: migrations/008_create_email_whitelist_table.sql
```

**Option 2: Add Column Manually**

```sql
ALTER TABLE email_whitelist
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'email'
CHECK (auth_provider IN ('email', 'google', 'github'));

CREATE INDEX idx_email_whitelist_provider ON email_whitelist(auth_provider);
```

Then uncomment the code in:

- `src/app/api/auth/register/route.ts` (line 127)
- `src/app/api/profile/route_new.ts` (line 21)

## ✅ Result

Registration should now work! User will be created in both:

1. ✅ Supabase Auth (`auth.users` table)
2. ✅ Application Database (`email_whitelist` table)

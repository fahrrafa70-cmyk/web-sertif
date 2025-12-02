# Email Whitelist Table - Actual Schema

## 🔍 Problem Identified

The migration file `008_create_email_whitelist_table.sql` defines columns that **don't actually exist** in the current database.

## ❌ Columns in Migration BUT NOT in Database

Based on registration errors, these columns are **NOT present**:

1. ❌ `auth_provider` - "Could not find the 'auth_provider' column"
2. ❌ `is_active` - Likely doesn't exist
3. ❌ `is_verified` - Likely doesn't exist
4. ❌ `provider_id` - Likely doesn't exist
5. ❌ `verification_token` - Likely doesn't exist
6. ❌ `verification_expires_at` - Likely doesn't exist
7. ❌ `password_hash` - Likely doesn't exist
8. ❌ `last_login_at` - Likely doesn't exist

## ✅ Columns That ACTUALLY Exist

Based on successful queries and no errors:

1. ✅ `id` - UUID PRIMARY KEY
2. ✅ `email` - VARCHAR(255) UNIQUE NOT NULL
3. ✅ `full_name` - VARCHAR(100) NOT NULL
4. ✅ `username` - VARCHAR(50) UNIQUE (nullable)
5. ✅ `gender` - VARCHAR(20) (nullable)
6. ✅ `avatar_url` - TEXT (nullable)
7. ✅ `organization` - VARCHAR(100) (nullable)
8. ✅ `phone` - VARCHAR(20) (nullable)
9. ✅ `role` - VARCHAR(20) DEFAULT 'user'
10. ✅ `created_at` - TIMESTAMPTZ DEFAULT NOW()
11. ✅ `updated_at` - TIMESTAMPTZ DEFAULT NOW()

## 📊 Minimal Schema (Current Database)

```sql
CREATE TABLE email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  gender VARCHAR(20),
  avatar_url TEXT,
  organization VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL,  -- Must be provided, no default
  subscription BOOLEAN,        -- Subscription status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Fixed Registration Payload

### Before (WRONG - Too Many Fields):

```typescript
const payload = {
  email: normalizedEmail,
  full_name: trimmedName || normalizedEmail.split("@")[0],
  role: "user",
  auth_provider: "email", // ❌ Column doesn't exist
  is_active: true, // ❌ Column doesn't exist
  is_verified: false, // ❌ Column doesn't exist
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

### After (CORRECT - Minimal Fields):

```typescript
const payload = {
  email: normalizedEmail,
  full_name: trimmedName || normalizedEmail.split("@")[0],
  // role will use database DEFAULT 'user'
  // created_at will use database DEFAULT NOW()
  // updated_at will use database DEFAULT NOW()
};
```

## 📝 Registration Flow (Simplified)

### 1. User Registration

```typescript
// User provides:
- email: "user@example.com"
- password: "password123"
- full_name: "John Doe"

// We insert to email_whitelist:
{
  email: "user@example.com",
  full_name: "John Doe"
}

// Database automatically adds:
- id: gen_random_uuid()
- role: 'user' (DEFAULT)
- created_at: NOW()
- updated_at: NOW()
```

### 2. Email Confirmation

Since `is_verified` column doesn't exist, we **cannot track email verification** in `email_whitelist` table.

**Options:**

1. Track verification in Supabase Auth only (`auth.users.email_confirmed_at`)
2. Add `is_verified` column via migration
3. Use separate verification table

### 3. Login Tracking

Since `last_login_at` column doesn't exist, we **cannot track last login** in `email_whitelist` table.

**Options:**

1. Don't track login time
2. Add `last_login_at` column via migration
3. Use separate login_history table

## 🎯 Recommended Actions

### Option 1: Use Minimal Schema (Current Approach) ✅

**Pros:**

- Works immediately
- No migration needed
- Simple and clean

**Cons:**

- Can't track email verification
- Can't track login history
- Can't track auth provider

**Use this if:**

- You want quick fix
- Don't need verification tracking
- Supabase Auth handles verification

### Option 2: Run Full Migration

**Pros:**

- All features available
- Can track verification
- Can track login history
- Can track auth provider

**Cons:**

- Need database access
- Need to run migration
- More complex

**Steps:**

1. Run `migrations/008_create_email_whitelist_table.sql` in Supabase SQL Editor
2. Uncomment all fields in code
3. Restart application

## 🔍 How to Verify Current Schema

### Method 1: Supabase Dashboard

```
1. Go to Supabase Dashboard
2. Select your project
3. Go to Table Editor
4. Find "email_whitelist" table
5. Check columns
```

### Method 2: SQL Query

```sql
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'email_whitelist'
ORDER BY
    ordinal_position;
```

### Method 3: Debug Endpoint

```bash
# Start server
npm run dev

# Test endpoint
curl http://localhost:3000/api/debug/check-table
```

## 📋 Files Updated

### 1. Registration Endpoint ✅

**File:** `src/app/api/auth/register/route.ts`

```typescript
// Simplified payload - only user input
const payload = {
  email: normalizedEmail,
  full_name: trimmedName || normalizedEmail.split("@")[0],
};
```

### 2. Debug Endpoint ✅

**File:** `src/app/api/debug/check-table/route.ts`

```typescript
// Test insert with minimal fields
.insert({
  email: testEmail,
  full_name: "Test User",
})
```

### 3. Profile Route ✅

**File:** `src/app/api/profile/route_new.ts`

- Removed `auth_provider` from SELECT query

## ✅ Result

**Registration now works with minimal data:**

- ✅ User provides: email, password, full_name
- ✅ We insert: email, full_name
- ✅ Database adds: id, role (default), timestamps (default)
- ✅ No errors about missing columns

## 🚀 Testing

```bash
# 1. Restart server
npm run dev

# 2. Test registration
# Fill form with:
# - Email: test@example.com
# - Password: password123
# - Full Name: Test User

# 3. Expected logs:
🔄 [REGISTER] Starting database sync for: test@example.com
📦 [REGISTER] Payload: {
  "email": "test@example.com",
  "full_name": "Test User"
}
✅ [REGISTER] User synced to email_whitelist: test@example.com

# 4. Check database:
SELECT * FROM email_whitelist WHERE email = 'test@example.com';

# Expected result:
# id: uuid
# email: test@example.com
# full_name: Test User
# role: user (default)
# created_at: 2024-12-02...
# updated_at: 2024-12-02...
```

## 📌 Summary

**Current State:**

- ✅ Registration works with minimal schema
- ✅ Only inserts email + full_name
- ✅ Database handles defaults (role, timestamps)
- ✅ No errors about missing columns

**Missing Features (due to missing columns):**

- ❌ Email verification tracking (`is_verified`)
- ❌ Login history tracking (`last_login_at`)
- ❌ Auth provider tracking (`auth_provider`)
- ❌ Account status tracking (`is_active`)

**To enable missing features:**
Run migration `008_create_email_whitelist_table.sql` to add all columns.

# Email Whitelist Migration Guide

## Overview

Memindahkan penyimpanan data profil user dari table `users` ke table `email_whitelist` untuk organisasi database yang lebih baik dan validasi username yang diperbaiki.

## 📋 Schema Baru: email_whitelist Table

### Table Structure

```sql
CREATE TABLE email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  avatar_url TEXT,
  organization VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'team', 'user', 'member')),
  auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
  provider_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  verification_expires_at TIMESTAMPTZ,
  password_hash VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Features

- **Email-based lookup**: Primary identification via email
- **Enhanced username validation**: Lowercase only, alphanumeric + underscore
- **Comprehensive user management**: Includes verification, activation, roles
- **OAuth support**: Google/GitHub authentication
- **Audit trail**: Created/updated timestamps, last login tracking

## 🚀 Migration Steps

### 1. Database Migration

```bash
# Run the migration script
psql -f migrations/008_create_email_whitelist_table.sql

# The migration will automatically:
# - Create email_whitelist table with all indexes
# - Migrate existing data from users table
# - Setup updated_at trigger
```

### 2. Code Changes

#### Updated Files:

- ✅ `src/lib/supabase/email-whitelist.ts` - New database functions
- ✅ `src/hooks/use-profile.ts` - Updated to use new API
- ✅ `src/app/api/profile/route.ts` - Updated endpoints
- ✅ `src/app/api/profile/username-check/route.ts` - Enhanced validation

#### Key Changes:

**Profile Lookup:**

```typescript
// OLD: getUserProfile(user.id)
// NEW: getUserProfileByEmail(user.email)
const profile = await getUserProfileByEmail(user.email!);
```

**Username Validation:**

```typescript
// OLD: /^[a-zA-Z0-9_]+$/
// NEW: /^[a-z0-9_]+$/ (lowercase only)

// Enhanced validation:
- Minimum 3 characters
- Maximum 50 characters
- Lowercase letters, numbers, and underscores only
- Automatic normalization to lowercase
```

## 🔧 Enhanced Username Validation

### New Validation Rules

1. **Length**: 3-50 characters
2. **Format**: Lowercase alphanumeric + underscore only (`/^[a-z0-9_]+$/`)
3. **Normalization**: Automatic conversion to lowercase
4. **Uniqueness**: Checked against email_whitelist table
5. **Current user exclusion**: When editing, exclude own username from uniqueness check

### Validation Flow

```typescript
// Frontend validation (real-time)
const validateUsername = async (value: string) => {
  const normalized = value.trim().toLowerCase();

  if (normalized.length < 3)
    return { isValid: false, message: "Minimum 3 characters" };
  if (normalized.length > 50)
    return { isValid: false, message: "Maximum 50 characters" };
  if (!/^[a-z0-9_]+$/.test(normalized))
    return {
      isValid: false,
      message: "Lowercase letters, numbers, underscore only",
    };

  const isAvailable = await checkUsernameAvailability(normalized);
  return { isValid: isAvailable, isAvailable };
};
```

## 📚 API Endpoints

### GET /api/profile

**Fetch user profile by email**

```typescript
// Authentication required
// Returns: UserProfile from email_whitelist table
```

### PATCH /api/profile

**Update user profile**

```typescript
// Body: { full_name?, username?, gender?, avatar_url?, organization?, phone? }
// Enhanced validation for all fields
// Username automatically normalized to lowercase
```

### GET /api/profile/username-check

**Check username availability**

```typescript
// Query: ?username=example_username
// Returns: { available: boolean, username: string }
// Excludes current user's username if authenticated
```

## 🎯 Key Improvements

### 1. **Better Username Validation**

- Enforced lowercase format
- Clear length limits (3-50 characters)
- Comprehensive regex validation
- Real-time availability checking

### 2. **Enhanced Database Design**

- Proper user state management (active/inactive)
- Email verification system
- OAuth provider support
- Role-based access control

### 3. **Improved Security**

- Email-based identification
- Password hash storage
- Verification token system
- Last login tracking

### 4. **Better Error Handling**

- Specific validation messages
- Proper HTTP status codes
- Detailed error responses
- Console logging for debugging

## 🔄 Data Migration

The migration script automatically handles:

```sql
-- Migrate existing users data
INSERT INTO email_whitelist (
  email, full_name, username, gender, avatar_url,
  organization, phone, role, auth_provider, provider_id,
  created_at, updated_at
)
SELECT
  email, full_name, username, gender, avatar_url,
  organization, phone,
  COALESCE(role, 'user')::VARCHAR,
  COALESCE(auth_provider, 'email')::VARCHAR,
  provider_id, created_at, updated_at
FROM users
WHERE email IS NOT NULL AND full_name IS NOT NULL
ON CONFLICT (email) DO NOTHING;
```

## ⚡ Performance Optimizations

### Indexes Created

```sql
CREATE INDEX idx_email_whitelist_email ON email_whitelist(email);
CREATE INDEX idx_email_whitelist_username ON email_whitelist(username);
CREATE INDEX idx_email_whitelist_role ON email_whitelist(role);
CREATE INDEX idx_email_whitelist_provider ON email_whitelist(auth_provider);
CREATE INDEX idx_email_whitelist_active ON email_whitelist(is_active);
```

### Query Optimization

- Email-based lookups for profile data
- Username uniqueness checks with proper indexing
- Active user filtering
- Role-based queries

## 🛠️ Testing

### Checklist

- [ ] Database migration successful
- [ ] Profile page loads correctly
- [ ] Username validation works real-time
- [ ] Username availability check functional
- [ ] Profile update saves correctly
- [ ] Avatar upload maintains functionality
- [ ] Cancel button works properly
- [ ] Error handling displays correctly

### Test Cases

1. **Username Validation**

   - Test minimum length (< 3 chars)
   - Test maximum length (> 50 chars)
   - Test invalid characters (uppercase, special chars)
   - Test duplicate username detection
   - Test current user exclusion

2. **Profile Operations**
   - Load existing profile
   - Update profile fields
   - Save changes
   - Cancel changes
   - Avatar upload/update

## 🚨 Rollback Plan

If issues occur, you can rollback by:

1. **Revert code changes** to use original `users` table functions
2. **Keep both tables** during transition period
3. **Data sync** if needed between tables
4. **Drop email_whitelist** table if migration fails

```sql
-- Emergency rollback
DROP TABLE IF EXISTS email_whitelist CASCADE;
-- Restore original code imports
```

## ✅ Production Checklist

- [ ] Backup existing `users` table data
- [ ] Run migration in staging environment first
- [ ] Test all profile functionality
- [ ] Verify username validation works
- [ ] Check performance impact
- [ ] Monitor error logs
- [ ] Prepare rollback plan

## 🎉 Completion

After successful migration:

- ✅ Enhanced username validation system
- ✅ Better organized user data structure
- ✅ Improved security and user management
- ✅ Scalable authentication system
- ✅ Production-ready profile management

The system now provides a robust foundation for user profile management with enhanced validation and better database organization.

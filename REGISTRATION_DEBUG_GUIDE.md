# Registration Debug Guide - User Not Saved to Database

## 🔍 Problem

Email yang digunakan untuk register masih belum tersimpan di database `email_whitelist`.

## 🛠️ Troubleshooting Steps

### **Step 1: Verify Table Exists**

**Option A: Using Debug API Endpoint**

```bash
# Start your dev server
npm run dev

# In another terminal, test the endpoint
curl http://localhost:3000/api/debug/check-table
```

**Expected Response (Success):**

```json
{
  "tableExists": true,
  "canQuery": true,
  "canInsert": true,
  "canDelete": true,
  "totalRecords": 0,
  "message": "email_whitelist table is working correctly"
}
```

**If you get an error**, the table doesn't exist or has issues. Continue to Step 2.

---

### **Step 2: Run Migration to Create Table**

**Option A: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `migrations/008_create_email_whitelist_table.sql`
5. Click "Run"

**Option B: Using psql (if you have database credentials)**

```bash
psql -h your-db-host -U postgres -d postgres -f migrations/008_create_email_whitelist_table.sql
```

**Option C: Check table manually**

```bash
# Run this SQL in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'email_whitelist';
```

---

### **Step 3: Test Registration with Detailed Logging**

**The updated registration endpoint now provides detailed error messages.**

1. **Start your dev server:**

   ```bash
   npm run dev
   ```

2. **Open browser console** (F12 → Console tab)

3. **Try to register a new user** through the UI

4. **Check the terminal/console logs** for detailed error messages:

   **Success logs:**

   ```
   🔄 [REGISTER] Starting database sync for: test@example.com
   📦 [REGISTER] Payload: { ... }
   ✅ [REGISTER] User synced to email_whitelist: test@example.com
   ✅ [REGISTER] Sync result: [ { ... } ]
   ```

   **Error logs:**

   ```
   ❌ [REGISTER] Failed to sync user to email_whitelist:
   ❌ [REGISTER] Error code: 42P01
   ❌ [REGISTER] Error message: relation "email_whitelist" does not exist
   ❌ [REGISTER] Error details: ...
   ❌ [REGISTER] Error hint: ...
   ```

5. **Check the API response** in browser Network tab:

   **Success:**

   ```json
   { "success": true }
   ```

   **Error:**

   ```json
   {
     "error": "Registration succeeded but failed to create profile: ...",
     "details": "...",
     "authCreated": true,
     "profileCreated": false
   }
   ```

---

### **Step 4: Common Error Codes and Solutions**

#### **Error Code: 42P01 - Table Does Not Exist**

```
relation "email_whitelist" does not exist
```

**Solution:** Run migration (Step 2)

---

#### **Error Code: 23505 - Unique Violation**

```
duplicate key value violates unique constraint "email_whitelist_email_key"
```

**Solution:** User already exists in database. This is expected if you're testing with the same email.

---

#### **Error Code: 23502 - Not Null Violation**

```
null value in column "full_name" violates not-null constraint
```

**Solution:** Check that `full_name` is being sent in the registration request.

---

#### **Error Code: 23514 - Check Constraint Violation**

```
new row for relation "email_whitelist" violates check constraint
```

**Solution:** Check that `role` is one of: 'admin', 'team', 'user', 'member'

---

### **Step 5: Manual Database Check**

**Run this SQL in Supabase SQL Editor to check if user was created:**

```sql
-- Check if your test email exists
SELECT
    email,
    full_name,
    role,
    auth_provider,
    is_verified,
    created_at
FROM email_whitelist
WHERE email = 'your-test-email@example.com';

-- Show all recent registrations
SELECT
    email,
    full_name,
    role,
    is_verified,
    created_at
FROM email_whitelist
ORDER BY created_at DESC
LIMIT 10;
```

---

### **Step 6: Check Supabase Auth**

Even if database sync fails, the user might still be created in Supabase Auth.

**Check in Supabase Dashboard:**

1. Go to Authentication → Users
2. Look for your test email
3. If user exists in Auth but not in `email_whitelist`, the sync failed

**To clean up:**

```sql
-- Delete from email_whitelist (if exists)
DELETE FROM email_whitelist WHERE email = 'test@example.com';
```

Then in Supabase Dashboard → Authentication → Users → Delete the user

---

## 🔧 Files Modified for Better Debugging

### **1. Registration Endpoint** (`src/app/api/auth/register/route.ts`)

**Added:**

- ✅ Detailed console logging at each step
- ✅ Error details in API response (code, message, details, hint)
- ✅ Clear indication if auth created but profile failed
- ✅ `.select()` after upsert to verify data was inserted

**Key Changes:**

```typescript
// Before: Silent failure
const { error: syncError } = await adminClient
  .from("email_whitelist")
  .upsert(payload, { onConflict: "email" });

if (syncError) {
  console.error("Failed to sync...", syncError);
  // Continue anyway - NO ERROR TO USER!
}

// After: Explicit error to user
const { data: syncData, error: syncError } = await adminClient
  .from("email_whitelist")
  .upsert(payload, { onConflict: "email" })
  .select(); // Verify insert

if (syncError) {
  console.error("❌ [REGISTER] Failed...", syncError);
  return NextResponse.json(
    {
      error: "Registration succeeded but failed to create profile",
      details: syncError.details,
      authCreated: true,
      profileCreated: false,
    },
    { status: 500 },
  );
}
```

### **2. Debug Endpoint** (`src/app/api/debug/check-table/route.ts`)

**New endpoint to verify table status:**

- ✅ Check if table exists
- ✅ Test insert operation
- ✅ Test delete operation
- ✅ Count total records
- ✅ Return detailed error information

---

## 📊 Expected Flow After Fix

### **Successful Registration:**

```
1. User fills registration form
   ↓
2. POST /api/auth/register
   ↓
3. Create Supabase Auth user ✅
   ↓
4. Log: "🔄 [REGISTER] Starting database sync for: user@example.com"
   ↓
5. Log: "📦 [REGISTER] Payload: { email, full_name, ... }"
   ↓
6. Insert into email_whitelist ✅
   ↓
7. Log: "✅ [REGISTER] User synced to email_whitelist: user@example.com"
   ↓
8. Return: { "success": true }
   ↓
9. User sees: "Registration successful. Please check your email..."
```

### **Failed Registration (Table Missing):**

```
1. User fills registration form
   ↓
2. POST /api/auth/register
   ↓
3. Create Supabase Auth user ✅
   ↓
4. Log: "🔄 [REGISTER] Starting database sync for: user@example.com"
   ↓
5. Try insert into email_whitelist ❌
   ↓
6. Log: "❌ [REGISTER] Failed to sync user to email_whitelist"
   ↓
7. Log: "❌ [REGISTER] Error code: 42P01"
   ↓
8. Log: "❌ [REGISTER] Error message: relation 'email_whitelist' does not exist"
   ↓
9. Return: {
      "error": "Registration succeeded but failed to create profile: relation 'email_whitelist' does not exist",
      "authCreated": true,
      "profileCreated": false
   }
   ↓
10. User sees error message in UI
```

---

## 🎯 Quick Checklist

- [ ] Table `email_whitelist` exists in database
- [ ] Migration `008_create_email_whitelist_table.sql` has been run
- [ ] Environment variables are set correctly (SUPABASE_SERVICE_ROLE_KEY)
- [ ] Debug endpoint `/api/debug/check-table` returns success
- [ ] Registration shows detailed logs in terminal
- [ ] User receives clear error message if sync fails
- [ ] User appears in `email_whitelist` table after registration

---

## 🚨 If Still Not Working

1. **Check Supabase Service Role Key:**

   ```bash
   # In .env.local
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Check Supabase Project URL:**

   ```bash
   # In .env.local
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

3. **Check RLS Policies:**

   - Service role key should bypass RLS
   - But verify in Supabase Dashboard → Authentication → Policies

4. **Check Server Logs:**

   - Terminal where `npm run dev` is running
   - Look for `[REGISTER]` prefixed logs

5. **Check Browser Console:**

   - F12 → Console tab
   - Look for error messages from registration

6. **Check Network Tab:**
   - F12 → Network tab
   - Find `/api/auth/register` request
   - Check response body for error details

---

## 📞 Next Steps

After following this guide:

1. ✅ Run `/api/debug/check-table` to verify table
2. ✅ Try registration with detailed logging
3. ✅ Check terminal logs for error details
4. ✅ Check database for user record
5. ✅ Report specific error code/message if still failing

# 🔍 Analisis Lengkap Alur Kerja Registration

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1️⃣ USER INPUT (Frontend)
   ├─ File: src/components/ui/login-modal.tsx
   ├─ User mengisi form:
   │  ├─ Email (required, validated)
   │  ├─ Password (min 6 chars)
   │  ├─ Full Name (required)
   │  └─ Confirm Password (must match)
   └─ Click "Register" button
      ↓

2️⃣ CLIENT-SIDE VALIDATION (login-modal.tsx line 70-99)
   ├─ Email format check: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   ├─ Password length: >= 6 characters
   ├─ Full name: not empty
   ├─ Password match: password === confirmPassword
   └─ If validation fails → Show error, STOP
      ↓

3️⃣ API CALL (login-modal.tsx line 107-111)
   ├─ Method: POST
   ├─ URL: /api/auth/register
   ├─ Headers: { 'Content-Type': 'application/json' }
   ├─ Body: { email, password, full_name }
   └─ await fetch(...)
      ↓

4️⃣ SERVER ENDPOINT (src/app/api/auth/register/route.ts)
   │
   ├─ 4.1 REQUEST VALIDATION (line 10-56)
   │   ├─ Check request body exists
   │   ├─ Parse JSON
   │   ├─ Validate email format
   │   ├─ Validate password length >= 6
   │   └─ If invalid → Return 400 error
   │
   ├─ 4.2 ENV CHECK (line 58-68)
   │   ├─ NEXT_PUBLIC_SUPABASE_URL
   │   ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY
   │   ├─ SUPABASE_SERVICE_ROLE_KEY
   │   └─ If missing → Return 500 error
   │
   ├─ 4.3 CREATE SUPABASE AUTH USER (line 70-103)
   │   ├─ Create authClient with ANON_KEY
   │   ├─ Call: authClient.auth.signUp({
   │   │     email: normalizedEmail,
   │   │     password,
   │   │     options: { data: { full_name } }
   │   │   })
   │   ├─ Supabase creates user in auth.users table
   │   ├─ Supabase sends confirmation email
   │   │
   │   ├─ If error "user already registered":
   │   │   └─ Return 409: "This email is already registered"
   │   │
   │   ├─ If other error:
   │   │   └─ Return 500: signUpError.message
   │   │
   │   └─ If success:
   │       ├─ authUser created ✅
   │       └─ Continue to step 4.4
   │
   ├─ 4.4 SYNC TO DATABASE (line 113-180) ⚠️ CRITICAL STEP
   │   │
   │   ├─ Log: "🔄 [REGISTER] Starting database sync for: {email}"
   │   │
   │   ├─ Create adminClient with SERVICE_ROLE_KEY
   │   │
   │   ├─ Build payload:
   │   │   {
   │   │     email: normalizedEmail,
   │   │     full_name: trimmedName || email.split("@")[0],
   │   │     role: "user",
   │   │     auth_provider: "email",
   │   │     is_active: true,
   │   │     is_verified: false,
   │   │     created_at: new Date().toISOString(),
   │   │     updated_at: new Date().toISOString()
   │   │   }
   │   │
   │   ├─ Log: "📦 [REGISTER] Payload: {payload}"
   │   │
   │   ├─ Execute: adminClient
   │   │     .from("email_whitelist")
   │   │     .upsert(payload, { onConflict: "email" })
   │   │     .select()
   │   │
   │   ├─ If syncError:
   │   │   ├─ Log: "❌ [REGISTER] Failed to sync user to email_whitelist"
   │   │   ├─ Log: "❌ [REGISTER] Error code: {code}"
   │   │   ├─ Log: "❌ [REGISTER] Error message: {message}"
   │   │   ├─ Log: "❌ [REGISTER] Error details: {details}"
   │   │   ├─ Log: "❌ [REGISTER] Error hint: {hint}"
   │   │   └─ Return 500: {
   │   │         error: "Registration succeeded but failed to create profile",
   │   │         details: syncError.details,
   │   │         authCreated: true,
   │   │         profileCreated: false
   │   │       }
   │   │
   │   ├─ If success:
   │   │   ├─ Log: "✅ [REGISTER] User synced to email_whitelist: {email}"
   │   │   ├─ Log: "✅ [REGISTER] Sync result: {syncData}"
   │   │   └─ Continue to step 4.5
   │   │
   │   └─ If exception:
   │       ├─ Log: "❌ [REGISTER] Exception during email_whitelist sync"
   │       └─ Return 500: {
   │             error: "Registration succeeded but failed to create profile",
   │             authCreated: true,
   │             profileCreated: false
   │           }
   │
   └─ 4.5 SUCCESS RESPONSE (line 182)
       └─ Return 200: { success: true }
      ↓

5️⃣ CLIENT RESPONSE HANDLING (login-modal.tsx line 113-130)
   │
   ├─ If res.ok (status 200):
   │   ├─ Show success message:
   │   │   "Registration successful. Please check your email and confirm..."
   │   ├─ Switch mode to "login"
   │   └─ Clear form errors
   │
   └─ If !res.ok (status 4xx/5xx):
       ├─ Parse error from response
       ├─ Show error message in UI
       └─ User sees the error
      ↓

6️⃣ EMAIL CONFIRMATION (Async, user action required)
   ├─ User receives email from Supabase
   ├─ User clicks confirmation link
   ├─ Redirects to: /auth/callback?code=...
   └─ Handled by: src/app/auth/callback/page.tsx
      ↓

7️⃣ EMAIL VERIFICATION (src/app/auth/callback/page.tsx)
   ├─ Exchange code for session
   ├─ Call: /api/email-whitelist/verify
   │   └─ Update: is_verified = true
   └─ Redirect to home page
      ↓

8️⃣ USER CAN NOW LOGIN
   └─ User is in database with is_verified = true
```

---

## 🔍 Detailed Code Trace

### **Step 1: User Input (Frontend)**

**File:** `src/components/ui/login-modal.tsx`

```typescript
// Line 20-24: State variables
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [fullName, setFullName] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

// Line 271-307: Full Name Input (only shown when mode === "register")
<Input
  type="text"
  value={fullName}
  onChange={(e) => {
    setFullName(e.target.value);
    setFullNameError("");
  }}
  required
  placeholder="Enter your full name"
/>

// Line 309-344: Email Input
<Input
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    setEmailError("");
  }}
  required
  placeholder="Enter your email"
/>

// Line 346-390: Password Input
<Input
  type={showPassword ? "text" : "password"}
  value={password}
  onChange={(e) => {
    setPassword(e.target.value);
    setPasswordError("");
  }}
  required
  placeholder="Enter your password"
/>

// Line 392-428: Confirm Password (only shown when mode === "register")
<Input
  type="password"
  value={confirmPassword}
  onChange={(e) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError("");
  }}
  required
  placeholder="Confirm your password"
/>
```

---

### **Step 2: Client-Side Validation**

**File:** `src/components/ui/login-modal.tsx` (Line 63-99)

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setEmailError("");
  setPasswordError("");
  setFullNameError("");
  setConfirmPasswordError("");

  let hasError = false;

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setEmailError(t("error.login.invalidEmail"));
    hasError = true;
  }

  // Validate password length
  if (!password || password.length < 6) {
    const msg =
      mode === "register"
        ? t("error.login.invalidPassword")
        : t("error.login.invalidPassword");
    setPasswordError(msg);
    hasError = true;
  }

  // Validate full name (register only)
  if (mode === "register") {
    if (!fullName.trim()) {
      setFullNameError(
        t("profile.fullNameRequired") || "Full name is required",
      );
      hasError = true;
    }

    // Validate password match
    if (confirmPassword !== password) {
      setConfirmPasswordError(
        safeT("error.login.passwordMismatch", "Passwords do not match"),
      );
      hasError = true;
    }
  }

  if (hasError) return; // STOP if validation fails

  // Continue to API call...
}
```

**Validation Rules:**

- ✅ Email: Must match regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- ✅ Password: Minimum 6 characters
- ✅ Full Name: Not empty (trim check)
- ✅ Confirm Password: Must match password exactly

---

### **Step 3: API Call to Backend**

**File:** `src/components/ui/login-modal.tsx` (Line 107-118)

```typescript
// Set loading state
setSubmitLoading(true);

try {
  if (mode === "login") {
    await signIn(email, password);
  } else {
    // REGISTER MODE
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email, // User's email
        password, // User's password (will be hashed by Supabase)
        full_name: fullName, // User's full name
      }),
    });

    if (!res.ok) {
      // Handle error response
      const data = await res.json().catch(() => ({}));
      const message =
        typeof data?.error === "string" ? data.error : "Registration failed";
      setEmailError(message);
      return;
    }

    // Success: Show message and switch to login mode
    setInfoMessage(
      "Registration successful. Please check your email and confirm your account before logging in.",
    );
    setMode("login");
    setFullNameError("");
    setConfirmPasswordError("");
  }
} finally {
  setSubmitLoading(false);
}
```

**Request Details:**

- **Method:** POST
- **URL:** `/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe"
  }
  ```

---

### **Step 4: Server-Side Processing**

**File:** `src/app/api/auth/register/route.ts`

#### **4.1 Request Validation (Line 8-56)**

```typescript
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const text = await req.text();
    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { email, password, full_name } = body as {
      email?: string;
      password?: string;
      full_name?: string;
    };

    const normalizedEmail = email?.toLowerCase().trim() || "";
    const trimmedName = (full_name || "").trim();

    // Validate required fields
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Continue...
  }
}
```

#### **4.2 Environment Check (Line 58-68)**

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error("Supabase env not configured for register endpoint");
  return NextResponse.json(
    { error: "Server configuration error. Please contact support." },
    { status: 500 },
  );
}
```

**Required Environment Variables:**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key (for auth)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for database access)

#### **4.3 Create Supabase Auth User (Line 70-111)**

```typescript
// Create client for authentication (uses anon key)
const authClient = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Sign up user in Supabase Auth
const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
  email: normalizedEmail,
  password,
  options: {
    data: {
      full_name: trimmedName || normalizedEmail.split("@")[0],
    },
  },
});

if (signUpError) {
  // Handle duplicate user
  if (signUpError.message.toLowerCase().includes("user already registered")) {
    return NextResponse.json(
      { error: "This email is already registered. Please login instead." },
      { status: 409 },
    );
  }

  // Handle other errors
  console.error("Supabase signUp error:", signUpError);
  return NextResponse.json({ error: signUpError.message }, { status: 500 });
}

const authUser = signUpData.user;
if (!authUser) {
  return NextResponse.json(
    { error: "Registration failed: missing auth user." },
    { status: 500 },
  );
}
```

**What happens in Supabase:**

1. User created in `auth.users` table
2. Password hashed and stored securely
3. Confirmation email sent to user
4. User status: `email_confirmed_at` = NULL (unconfirmed)

#### **4.4 Sync to Database ⚠️ CRITICAL (Line 113-180)**

```typescript
// Log start of sync
console.log(`🔄 [REGISTER] Starting database sync for: ${normalizedEmail}`);

// Create admin client (uses service role key - bypasses RLS)
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  // Build payload for email_whitelist table
  const payload = {
    email: normalizedEmail,
    full_name: trimmedName || normalizedEmail.split("@")[0],
    role: "user", // Default role
    auth_provider: "email", // Auth method
    is_active: true, // Account active
    is_verified: false, // Email not confirmed yet
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Log payload for debugging
  console.log(`📦 [REGISTER] Payload:`, JSON.stringify(payload, null, 2));

  // Insert into database
  const { data: syncData, error: syncError } = await adminClient
    .from("email_whitelist")
    .upsert(payload, { onConflict: "email" })
    .select();

  if (syncError) {
    // Log detailed error information
    console.error(
      "❌ [REGISTER] Failed to sync user to email_whitelist:",
      JSON.stringify(syncError, null, 2),
    );
    console.error("❌ [REGISTER] Error code:", syncError.code);
    console.error("❌ [REGISTER] Error message:", syncError.message);
    console.error("❌ [REGISTER] Error details:", syncError.details);
    console.error("❌ [REGISTER] Error hint:", syncError.hint);

    // Return error to user
    return NextResponse.json(
      {
        error: `Registration succeeded but failed to create profile: ${syncError.message}`,
        details:
          syncError.details || syncError.hint || "Unknown database error",
        authCreated: true,
        profileCreated: false,
      },
      { status: 500 },
    );
  } else {
    // Success!
    console.log(
      `✅ [REGISTER] User synced to email_whitelist: ${normalizedEmail}`,
    );
    console.log(
      `✅ [REGISTER] Sync result:`,
      JSON.stringify(syncData, null, 2),
    );
  }
} catch (syncErr) {
  // Handle exceptions
  console.error(
    "❌ [REGISTER] Exception during email_whitelist sync:",
    syncErr,
  );

  return NextResponse.json(
    {
      error: `Registration succeeded but failed to create profile: ${syncErr instanceof Error ? syncErr.message : "Unknown error"}`,
      authCreated: true,
      profileCreated: false,
    },
    { status: 500 },
  );
}
```

**Database Operation:**

- **Table:** `email_whitelist`
- **Operation:** UPSERT (insert or update if exists)
- **Conflict Resolution:** On `email` column
- **Returns:** Inserted/updated row data

**Possible Errors:**

- `42P01` - Table does not exist
- `23505` - Unique constraint violation (duplicate email)
- `23502` - Not null constraint violation
- `23514` - Check constraint violation (invalid role, etc)

#### **4.5 Success Response (Line 182)**

```typescript
return NextResponse.json({ success: true });
```

---

## 🎯 Common Failure Points

### **❌ Point 1: Table Does Not Exist**

**Error Code:** `42P01`
**Error Message:** `relation "email_whitelist" does not exist`

**Cause:** Migration `008_create_email_whitelist_table.sql` not run

**Solution:**

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/008_create_email_whitelist_table.sql
CREATE TABLE IF NOT EXISTS email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  -- ... other columns
);
```

---

### **❌ Point 2: Service Role Key Missing**

**Error:** `Server configuration error. Please contact support.`

**Cause:** `SUPABASE_SERVICE_ROLE_KEY` not set in `.env.local`

**Solution:**

```bash
# Add to .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

### **❌ Point 3: Duplicate Email**

**Error Code:** `23505`
**Error Message:** `duplicate key value violates unique constraint "email_whitelist_email_key"`

**Cause:** User already exists in database

**Solution:** This is expected behavior. User should login instead.

---

### **❌ Point 4: Invalid Role**

**Error Code:** `23514`
**Error Message:** `new row for relation "email_whitelist" violates check constraint`

**Cause:** Role value not in allowed list: `('admin', 'team', 'user', 'member')`

**Solution:** Ensure `role: "user"` is sent (already correct in code)

---

## 🔍 Debugging Checklist

When registration fails, check these in order:

1. **Check Terminal Logs:**

   ```
   🔄 [REGISTER] Starting database sync for: user@example.com
   📦 [REGISTER] Payload: { ... }
   ```

   - If you see these logs, endpoint is reached ✅
   - If you don't see logs, check if server is running

2. **Check for Error Logs:**

   ```
   ❌ [REGISTER] Failed to sync user to email_whitelist
   ❌ [REGISTER] Error code: 42P01
   ❌ [REGISTER] Error message: relation "email_whitelist" does not exist
   ```

   - Error code tells you exactly what's wrong

3. **Check Browser Console:**

   - F12 → Console tab
   - Look for error messages from API

4. **Check Network Tab:**

   - F12 → Network tab
   - Find `/api/auth/register` request
   - Check response status and body

5. **Check Database:**
   ```sql
   SELECT * FROM email_whitelist WHERE email = 'test@example.com';
   ```
   - If row exists, sync worked ✅
   - If no row, sync failed ❌

---

## 📝 Summary

**Registration Flow:**

1. User fills form → Client validation → API call
2. Server validates request → Creates Supabase Auth user
3. **CRITICAL:** Syncs to `email_whitelist` table
4. Returns success → User sees confirmation message
5. User confirms email → `is_verified` set to true
6. User can login

**Key Points:**

- ✅ Password NEVER stored in `email_whitelist` (handled by Supabase Auth)
- ✅ User created in TWO places: `auth.users` (Supabase) + `email_whitelist` (our DB)
- ✅ Detailed logging shows exactly where failure occurs
- ✅ Error messages returned to user for transparency
- ✅ Service role key bypasses RLS for database operations

**Next Steps:**

1. Run `/api/debug/check-table` to verify table exists
2. Try registration and check terminal logs
3. Report exact error code/message if still failing

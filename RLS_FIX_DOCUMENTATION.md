# Row Level Security (RLS) Fix Documentation

## Problem

When attempting to create a new template, the application throws an error:

```
Failed to create template: new row violates row-level security policy for table "templates"
```

## Root Cause

The Supabase database has Row Level Security (RLS) policies enabled on the `templates` table. These policies restrict which users can insert, update, or delete rows. When using the client-side Supabase client (with the anon key), the RLS policies are enforced, preventing template creation.

## Solution

The fix involves creating API routes for template operations:

### 1. Created API Routes for Template Operations

**Files:**
- `src/app/api/templates/create/route.ts` - For creating templates
- `src/app/api/templates/update/route.ts` - For updating templates
- `src/app/api/templates/delete/route.ts` - For deleting templates (already existed)

These API routes run on the server-side and use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies. The service role key has full admin access to the database.

**Key features:**
- Validates required fields (name, category, orientation)
- Uses service role key if available, falls back to anon key with warning
- Handles backward compatibility for `preview_image_path` column
- Returns detailed error messages with hints

### 2. Updated Template Functions

**File:** `src/lib/supabase/templates.ts`

Modified the `createTemplate` and `updateTemplate` functions to call the API routes instead of directly modifying the database from the client.

**Changes:**
- Replaced direct `supabaseClient.from('templates').insert()` call with `/api/templates/create`
- Replaced direct `supabaseClient.from('templates').update()` call with `/api/templates/update`
- API routes handle RLS bypass using service role key

## Setup Instructions

### Step 1: Add Service Role Key to Environment

Create or update `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# REQUIRED for template operations
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Step 2: Get Your Service Role Key

1. Open your Supabase Dashboard
2. Go to: **Project Settings** → **API**
3. Find the **service_role** key in the "Project API keys" section
4. Copy the key (it starts with `eyJ...`)
5. Paste it into your `.env.local` file

### Step 3: Restart Development Server

After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## Security Considerations

⚠️ **IMPORTANT:** The service role key bypasses ALL RLS policies and has full database access.

**Security best practices:**
- ✅ Only use service role key in server-side API routes
- ✅ Never expose service role key to the client
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use environment variables in production (Vercel, etc.)
- ❌ Never commit service role key to version control
- ❌ Never send service role key to the browser

## How It Works

### Before (Direct Client Insert - FAILS)
```
Browser → Supabase Client (anon key) → Database
                                         ↓
                                    RLS Policy Blocks ❌
```

### After (API Route with Service Key - WORKS)
```
Browser → Next.js API Route → Supabase Client (service_role key) → Database
                                                                      ↓
                                                              RLS Bypassed ✅
```

## Alternative Solutions

If you don't want to use the service role key, you can:

1. **Configure RLS Policies:** Update your Supabase RLS policies to allow authenticated users to insert templates
2. **Use Authentication:** Implement proper user authentication and configure RLS to allow inserts for authenticated users
3. **Disable RLS:** (Not recommended for production) Disable RLS on the templates table

### Example RLS Policy for Authenticated Users

If you want to allow authenticated users to create templates, add this policy in Supabase:

```sql
-- Allow authenticated users to insert templates
CREATE POLICY "Allow authenticated users to insert templates"
ON templates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own templates
CREATE POLICY "Allow authenticated users to update templates"
ON templates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete templates
CREATE POLICY "Allow authenticated users to delete templates"
ON templates
FOR DELETE
TO authenticated
USING (true);
```

## Testing

After applying the fix:

1. Make sure `.env.local` has the `SUPABASE_SERVICE_ROLE_KEY`
2. Restart the development server
3. Try creating a new template
4. Check the browser console and server logs for success messages

Expected console output:
```
🚀 Starting template creation process...
📤 Image file provided, starting upload...
✅ Image upload completed
💾 Inserting template data via API
✅ Template created successfully via API
🔍 Verifying template was saved
✅ Template verification successful
```

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY not set"
- Check that `.env.local` exists in the project root
- Verify the key name is exactly `SUPABASE_SERVICE_ROLE_KEY`
- Restart the development server after adding the key

### Error: "Failed to create template" (still)
- Verify the service role key is correct
- Check Supabase dashboard for any database errors
- Look at server console logs for detailed error messages

### Warning: "using anon key (may fail due to RLS)"
- This means the service role key is not set
- The operation will likely fail due to RLS policies
- Add the service role key to `.env.local`

## Files Modified

1. ✅ `src/app/api/templates/create/route.ts` - New API route for creating templates
2. ✅ `src/app/api/templates/update/route.ts` - New API route for updating templates
3. ✅ `src/lib/supabase/templates.ts` - Updated createTemplate and updateTemplate functions
4. ✅ `README.md` - Added environment configuration documentation
5. ✅ `RLS_FIX_DOCUMENTATION.md` - This file

## Related Files

- `src/app/api/templates/delete/route.ts` - Delete template API (already uses service role key)
- `src/hooks/use-templates.ts` - React hook that calls template functions
- `src/app/templates/page.tsx` - UI component for template management

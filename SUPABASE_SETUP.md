# Supabase Authentication Setup Guide

## Issue Resolved: "Invalid Refresh Token: Refresh Token Not Found"

The error you were experiencing was caused by missing Supabase environment variables. Here's how to fix it:

## Step 1: Create Environment File

Create a `.env.local` file in your project root with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 2: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in to your account
2. Select your project (or create a new one if you don't have one)
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → Use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Example Configuration

Your `.env.local` file should look like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Restart Development Server

After creating the `.env.local` file:

```bash
npm run dev
```

## What Was Fixed

1. **Enhanced Supabase Client Configuration**: Added PKCE flow and better session handling
2. **Improved Error Handling**: Better error messages for authentication failures
3. **Auth State Management**: Improved handling of token refresh and session state
4. **Environment Validation**: Added checks for missing Supabase credentials

## Additional Notes

- The `.env.local` file is ignored by git, so your credentials won't be committed
- Make sure your Supabase project has the necessary tables (`users`, `templates`) set up
- If you're still having issues, check the browser console for more detailed error messages

## Database Setup

Make sure your Supabase database has the required tables. Check the `database/` folder in your project for SQL setup scripts.

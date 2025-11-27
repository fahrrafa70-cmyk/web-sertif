import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Registration endpoint: creates a Supabase Auth user (email/password)
// and upserts a corresponding profile row into email_whitelist.
// Password is NEVER stored in our own tables; it is handled only by Supabase Auth.

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { email, password, full_name } = (body || {}) as {
      email?: string;
      password?: string;
      full_name?: string;
    };

    const normalizedEmail = email?.toLowerCase().trim() || '';
    const trimmedName = (full_name || '').trim();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Supabase env not configured for register endpoint');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 },
      );
    }

    // Client for Auth (email/password)
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1) Create Auth user (Supabase handles password hashing internally)
    const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName || normalizedEmail.split('@')[0],
        },
      },
    });

    if (signUpError) {
      // If user already exists in auth, surface a clear message
      if (signUpError.message.toLowerCase().includes('user already registered')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please login instead.' },
          { status: 409 },
        );
      }

      console.error('Supabase signUp error:', signUpError);
      return NextResponse.json({ error: signUpError.message }, { status: 500 });
    }

    const authUser = signUpData.user;
    if (!authUser) {
      return NextResponse.json(
        { error: 'Registration failed: missing auth user.' },
        { status: 500 },
      );
    }

    // Do NOT write to email_whitelist here. We only sync to whitelist
    // after a successful email/password login (which implies the email
    // has been confirmed).
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in /api/auth/register:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

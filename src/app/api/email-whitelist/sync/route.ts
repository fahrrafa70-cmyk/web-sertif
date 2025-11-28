import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Sync a verified user's email into email_whitelist.
// This endpoint is intended to be called AFTER a successful email/password login.

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

    const { email, full_name, role } = (body || {}) as {
      email?: string;
      full_name?: string;
      role?: string;
    };

    const normalizedEmail = email?.toLowerCase().trim() || '';
    const trimmedName = (full_name || '').trim();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase env not configured for whitelist sync');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: Record<string, unknown> = {
      email: normalizedEmail,
      full_name: trimmedName || normalizedEmail.split('@')[0],
      role: (role || 'user').toString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await adminClient
      .from('email_whitelist')
      .upsert(payload, { onConflict: 'email' });

    if (error) {
      console.error('email_whitelist sync failed:', error);
      return NextResponse.json(
        { error: 'Failed to sync whitelist entry.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in /api/email-whitelist/sync:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

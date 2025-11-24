import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, full_name, avatar_url, auth_provider, role } = body ?? {};

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required fields: id and email are mandatory.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        error: 'Server configuration error. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const payload: Record<string, unknown> = {
      id,
      email: email.toLowerCase(),
      full_name: full_name ?? null,
      avatar_url: avatar_url ?? null,
      auth_provider: auth_provider ?? null,
      role: role ?? 'member',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('❌ Upsert user failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('💥 Unexpected error during user upsert:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}



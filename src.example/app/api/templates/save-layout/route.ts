import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { TemplateLayoutConfig } from '@/types/template-layout';

/**
 * API Route: Save template layout configuration
 * POST /api/templates/save-layout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, layoutConfig, userId } = body as {
      templateId: string;
      layoutConfig: TemplateLayoutConfig;
      userId?: string;
    };

    if (!templateId || !layoutConfig) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: templateId and layoutConfig' },
        { status: 400 }
      );
    }

    console.log('💾 API: Saving template layout...', { templateId });

    // Setup Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    
    if (!keyToUse) {
      return NextResponse.json(
        { success: false, error: 'Supabase key not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const updateData: Record<string, unknown> = {
      layout_config: layoutConfig,
      layout_config_updated_at: new Date().toISOString(),
      is_layout_configured: true
    };

    if (userId) {
      updateData.layout_config_updated_by = userId;
    }

    const { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('❌ API: Failed to save layout:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ API: Layout saved successfully');

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('💥 API: Save layout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

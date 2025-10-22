import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, orientation, image_path, preview_image_path } = body;

    // Validate required fields
    if (!name?.trim() || !category?.trim() || !orientation?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, and orientation are required' },
        { status: 400 }
      );
    }

    console.log('🚀 API: Creating template...', { name, category, orientation });

    // Check if service role key is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set');
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    // Use service role key if available, otherwise fall back to anon key
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    
    if (!keyToUse) {
      console.error('❌ No Supabase key available');
      return NextResponse.json(
        { error: 'Supabase key not configured' },
        { status: 500 }
      );
    }

    if (!supabaseServiceKey) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set, using anon key (may fail due to RLS)');
    }

    // Create client (admin if service key available, otherwise regular)
    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Prepare insert data
    const insertData: Record<string, unknown> = {
      name: name.trim(),
      category: category.trim(),
      orientation: orientation.trim(),
    };

    // Add image paths if provided
    if (image_path) {
      insertData.image_path = image_path;
    }
    if (preview_image_path) {
      insertData.preview_image_path = preview_image_path;
    }

    console.log('💾 API: Inserting template data to database:', insertData);

    // Insert template
    let { data, error } = await supabase
      .from('templates')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      // Backward compatibility: retry without preview_image_path if column doesn't exist
      const columnMissing = typeof error.message === 'string' && error.message.includes('preview_image_path');
      if (columnMissing && preview_image_path) {
        console.warn('⚠️ preview_image_path column missing. Retrying insert without it.');
        delete insertData.preview_image_path;
        ({ data, error } = await supabase
          .from('templates')
          .insert([insertData])
          .select()
          .single());
      }
      
      if (error) {
        console.error('❌ API: Database insertion error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to create template',
            details: error.message,
            hint: error.hint || 'Check RLS policies or add SUPABASE_SERVICE_ROLE_KEY to .env.local'
          },
          { status: 500 }
        );
      }
    }

    // Verify the data was actually saved
    if (!data || !data.id) {
      console.error('❌ API: Template was not created - no data returned from database');
      return NextResponse.json(
        { error: 'Template was not created - no data returned from database' },
        { status: 500 }
      );
    }

    console.log('✅ API: Template created successfully', data);

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: data
    });

  } catch (error) {
    console.error('💥 API: Template creation failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

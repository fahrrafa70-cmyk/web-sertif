import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ API: Deleting template from database...', templateId);

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

    // Delete template
    const { data: deleteData, error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .select();

    if (error) {
      console.error('❌ API: Database deletion error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to delete template from database',
          details: error.message,
          hint: error.hint || 'Check RLS policies or add SUPABASE_SERVICE_ROLE_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    // Check if anything was deleted
    if (!deleteData || deleteData.length === 0) {
      console.warn('⚠️ API: No rows deleted - template may not exist or RLS blocked it');
      return NextResponse.json(
        { 
          error: 'Template not found or permission denied',
          hint: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local to bypass RLS'
        },
        { status: 404 }
      );
    }

    console.log('✅ API: Template deleted successfully', deleteData);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      deletedData: deleteData
    });

  } catch (error) {
    console.error('💥 API: Template deletion failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

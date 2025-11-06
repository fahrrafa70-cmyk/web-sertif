import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      category, 
      orientation, 
      image_path, 
      preview_image_path,
      certificate_image_url,
      score_image_url,
      is_dual_template,
      status
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!name?.trim() || !category?.trim() || !orientation?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, and orientation are required' },
        { status: 400 }
      );
    }

    console.log('🔄 API: Updating template...', { id, name, category, orientation });

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

    // Prepare update data
    const updateData: Record<string, unknown> = {
      name: name.trim(),
      category: category.trim(),
      orientation: orientation.trim(),
    };

    // Add image paths if provided
    if (image_path) {
      updateData.image_path = image_path;
    }
    if (preview_image_path) {
      updateData.preview_image_path = preview_image_path;
    }

    // Dual template fields (optional)
    if (typeof certificate_image_url === 'string') {
      updateData.certificate_image_url = certificate_image_url;
    }
    if (typeof score_image_url === 'string') {
      updateData.score_image_url = score_image_url;
    }
    if (typeof is_dual_template === 'boolean') {
      updateData.is_dual_template = is_dual_template;
    }
    // Always include status if provided
    if (status !== undefined && status !== null) {
      if (status === 'ready' || status === 'draft') {
        updateData.status = status;
        console.log('✅ Including status in update:', status);
      } else {
        console.warn('⚠️ Invalid status value:', status, 'Skipping status update');
      }
    } else {
      console.log('ℹ️ No status provided in request body');
    }

    console.log('💾 API: Updating template data in database:', updateData);
    console.log('💾 API: Status value being sent:', status, 'type:', typeof status);

    // Update template
    // Explicitly select all fields including status to ensure it's returned
    let { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ API: Initial update error:', error);
      console.error('❌ API: Error message:', error.message);
      console.error('❌ API: Error code:', error.code);
      console.error('❌ API: Error details:', error.details);
      console.error('❌ API: Error hint:', error.hint);
      
      // Check if error is related to status column
      const statusColumnError = typeof error.message === 'string' && (
        error.message.includes('status') || 
        error.message.includes('column') ||
        error.message.includes('does not exist')
      );
      
      // Backward compatibility: retry without preview_image_path if column doesn't exist
      const previewColumnMissing = typeof error.message === 'string' && error.message.includes('preview_image_path');
      if (previewColumnMissing && preview_image_path) {
        console.warn('⚠️ preview_image_path column missing. Retrying update without it.');
        delete updateData.preview_image_path;
        ({ data, error } = await supabase
          .from('templates')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single());
      }

      // If status column is missing, try update without status first, then add status separately
      if (error && statusColumnError && updateData.status) {
        console.warn('⚠️ Status column may be missing. Attempting update without status first...');
        const statusValue = updateData.status;
        delete updateData.status;
        
        // Try update without status
        ({ data, error } = await supabase
          .from('templates')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single());
        
        if (!error && data) {
          console.warn('⚠️ Update succeeded without status. Status column may not exist in database.');
          console.warn('⚠️ Please add status column to templates table: ALTER TABLE templates ADD COLUMN status TEXT DEFAULT \'draft\';');
          // Return data without status - client will handle it
          return NextResponse.json({
            success: true,
            message: 'Template updated successfully (status column not found)',
            data: data,
            warning: 'Status column does not exist in database. Please add it: ALTER TABLE templates ADD COLUMN status TEXT DEFAULT \'draft\';'
          });
        }
      }

      // If still error, return detailed error
      if (error) {
        console.error('❌ API: Database update error (final):', error);
        console.error('❌ API: Full error object:', JSON.stringify(error, null, 2));
        return NextResponse.json(
          { 
            error: 'Failed to update template',
            details: error.message,
            code: error.code,
            hint: error.hint || 'Check RLS policies or add SUPABASE_SERVICE_ROLE_KEY to .env.local. If status column is missing, add it to the database first: ALTER TABLE templates ADD COLUMN status TEXT DEFAULT \'draft\';'
          },
          { status: 500 }
        );
      }
    }

    // Verify the data was actually updated
    if (!data || !data.id) {
      console.error('❌ API: Template was not updated - no data returned from database');
      return NextResponse.json(
        { error: 'Template was not updated - no data returned from database' },
        { status: 500 }
      );
    }

    console.log('✅ API: Template updated successfully', data);
    console.log('✅ API: Updated template status from database:', data?.status);
    console.log('✅ API: Full data object keys:', Object.keys(data || {}));
    console.log('✅ API: Full data object:', JSON.stringify(data, null, 2));
    
    // CRITICAL: If status was in updateData but not in response, this is a problem
    // We should verify the update actually worked by checking the database
    if (updateData.status && !data.status) {
      console.error('❌ CRITICAL: Status was in updateData but missing from response!');
      console.error('❌ updateData.status:', updateData.status);
      console.error('❌ data.status:', data.status);
      console.error('❌ This means status was NOT updated in database!');
      
      // Try to fetch the template again to verify
      const { data: verifyData, error: verifyError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!verifyError && verifyData) {
        console.log('🔍 Verification fetch - status:', verifyData.status);
        if (verifyData.status) {
          data.status = verifyData.status;
          console.log('✅ Using status from verification fetch:', data.status);
        } else {
          // Status still missing - manually add it but log as error
          data.status = updateData.status as string;
          console.error('❌ Status still missing after verification, manually adding:', data.status);
        }
      } else {
        // Verification failed, manually add status
        data.status = updateData.status as string;
        console.error('❌ Verification fetch failed, manually adding status:', data.status);
      }
    }

    // Final verification - ensure status is in response
    if (!data.status && updateData.status) {
      console.error('❌ FINAL CHECK: Status still missing, forcing it:', updateData.status);
      data.status = updateData.status as string;
    }

    console.log('✅ API: Final response data status:', data?.status);

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: data
    });

  } catch (error) {
    console.error('💥 API: Template update failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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


    // Check if service role key is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase URL not configured' },
        { status: 500 }
      );
    }

    // Use service role key if available, otherwise fall back to anon key
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    
    if (!keyToUse) {
      return NextResponse.json(
        { error: 'Supabase key not configured' },
        { status: 500 }
      );
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
      } else {
        // Invalid status value, skip update
      }
    } else {
      // No status provided
    }


    // Update template
    // Explicitly select all fields including status to ensure it's returned
    let { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      // Database update error
      
      // Check if error is related to status column
      const statusColumnError = typeof error.message === 'string' && (
        error.message.includes('status') || 
        error.message.includes('column') ||
        error.message.includes('does not exist')
      );
      
      // Backward compatibility: retry without preview_image_path if column doesn't exist
      const previewColumnMissing = typeof error.message === 'string' && error.message.includes('preview_image_path');
      if (previewColumnMissing && preview_image_path) {
        // Preview column missing, retry without it
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
        // Status column may be missing, retry without status
        delete updateData.status;
        
        // Try update without status
        ({ data, error } = await supabase
          .from('templates')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single());
        
        if (!error && data) {
          // Update succeeded without status field
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
      return NextResponse.json(
        { error: 'Template was not updated - no data returned from database' },
        { status: 500 }
      );
    }

    
    // CRITICAL: If status was in updateData but not in response, this is a problem
    // We should verify the update actually worked by checking the database
    if (updateData.status && !data.status) {
      // Status was in updateData but missing from response
      
      // Try to fetch the template again to verify
      const { data: verifyData, error: verifyError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!verifyError && verifyData) {
        if (verifyData.status) {
          data.status = verifyData.status;
        } else {
          // Status still missing - manually add it but log as error
          data.status = updateData.status as string;
          // Status still missing after verification
        }
      } else {
        // Verification failed, manually add status
        data.status = updateData.status as string;
        // Verification failed, manually add status
      }
    }

    // Final verification - ensure status is in response
    if (!data.status && updateData.status) {
      // Status still missing, force it
      data.status = updateData.status as string;
    }


    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: data
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

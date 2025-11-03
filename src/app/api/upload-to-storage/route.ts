import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { imageData, fileName, bucketName = 'certificates' } = await request.json();

    if (!imageData || !fileName) {
      return NextResponse.json(
        { success: false, error: 'No image data or filename provided.' },
        { status: 400 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured.' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role key for storage access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Convert base64 data URL to buffer
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('📤 Uploading to Supabase Storage...', { fileName, bucketName, size: buffer.length });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png',
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      
      // Check if bucket doesn't exist
      if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Storage bucket '${bucketName}' not found. Please create it in Supabase Dashboard.` 
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to get public URL' },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded successfully:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl
    });

  } catch (error: unknown) {
    console.error('💥 Error uploading to storage:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}


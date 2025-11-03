import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Check if it's FormData (file upload) or JSON (base64 data)
    const contentType = request.headers.get('content-type') || '';
    let imageData: string | null = null;
    let fileName: string | null = null;
    let bucketName = 'certificates';
    let buffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (file upload)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      fileName = formData.get('fileName') as string;
      bucketName = (formData.get('bucketName') as string) || 'certificates';

      if (!file || !fileName) {
        return NextResponse.json(
          { success: false, error: 'No file or filename provided.' },
          { status: 400 }
        );
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Handle JSON (base64 data URL) - backward compatibility
      const body = await request.json();
      imageData = body.imageData;
      fileName = body.fileName;
      bucketName = body.bucketName || 'certificates';

      if (!imageData || !fileName) {
        return NextResponse.json(
          { success: false, error: 'No image data or filename provided.' },
          { status: 400 }
        );
      }

      // Convert base64 data URL to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
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

    if (!fileName || !buffer) {
      return NextResponse.json(
        { success: false, error: 'Missing required data.' },
        { status: 400 }
      );
    }

    console.log('📤 Uploading to Supabase Storage...', { fileName, bucketName, size: buffer.length });

    // Determine content type from file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif'
    };
    const contentType = contentTypeMap[ext || ''] || 'image/png';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType,
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


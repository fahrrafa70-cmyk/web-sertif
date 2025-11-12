import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    const { templateId } = await request.json();
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'Template ID is required'
      }, { status: 400 });
    }

    console.log(`🔄 Generating thumbnail for template: ${templateId}`);
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials not configured.'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template data
    const { data: template, error } = await supabase
      .from('templates')
      .select('id, name, image_path, certificate_image_url, thumbnail_path')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }

    // Skip if already has thumbnail
    if (template.thumbnail_path) {
      return NextResponse.json({
        success: true,
        message: 'Template already has thumbnail',
        thumbnailUrl: template.thumbnail_path
      });
    }

    // Get image URL to process
    const imageUrl = template.certificate_image_url || template.image_path;
    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'No image found for template'
      }, { status: 400 });
    }

    console.log(`📸 Processing image: ${imageUrl}`);

    // Generate thumbnail
    const thumbnailUrl = await generateThumbnailFromUrl(imageUrl, template.id, 'main');
    
    if (!thumbnailUrl) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate thumbnail'
      }, { status: 500 });
    }

    // Update database
    const { error: updateError } = await supabase
      .from('templates')
      .update({ thumbnail_path: thumbnailUrl })
      .eq('id', templateId);

    if (updateError) {
      console.error(`❌ Error updating template ${templateId}:`, updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update database'
      }, { status: 500 });
    }

    console.log(`✅ Thumbnail generated successfully for ${template.name}: ${thumbnailUrl}`);

    return NextResponse.json({
      success: true,
      templateId,
      templateName: template.name,
      thumbnailUrl,
      message: 'Thumbnail generated successfully'
    });

  } catch (error) {
    console.error('💥 Error in single thumbnail generation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

async function generateThumbnailFromUrl(imageUrl: string, templateId: string, type: string): Promise<string | null> {
  try {
    // Handle local files
    if (imageUrl.startsWith('/template/')) {
      const localPath = path.join(process.cwd(), 'public', imageUrl);
      
      // Check if file exists
      try {
        await access(localPath);
      } catch {
        console.warn(`⚠️ File not found: ${localPath}`);
        return null;
      }

      // Generate thumbnail
      const thumbnailBuffer = await sharp(localPath)
        .resize(320, 240, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Save thumbnail
      const thumbnailFileName = `${templateId}_${type}_thumb_320x240.webp`;
      const thumbnailDir = path.join(process.cwd(), 'public', 'template', 'thumbnails');
      await mkdir(thumbnailDir, { recursive: true });
      
      const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
      await writeFile(thumbnailPath, thumbnailBuffer);

      const thumbnailUrl = `/template/thumbnails/${thumbnailFileName}`;
      console.log(`✅ Generated local thumbnail: ${thumbnailUrl}`);
      return thumbnailUrl;
    }

    // Handle external URLs (Supabase storage, etc.)
    if (imageUrl.startsWith('http')) {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch image: ${imageUrl}`);
          return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Generate thumbnail
        const thumbnailBuffer = await sharp(buffer)
          .resize(320, 240, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toBuffer();

        // Save thumbnail
        const thumbnailFileName = `${templateId}_${type}_thumb_320x240.webp`;
        const thumbnailDir = path.join(process.cwd(), 'public', 'template', 'thumbnails');
        await mkdir(thumbnailDir, { recursive: true });
        
        const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
        await writeFile(thumbnailPath, thumbnailBuffer);

        const thumbnailUrl = `/template/thumbnails/${thumbnailFileName}`;
        console.log(`✅ Generated thumbnail from URL: ${thumbnailUrl}`);
        return thumbnailUrl;
      } catch (fetchError) {
        console.error(`❌ Error processing external URL ${imageUrl}:`, fetchError);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error generating thumbnail for ${imageUrl}:`, error);
    return null;
  }
}

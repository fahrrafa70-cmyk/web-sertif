import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(_request: Request) {
  try {
    console.log('🔄 Starting thumbnail regeneration for existing templates...');
    
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

    // Get all templates that don't have thumbnails yet
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, name, image_path, preview_image_path, certificate_image_url, score_image_url, thumbnail_path, preview_thumbnail_path')
      .or('thumbnail_path.is.null,preview_thumbnail_path.is.null');

    if (error) {
      console.error('❌ Error fetching templates:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log(`📋 Found ${templates?.length || 0} templates to process`);

    const results = [];
    let processed = 0;
    let errors = 0;

    for (const template of templates || []) {
      try {
        console.log(`🔄 Processing template: ${template.name} (${template.id})`);
        
        const updates: Record<string, string> = {};
        
        // Process main image
        if (template.image_path && !template.thumbnail_path) {
          const thumbnailUrl = await generateThumbnailFromUrl(template.image_path, template.id, 'main');
          if (thumbnailUrl) {
            updates.thumbnail_path = thumbnailUrl;
          }
        }

        // Process certificate image
        if (template.certificate_image_url && !template.thumbnail_path) {
          const thumbnailUrl = await generateThumbnailFromUrl(template.certificate_image_url, template.id, 'certificate');
          if (thumbnailUrl) {
            updates.certificate_thumbnail_path = thumbnailUrl;
          }
        }

        // Process preview image
        if (template.preview_image_path && !template.preview_thumbnail_path) {
          const thumbnailUrl = await generateThumbnailFromUrl(template.preview_image_path, template.id, 'preview');
          if (thumbnailUrl) {
            updates.preview_thumbnail_path = thumbnailUrl;
          }
        }

        // Update database if we have new thumbnails
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('templates')
            .update(updates)
            .eq('id', template.id);

          if (updateError) {
            console.error(`❌ Error updating template ${template.id}:`, updateError);
            errors++;
          } else {
            console.log(`✅ Updated template ${template.name} with thumbnails:`, Object.keys(updates));
            processed++;
          }
        }

        results.push({
          id: template.id,
          name: template.name,
          thumbnails_created: Object.keys(updates),
          success: Object.keys(updates).length > 0
        });

      } catch (templateError) {
        console.error(`❌ Error processing template ${template.id}:`, templateError);
        errors++;
        results.push({
          id: template.id,
          name: template.name,
          error: templateError instanceof Error ? templateError.message : 'Unknown error',
          success: false
        });
      }
    }

    console.log(`✅ Thumbnail regeneration completed. Processed: ${processed}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: templates?.length || 0,
      results
    });

  } catch (error) {
    console.error('💥 Error in thumbnail regeneration:', error);
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
      console.log(`✅ Generated thumbnail: ${thumbnailUrl}`);
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

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    console.log('🖼️ API Route: Generate thumbnail request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const width = parseInt(formData.get('width') as string) || 320;
    const height = parseInt(formData.get('height') as string) || 240;
    const quality = parseInt(formData.get('quality') as string) || 80;

    console.log('📋 API Route: Form data received', { 
      hasFile: !!file, 
      fileName, 
      fileSize: file?.size,
      fileType: file?.type,
      width,
      height,
      quality
    });

    if (!file || !fileName) {
      console.log('❌ API Route: Missing file or filename');
      return NextResponse.json({ 
        success: false, 
        error: 'No file or filename provided.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate thumbnail using Sharp
    const thumbnailBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality })
      .toBuffer();

    // Create thumbnail filename
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const thumbnailFileName = `${baseName}_thumb_${width}x${height}.webp`;
    
    // Ensure thumbnail directory exists
    const thumbnailDir = path.join(process.cwd(), 'public', 'template', 'thumbnails');
    await mkdir(thumbnailDir, { recursive: true });
    
    // Save thumbnail
    const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
    await writeFile(thumbnailPath, thumbnailBuffer);

    // Also save original if needed
    const originalDir = path.join(process.cwd(), 'public', 'template');
    await mkdir(originalDir, { recursive: true });
    const originalPath = path.join(originalDir, fileName);
    await writeFile(originalPath, buffer);

    const thumbnailUrl = `/template/thumbnails/${thumbnailFileName}`;
    const originalUrl = `/template/${fileName}`;
    
    console.log('✅ API Route: Thumbnail generated successfully:', {
      original: originalUrl,
      thumbnail: thumbnailUrl,
      originalSize: buffer.length,
      thumbnailSize: thumbnailBuffer.length,
      compressionRatio: Math.round((1 - thumbnailBuffer.length / buffer.length) * 100)
    });
    
    return NextResponse.json({ 
      success: true, 
      originalUrl,
      thumbnailUrl,
      originalSize: buffer.length,
      thumbnailSize: thumbnailBuffer.length,
      compressionRatio: Math.round((1 - thumbnailBuffer.length / buffer.length) * 100)
    });
  } catch (error: unknown) {
    console.error('💥 API Route: Error generating thumbnail:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

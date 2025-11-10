import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { imageData, fileName } = await request.json();
    
    if (!imageData || !fileName) {
      return NextResponse.json(
        { success: false, error: 'No image data or filename provided.' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Ensure the generate directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'generate');
    await mkdir(uploadDir, { recursive: true });

    // Save the file
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/generate/${fileName}`;
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    });

  } catch (error: unknown) {
    console.error('Error saving generated score locally:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

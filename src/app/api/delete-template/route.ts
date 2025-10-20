import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(request: Request) {
  try {
    console.log('🗑️ API Route: Delete template request received');
    
    const { fileName } = await request.json();

    if (!fileName) {
      console.log('❌ API Route: No filename provided');
      return NextResponse.json({ success: false, error: 'No filename provided.' }, { status: 400 });
    }

    // Sanitize filename to prevent directory traversal attacks
    const sanitizedFileName = path.basename(fileName);
    if (sanitizedFileName !== fileName) {
      console.log('⚠️ API Route: Filename sanitized:', fileName, '->', sanitizedFileName);
    }

    console.log('📁 API Route: Deleting file:', sanitizedFileName);

    const filePath = path.join(process.cwd(), 'public', 'template', sanitizedFileName);
    
    // Verify the file is within the expected directory
    const expectedDir = path.join(process.cwd(), 'public', 'template');
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(expectedDir);
    
    if (!resolvedPath.startsWith(resolvedDir)) {
      console.log('❌ API Route: Invalid file path - outside template directory');
      return NextResponse.json({ success: false, error: 'Invalid file path.' }, { status: 400 });
    }
    
    // Check if file exists before trying to delete
    try {
      await unlink(filePath);
      console.log('✅ API Route: File deleted successfully:', sanitizedFileName);
      return NextResponse.json({ success: true, message: `File ${sanitizedFileName} deleted successfully.` });
    } catch (unlinkError: unknown) {
      const code = (unlinkError as { code?: string })?.code;
      if (code === 'ENOENT') {
        console.log('⚠️ API Route: File not found (already deleted):', sanitizedFileName);
        return NextResponse.json({ success: true, message: `File ${sanitizedFileName} was already deleted.` });
      }
      throw unlinkError;
    }
  } catch (error: unknown) {
    console.error('💥 API Route: Error deleting file locally:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    console.log('📤 API Route: Upload template request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    console.log('📋 API Route: Form data received', { 
      hasFile: !!file, 
      fileName, 
      fileSize: file?.size,
      fileType: file?.type 
    });

    if (!file || !fileName) {
      console.log('❌ API Route: Missing file or filename');
      return NextResponse.json({ success: false, error: 'No file or filename provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(process.cwd(), 'public', 'template', fileName);
    
    console.log('💾 API Route: Writing file to:', filePath);
    await writeFile(filePath, buffer);

    const publicUrl = `/template/${fileName}`;
    console.log('✅ API Route: File uploaded successfully:', publicUrl);
    
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('💥 API Route: Error uploading file locally:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

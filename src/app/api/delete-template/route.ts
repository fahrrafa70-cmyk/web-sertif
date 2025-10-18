import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(request: Request) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'No filename provided.' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'template', fileName);
    await unlink(filePath);

    return NextResponse.json({ success: true, message: `File ${fileName} deleted.` });
  } catch (error: any) {
    console.error('Error deleting file locally:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

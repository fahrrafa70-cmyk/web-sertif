import { NextResponse } from 'next/server';
import { readdir, unlink, stat } from 'fs/promises';
import path from 'path';
import { supabaseClient } from '@/lib/supabase/client';

export async function POST() {
  try {
    console.log('🧹 Starting cleanup of orphaned template images...');
    
    // Get all template image paths from database
    const { data: templates, error: dbError } = await supabaseClient
      .from('templates')
      .select('image_path');
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    // Extract filenames from database records
    const dbImageFiles = new Set<string>();
    templates?.forEach(template => {
      if (template.image_path) {
        let fileName = template.image_path.split('/').pop();
        if (template.image_path.includes('template/')) {
          fileName = template.image_path.split('template/').pop();
        }
        if (fileName) {
          dbImageFiles.add(fileName);
        }
      }
    });
    
    console.log('📋 Found', dbImageFiles.size, 'image files in database');
    
    // Get all files in public/template directory
    const templateDir = path.join(process.cwd(), 'public', 'template');
    const files = await readdir(templateDir);
    
    console.log('📁 Found', files.length, 'files in template directory');
    
    // Find orphaned files (files that exist on disk but not in database)
    const orphanedFiles = files.filter(file => {
      // Skip non-image files
      if (!file.match(/\.(png|jpg|jpeg)$/i)) {
        return false;
      }
      return !dbImageFiles.has(file);
    });
    
    console.log('🗑️ Found', orphanedFiles.length, 'orphaned image files');
    
    // Delete orphaned files
    const deletedFiles = [];
    const failedDeletions = [];
    
    for (const file of orphanedFiles) {
      try {
        const filePath = path.join(templateDir, file);
        await unlink(filePath);
        deletedFiles.push(file);
        console.log('✅ Deleted orphaned file:', file);
      } catch (error) {
        console.error('❌ Failed to delete file:', file, error);
        failedDeletions.push({ file, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedFiles.length} orphaned files.`,
      deletedFiles,
      failedDeletions,
      stats: {
        totalFilesInDir: files.length,
        totalFilesInDb: dbImageFiles.size,
        orphanedFiles: orphanedFiles.length,
        successfullyDeleted: deletedFiles.length,
        failedDeletions: failedDeletions.length
      }
    });
    
  } catch (error: any) {
    console.error('💥 Cleanup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

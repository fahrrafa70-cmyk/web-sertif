/**
 * Debug utility untuk mengecek status thumbnail template
 */

import { Template } from '@/lib/supabase/templates';

export function debugTemplateImages(template: Template) {
  console.group(`🔍 Debug Template: ${template.name}`);
  
  // Cek semua path gambar yang tersedia
  console.log('📁 Available image paths:');
  console.log('  - image_path:', template.image_path);
  console.log('  - preview_image_path:', template.preview_image_path);
  console.log('  - certificate_image_url:', template.certificate_image_url);
  console.log('  - score_image_url:', template.score_image_url);
  
  console.log('🖼️ Available thumbnail paths:');
  console.log('  - thumbnail_path:', template.thumbnail_path);
  console.log('  - preview_thumbnail_path:', template.preview_thumbnail_path);
  console.log('  - certificate_thumbnail_path:', template.certificate_thumbnail_path);
  console.log('  - score_thumbnail_path:', template.score_thumbnail_path);
  
  // Tentukan URL yang akan digunakan
  const selectedUrl = template.preview_thumbnail_path || 
                     template.thumbnail_path || 
                     template.certificate_thumbnail_path ||
                     template.preview_image_path || 
                     template.image_path ||
                     template.certificate_image_url;
  
  const isOptimized = !!(template.preview_thumbnail_path || 
                        template.thumbnail_path || 
                        template.certificate_thumbnail_path);
  
  console.log('🎯 Selected URL:', selectedUrl);
  console.log('⚡ Is Optimized:', isOptimized ? '✅ YES' : '❌ NO (using original)');
  
  if (!isOptimized) {
    console.warn('⚠️ WARNING: Template menggunakan gambar asli (besar)!');
    console.log('💡 Solusi: Jalankan regenerasi thumbnail');
  }
  
  console.groupEnd();
  
  return {
    selectedUrl,
    isOptimized,
    needsRegeneration: !isOptimized
  };
}

export function checkAllTemplatesOptimization(templates: Template[]) {
  console.group('📊 Template Optimization Status');
  
  let optimized = 0;
  let needsOptimization = 0;
  
  templates.forEach(template => {
    const hasOptimizedThumbnail = !!(
      template.thumbnail_path || 
      template.preview_thumbnail_path || 
      template.certificate_thumbnail_path
    );
    
    if (hasOptimizedThumbnail) {
      optimized++;
      console.log(`✅ ${template.name} - Optimized`);
    } else {
      needsOptimization++;
      console.log(`❌ ${template.name} - Needs optimization`);
    }
  });
  
  console.log(`\n📈 Summary:`);
  console.log(`  - Optimized: ${optimized}/${templates.length}`);
  console.log(`  - Needs optimization: ${needsOptimization}/${templates.length}`);
  console.log(`  - Optimization rate: ${Math.round((optimized / templates.length) * 100)}%`);
  
  if (needsOptimization > 0) {
    console.warn(`\n⚠️ ${needsOptimization} template(s) masih menggunakan gambar asli!`);
    console.log('💡 Jalankan: npm run thumbnails:regenerate');
  }
  
  console.groupEnd();
  
  return {
    total: templates.length,
    optimized,
    needsOptimization,
    optimizationRate: Math.round((optimized / templates.length) * 100)
  };
}

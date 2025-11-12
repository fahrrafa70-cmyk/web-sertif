const fs = require('fs');
const path = require('path');

/**
 * Bundle analysis script to track optimization progress
 */

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeChunks() {
  const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks');
  
  if (!fs.existsSync(chunksDir)) {
    console.log('❌ Build directory not found. Run npm run build first.');
    return;
  }

  console.log('📦 Bundle Analysis Report');
  console.log('========================\n');

  const chunks = fs.readdirSync(chunksDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(chunksDir, file);
      const size = getFileSize(filePath);
      return { name: file, size, path: filePath };
    })
    .sort((a, b) => b.size - a.size);

  let totalSize = 0;
  let mainChunkSize = 0;
  let vendorChunkSize = 0;

  console.log('🔍 Largest Chunks:');
  chunks.slice(0, 10).forEach((chunk, index) => {
    totalSize += chunk.size;
    
    if (chunk.name.includes('main')) {
      mainChunkSize += chunk.size;
    } else if (chunk.name.includes('vendor') || chunk.name.includes('framework')) {
      vendorChunkSize += chunk.size;
    }

    console.log(`${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)}`);
  });

  console.log('\n📊 Summary:');
  console.log(`Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`Main Chunks: ${formatBytes(mainChunkSize)}`);
  console.log(`Vendor Chunks: ${formatBytes(vendorChunkSize)}`);
  console.log(`Number of Chunks: ${chunks.length}`);

  // Check for potential optimizations
  console.log('\n💡 Optimization Opportunities:');
  
  const largeChunks = chunks.filter(chunk => chunk.size > 500 * 1024); // > 500KB
  if (largeChunks.length > 0) {
    console.log(`⚠️  ${largeChunks.length} chunks are larger than 500KB - consider code splitting`);
  }

  const duplicateLibraries = findPotentialDuplicates(chunks);
  if (duplicateLibraries.length > 0) {
    console.log(`⚠️  Potential duplicate libraries detected: ${duplicateLibraries.join(', ')}`);
  }

  // Performance recommendations
  console.log('\n🚀 Performance Recommendations:');
  if (totalSize > 2 * 1024 * 1024) { // > 2MB
    console.log('• Bundle size is large - implement more aggressive code splitting');
  }
  if (mainChunkSize > 1024 * 1024) { // > 1MB
    console.log('• Main chunk is large - move more code to dynamic imports');
  }
  if (chunks.length < 5) {
    console.log('• Few chunks detected - consider splitting large components');
  }

  // Save analysis to file
  const analysis = {
    timestamp: new Date().toISOString(),
    totalSize,
    mainChunkSize,
    vendorChunkSize,
    chunkCount: chunks.length,
    largestChunks: chunks.slice(0, 10).map(c => ({ name: c.name, size: c.size }))
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'bundle-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );

  console.log('\n💾 Analysis saved to bundle-analysis.json');
}

function findPotentialDuplicates(chunks) {
  const libraries = ['react', 'lodash', 'moment', 'axios', 'framer-motion'];
  const found = [];
  
  libraries.forEach(lib => {
    const libChunks = chunks.filter(chunk => chunk.name.includes(lib));
    if (libChunks.length > 1) {
      found.push(lib);
    }
  });
  
  return found;
}

// Run analysis
analyzeChunks();

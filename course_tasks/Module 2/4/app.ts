import express from 'express';
import { FileProcessingService } from './FileProcessingService';

const app = express();
const port = 3000;

app.use(express.json());

const fileProcessingService = new FileProcessingService();

// Route to manually trigger file processing and categorization
app.post('/api/process-files', async (req, res) => {
  try {
    console.log('🚀 Starting file processing...');
    
    // Process all files (PNG, MP3, TXT)
    const processedFiles = await fileProcessingService.processAllFiles();
    console.log(`✅ Processed ${processedFiles.length} files`);
    
    // Categorize files using LLM
    const categoryResult = await fileProcessingService.categorizeFiles(processedFiles);
    console.log('✅ Categorization completed');
    
    // Save the answer to answer.json
    await fileProcessingService.saveAnswer(categoryResult);
    console.log('✅ Answer saved to answer.json');
    
    res.json({
      success: true,
      processedFiles: processedFiles.length,
      categories: {
        people: categoryResult.people.length,
        hardware: categoryResult.hardware.length
      },
      result: categoryResult
    });
  } catch (error) {
    console.error('❌ Error processing files:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route to get processing status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    message: 'File categorization service is running. Use POST /api/process-files to start processing.'
  });
});

// Route to check processed files count
app.get('/api/files-info', async (req, res) => {
  try {
    const fs = require('fs/promises');
    const path = require('path');
    const resourcesPath = path.join(__dirname, 'resources');
    const files = await fs.readdir(resourcesPath);
    
    const fileTypes = {
      png: files.filter((f: string) => f.endsWith('.png')).length,
      mp3: files.filter((f: string) => f.endsWith('.mp3')).length,
      txt: files.filter((f: string) => f.endsWith('.txt')).length
    };
    
    res.json({
      success: true,
      totalFiles: files.length,
      fileTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auto-run file processing on startup
const runProcessingOnStartup = async () => {
  console.log('\n📁 Starting automatic file processing...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  try {
    // Process all files
    const processedFiles = await fileProcessingService.processAllFiles();
    console.log(`\n✅ Successfully processed ${processedFiles.length} files:`);
    
    processedFiles.forEach(file => {
      console.log(`   📄 ${file.filename} (${file.type})`);
    });
    
    // Categorize files
    console.log('\n🤖 Starting categorization with LLM...');
    const categoryResult = await fileProcessingService.categorizeFiles(processedFiles);
    
    // Save answer
    await fileProcessingService.saveAnswer(categoryResult);
    
    console.log('\n🎉 File categorization completed:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`👥 People category (${categoryResult.people.length} files):`);
    categoryResult.people.forEach(file => console.log(`   • ${file}`));
    
    console.log(`\n🔧 Hardware category (${categoryResult.hardware.length} files):`);
    categoryResult.hardware.forEach(file => console.log(`   • ${file}`));
    
    console.log('\n📊 Summary:');
    console.log(`   Total files processed: ${processedFiles.length}`);
    console.log(`   Files in 'people' category: ${categoryResult.people.length}`);
    console.log(`   Files in 'hardware' category: ${categoryResult.hardware.length}`);
    console.log(`   Files categorized: ${categoryResult.people.length + categoryResult.hardware.length}`);
    
  } catch (error) {
    console.error('❌ Error in startup processing:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`🚀 File Categorization Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status');
  console.log('  GET  /api/files-info - Get files information');
  console.log('  POST /api/process-files - Process and categorize all files');
  
  // Auto-run file processing after a short delay
  setTimeout(runProcessingOnStartup, 2000);
});

// Export for direct execution
export { fileProcessingService };

// If running directly with node/ts-node/bun
if (require.main === module) {
  console.log('Running file processing directly...');
  runProcessingOnStartup()
    .then(() => {
      console.log('✅ Direct execution completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Direct execution error:', error);
      process.exit(1);
    });
} 
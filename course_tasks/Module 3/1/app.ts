import express from 'express';
import { DocumentAnalysisService } from './DocumentAnalysisService';

const app = express();
const port = 3000;

app.use(express.json());

const documentAnalysisService = new DocumentAnalysisService();

// Route to manually trigger the document analysis  
app.post('/api/analyze-documents', async (req, res) => {
  try {
    const analysisResult = await documentAnalysisService.analyzeAllDocuments();
    
    if (analysisResult.success && analysisResult.results) {
      const finalAnswer = documentAnalysisService.generateFinalAnswer(analysisResult);
      res.json(finalAnswer);
    } else {
      res.status(500).json({ 
        success: false, 
        error: analysisResult.error || 'Analysis failed' 
      });
    }
  } catch (error) {
    console.error('Error analyzing documents:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Route to get service status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ready', 
    message: 'Document Analysis service is running. Use POST /api/analyze-documents to analyze reports and generate keywords.' 
  });
});

// Auto-run the document analysis on startup
const runAnalysisOnStartup = async () => {
  console.log('\n📋 Starting automatic document analysis...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  try {
    const analysisResult = await documentAnalysisService.analyzeAllDocuments();
    
    if (analysisResult.success && analysisResult.results) {
      const finalAnswer = documentAnalysisService.generateFinalAnswer(analysisResult);
      
      console.log('\n🎉 Document analysis result:');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      
      console.log('\n📝 FINALNA ODPOWIEDŹ JSON:');
      console.log(JSON.stringify(finalAnswer, null, 2));
      
      console.log('\n📊 Podsumowanie:');
      console.log(`✅ Status: Sukces`);
      console.log(`📋 Przeanalizowano ${Object.keys(analysisResult.results).length} raportów`);
      
      console.log('\n🗂️ Słowa kluczowe dla każdego raportu:');
      Object.entries(analysisResult.results).forEach(([filename, keywords]) => {
        console.log(`  📄 ${filename}: ${keywords}`);
      });
      
    } else {
      console.log('❌ Analysis failed:', analysisResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error in startup analysis:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`🚀 Document Analysis Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status');
  console.log('  POST /api/analyze-documents - Analyze documents and generate keywords');
  
  // Auto-run the document analysis after a short delay
  setTimeout(runAnalysisOnStartup, 2000);
});

// Export for direct execution
export { documentAnalysisService };

// If running directly with node/ts-node
if (require.main === module) {
  console.log('Running document analysis directly...');
  documentAnalysisService.analyzeAllDocuments()
    .then(result => {
      if (result.success && result.results) {
        const finalAnswer = documentAnalysisService.generateFinalAnswer(result);
        console.log('Direct execution result:', JSON.stringify(finalAnswer, null, 2));
        process.exit(0);
      } else {
        console.error('Direct execution failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Direct execution error:', error);
      process.exit(1);
    });
} 
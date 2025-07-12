import 'dotenv/config';
import express from 'express';
import { DataProcessingService } from './DataProcessingService';

const app = express();
const port = 3000;

app.use(express.json());

const dataProcessingService = new DataProcessingService();

// Route to manually trigger the data processing with LLM and submission
app.post('/api/run-processing', async (req, res) => {
  try {
    console.log('🔄 Manual data processing with LLM triggered via API');
    
    // Pokazujemy statystyki przed przetworzeniem
    const beforeStats = dataProcessingService.getStats();
    console.log('📊 Statystyki przed przetworzeniem:');
    console.log(`   - Łączna liczba elementów: ${beforeStats.totalItems}`);
    console.log(`   - Elementy arytmetyczne: ${beforeStats.arithmeticItems}`);
    console.log(`   - Elementy testowe: ${beforeStats.testItems}`);
    
    const result = await dataProcessingService.processAndSubmit();
    
    res.json({ 
      success: true, 
      message: 'Data processing and submission completed successfully',
      serverResponse: result
    });
  } catch (error) {
    console.error('Error running data processing:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Route to get processing status and statistics
app.get('/api/status', (req, res) => {
  try {
    const stats = dataProcessingService.getStats();
    res.json({ 
      status: 'ready', 
      message: 'Data processing service is running. Use POST /api/run-processing to execute the processing.',
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Unable to get statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auto-run the data processing with LLM on startup
const runProcessingOnStartup = async () => {
  console.log('\n🚀 Starting automatic data processing with LLM execution...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  try {
    // Pokazujemy statystyki przed przetworzeniem
    const beforeStats = dataProcessingService.getStats();
    console.log('📊 Statystyki przed przetworzeniem:');
    console.log(`   - Łączna liczba elementów: ${beforeStats.totalItems}`);
    console.log(`   - Elementy arytmetyczne: ${beforeStats.arithmeticItems}`);
    console.log(`   - Elementy testowe: ${beforeStats.testItems}`);
    
    console.log('\n🔄 Rozpoczynam pełne przetwarzanie z LLM...');
    
    // Przetwarzamy dane z LLM i wysyłamy
    const result = await dataProcessingService.processAndSubmit();
    
    console.log('\n🎉 Startup data processing with LLM completed successfully!');
    console.log('📋 Odpowiedź z serwera:', result);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error in startup data processing with LLM:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status and statistics');
  console.log('  POST /api/run-processing - Manually trigger data processing');
  
  // Auto-run the processing only if not running in direct mode
  if (require.main !== module) {
    setTimeout(runProcessingOnStartup, 2000);
  }
});

// Export for direct execution
export { dataProcessingService };

// If running directly with node/ts-node
if (require.main === module) {
  console.log('Running data processing with LLM directly...');
  
  (async () => {
    try {
      const beforeStats = dataProcessingService.getStats();
      console.log('📊 Statystyki przed przetworzeniem:');
      console.log(`   - Łączna liczba elementów: ${beforeStats.totalItems}`);
      console.log(`   - Elementy arytmetyczne: ${beforeStats.arithmeticItems}`);
      console.log(`   - Elementy testowe: ${beforeStats.testItems}`);
      
      const result = await dataProcessingService.processAndSubmit();
      console.log('🎉 Task completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Direct execution error:', error);
      process.exit(1);
    }
  })();
} 
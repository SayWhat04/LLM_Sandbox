import express from 'express';
import { MapAnalysisService } from './MapAnalysisService';

const app = express();
const port = 3000;

app.use(express.json());

// Dostępne modele z obsługą vision (od najsilniejszego):
// - "gpt-4o" (najsilniejszy, domyślny)
// - "gpt-4-turbo" (bardzo dobry, stabilny)
// - "gpt-4-vision-preview" (starszy ale sprawdzony)  
// - "gpt-4o-mini" (najszybszy, tańszy ale mniej precyzyjny)
const mapAnalysisService = new MapAnalysisService(); // Używa domyślnego "gpt-4o"
// Lub: new MapAnalysisService("gpt-4-turbo") dla alternatywnego modelu

// Route to manually trigger the city analysis  
app.post('/api/analyze-city', async (req, res) => {
  try {
    const result = await mapAnalysisService.analyzeMapFragments();
    res.json(result);
  } catch (error) {
    console.error('Error analyzing city:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Route to get available map fragments
app.get('/api/fragments', async (req, res) => {
  try {
    const fragments = await mapAnalysisService.loadMapFragments();
    // Return metadata without base64 data for performance
    const fragmentsMetadata = fragments.map(f => ({
      id: f.id,
      filename: f.filename
    }));
    res.json({ 
      success: true,
      fragments: fragmentsMetadata 
    });
  } catch (error) {
    console.error('Error loading fragments:', error);
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
    message: 'City Analysis service is running. Use POST /api/analyze-city to analyze map fragments and identify the city.' 
  });
});

// Auto-run the city analysis on startup
const runAnalysisOnStartup = async () => {
  console.log('\n🗺️  Starting automatic city analysis...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  try {
    const result = await mapAnalysisService.analyzeMapFragments();
    console.log('\n🎉 City analysis result:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    if (result.success && result.finalAnswer) {
      console.log('\n🏙️ FINALNA ODPOWIEDŹ:');
      console.log(`${result.finalAnswer}`);
      console.log('═══════════════════════════════════════════════════════════════════════════════');
    }
    
    console.log('\n📊 Podsumowanie:');
    console.log(`✅ Status: ${result.success ? 'Sukces' : 'Błąd'}`);
    if (result.suggestedLocation) {
      console.log(`📍 Zidentyfikowane miasto: ${result.suggestedLocation}`);
    }
    if (result.confidence) {
      console.log(`🎯 Pewność: ${result.confidence}/10`);
    }
    if (result.incorrectFragment) {
      console.log(`❌ Błędny fragment: ${result.incorrectFragment}`);
    }
    if (result.error) {
      console.log(`🚫 Błąd: ${result.error}`);
    }
    
    console.log('\n📝 Pełna analiza JSON:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error in startup analysis:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`🚀 City Analysis Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status');
  console.log('  GET  /api/fragments - Get available map fragments');
  console.log('  POST /api/analyze-city - Analyze map fragments and identify city');
  
  // Auto-run the city analysis after a short delay
  setTimeout(runAnalysisOnStartup, 2000);
});

// Export for direct execution
export { mapAnalysisService };

// If running directly with node/ts-node
if (require.main === module) {
  console.log('Running city analysis directly...');
  mapAnalysisService.analyzeMapFragments()
    .then(result => {
      console.log('Direct execution result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Direct execution error:', error);
      process.exit(1);
    });
} 
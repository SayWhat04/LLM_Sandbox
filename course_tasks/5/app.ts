import 'dotenv/config';
import express from 'express';
import { CensureService } from './CensureService';

const app = express();
const port = 3000;

app.use(express.json());

const censureService = new CensureService();

// Route to manually trigger the censure process
app.post('/api/run-censure', async (req, res) => {
  try {
    console.log('🔄 Manual censure process triggered via API');
    const result = await censureService.processCensure();
    res.json(result);
  } catch (error) {
    console.error('Error running censure process:', error);
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
    message: 'Censure service is running. Use POST /api/run-censure to execute the censure process.' 
  });
});

// Auto-run the censure process on startup
const runCensureOnStartup = async () => {
  console.log('\n🚀 Starting automatic censure process execution...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  try {
    const result = await censureService.processCensure();
    console.log('\n🎉 Startup censure process result:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error in startup censure process:', error);
  }
};

// Start the server
app.listen(port, async () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/status - Check service status`);
  console.log(`   POST /api/run-censure - Manually trigger censure process`);
  console.log('');
  
  // Auto-run on startup
  await runCensureOnStartup();
}); 
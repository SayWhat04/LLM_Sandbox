import express from 'express';
import { VerificationService } from "./VerificationService";

const app = express();
const port = 3000;

app.use(express.json());

const verificationService = new VerificationService();

// Route to manually trigger the verification
app.post('/api/run-verification', async (req, res) => {
  try {
    console.log('🔄 Manual verification triggered via API');
    await verificationService.verify();
    res.json({ 
      success: true, 
      message: 'Verification completed successfully' 
    });
  } catch (error) {
    console.error('Error running verification:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Route to get verification status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ready', 
    message: 'Verification service is running. Use POST /api/run-verification to execute the verification.' 
  });
});

// Auto-run the verification on startup
const runVerificationOnStartup = async () => {
  console.log('\n🚀 Starting automatic verification execution...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  try {
    await verificationService.verify();
    console.log('\n🎉 Startup verification completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error in startup verification:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status');
  console.log('  POST /api/run-verification - Manually trigger verification');
  
  // Auto-run the verification after a short delay
  setTimeout(runVerificationOnStartup, 2000);
});

// Export for direct execution
export { verificationService };

// If running directly with node/ts-node
if (require.main === module) {
  console.log('Running verification directly...');
  verificationService.verify()
    .then(() => {
      console.log('Direct execution completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Direct execution error:', error);
      process.exit(1);
    });
} 
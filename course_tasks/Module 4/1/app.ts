import express from 'express';
import cors from 'cors';
import { PhotoProcessingService } from './PhotoProcessingService';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// POST endpoint to start photo processing
app.post('/process-photos', async (req, res) => {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const photoService = new PhotoProcessingService();
  
  try {
    console.log(`\n🚀 [${sessionId}] === Starting Barbara photo processing task ===`);
    
    const result = await photoService.processPhotos(sessionId);
    
    console.log(`✅ [${sessionId}] === Photo processing completed successfully ===\n`);
    
    res.json({
      success: true,
      message: 'Photo processing completed successfully',
      result: result,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error(`❌ [${sessionId}] Error during photo processing:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Photo processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: sessionId
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Barbara Photo Processing Service'
  });
});

// Info endpoint
app.get('/info', (req, res) => {
  res.json({
    service: 'Barbara Photo Processing Service',
    description: 'Processes photos of Barbara, enhances them using AI, and generates a detailed portrait description',
    endpoints: {
      'POST /process-photos': 'Start the photo processing workflow',
      'GET /health': 'Health check',
      'GET /info': 'Service information'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Barbara Photo Processing Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Service info: http://localhost:${PORT}/info`);
  console.log(`Process photos: POST http://localhost:${PORT}/process-photos`);
  console.log('');
  console.log('To start processing photos, send a POST request to /process-photos');
});

export default app; 
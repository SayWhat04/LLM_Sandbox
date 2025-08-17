import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OpenAIService } from './OpenAIService';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Inicjalizacja serwisów
const openaiService = new OpenAIService();

// Endpoint do obsługi instrukcji drona
app.post('/api/drone', async (req, res) => {
  try {
    console.log('🚁 Otrzymano instrukcję drona:', req.body);
    
    const { instruction } = req.body;
    
    if (!instruction || typeof instruction !== 'string') {
      return res.status(400).json({
        error: 'Brak instrukcji lub nieprawidłowy format',
        description: 'błąd'
      });
    }

    console.log('📍 Analizuję instrukcję:', instruction);
    
    let result;
    try {
      // Próba analizy z OpenAI
      result = await openaiService.analyzeDroneMovement(instruction);
      console.log('✅ Analiza OpenAI zakończona:', result);
    } catch (error) {
      console.warn('⚠️ OpenAI failed, using fallback:', error);
      // Fallback na wypadek problemów z OpenAI
      result = await openaiService.fallbackAnalysis(instruction);
      console.log('🔄 Fallback analysis result:', result);
    }

    const response = {
      description: result.description,
      // Dodatkowe pola do debugowania (nie są oceniane)
      debug: {
        finalPosition: result.finalPosition,
        reasoning: result.reasoning,
        instruction: instruction,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Odpowiedź:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Błąd w przetwarzaniu instrukcji drona:', error);
    
    res.status(500).json({
      description: 'błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd',
      debug: {
        instruction: req.body.instruction,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Endpoint testowy
app.get('/api/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Drone API is running',
    map: {
      size: '4x4',
      startPosition: { row: 1, col: 1 },
      description: 'Lewy górny róg to punkt startowy (pin)'
    }
  });
});

// Endpoint do sprawdzenia statusu
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    service: 'Drone Navigation API',
    version: '1.0.0',
    endpoints: {
      'POST /api/drone': 'Analyze drone movement instruction',
      'GET /api/test': 'Test endpoint',
      'GET /api/status': 'Service status'
    },
    mapInfo: {
      size: '4x4 grid',
      startPosition: 'Top-left corner (1,1)',
      totalPositions: 16
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Drone Navigation API',
    version: '1.0.0',
    documentation: {
      'POST /api/drone': {
        description: 'Send drone movement instruction',
        body: { instruction: 'string describing drone movement' },
        response: { description: 'location description (max 2 words)' }
      }
    }
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({
    description: 'błąd',
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log('🚁 Drone Navigation API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 Server running on port ${port}`);
  console.log('📡 Available endpoints:');
  console.log('   POST /api/drone - Analyze drone movement');
  console.log('   GET  /api/test  - Test endpoint');
  console.log('   GET  /api/status - Service status');
  console.log('   GET  /health    - Health check');
  console.log('');
  console.log('🗺️ Map Configuration:');
  console.log('   Size: 4x4 grid');
  console.log('   Start: Top-left corner (1,1) - Pin');
  console.log('   Total positions: 16');
  console.log('═══════════════════════════════════════════════════════════');
});

export default app; 
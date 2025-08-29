import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OpenAIService } from './OpenAIService';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Inicjalizacja serwisów
const openaiService = new OpenAIService();

// Interfejsy dla typów danych
interface ApiResponse {
  code?: number;
  message?: string | {
    signature?: string;
    timestamp?: number;
    challenges?: string[];
  };
  timestamp?: string;
  signature?: string;
  source0?: string;
  source1?: string;
  [key: string]: any;
}

interface SourceData {
  task?: string;
  data?: any;
  [key: string]: any;
}

// Funkcja do wykonania zapytania HTTP
async function makeRequest(url: string, body: any): Promise<ApiResponse> {
  
  
  console.log('body before request ', JSON.stringify(body))
  
    const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  console.log('response.status:', response.status);
  console.log('response.ok:', response.ok);

  // Zawsze pobieramy i logujemy odpowiedź JSON, niezależnie od statusu HTTP
  const jsonResponse = await response.json();
  console.log('Full JSON response:', JSON.stringify(jsonResponse, null, 2));

  if (!response.ok) {
    console.log('❌ HTTP error but got JSON response - check the message above');
    throw new Error(`HTTP error! status: ${response.status}, response: ${JSON.stringify(jsonResponse)}`);
  }

  return jsonResponse;
}

// Funkcja do ładowania dodatkowego kontekstu
function loadAdditionalContext(): string {
  try {
    const contextPath = join(__dirname, 'processed_article.md');
    return readFileSync(contextPath, 'utf-8');
  } catch (error) {
    console.warn('⚠️ Could not load additional context file:', error);
    return '';
  }
}

// Funkcja do pobrania danych ze źródła
async function fetchSourceData(url: string): Promise<SourceData> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Funkcja do przetwarzania zadania z ewentualnym kontekstem artykułu
async function processTaskWithLLM(taskData: SourceData, openaiService: OpenAIService): Promise<string[]> {
  const task = taskData.task || '';
  const data = taskData.data || taskData;
  
  console.log(`   🔍 Analyzing task: "${task}"`);
  console.log(`   📊 Data type: ${typeof data}, Preview: ${typeof data === 'string' ? data.substring(0, 100) + '...' : JSON.stringify(data).substring(0, 100) + '...'}`);
  
  // Sprawdzamy czy zadanie wymaga kontekstu artykułu (nie przekazujemy URL-i do LLM!)
  const taskLower = task.toLowerCase();
  const requiresArticleContext = taskLower.includes('html') || 
                                taskLower.includes('strona') || 
                                taskLower.includes('website') || 
                                taskLower.includes('zawartość strony') ||
                                taskLower.includes('content of') ||
                                taskLower.includes('page content') ||
                                taskLower.includes('treść strony') ||
                                taskLower.includes('pobierz stronę') ||
                                taskLower.includes('fetch page') ||
                                taskLower.includes('scrape') ||
                                taskLower.includes('analyze page') ||
                                taskLower.includes('źródło wiedzy') ||
                                taskLower.includes('przeanalizuj stronę') ||
                                taskLower.includes('https://');
  
  console.log('requiresArticleContext:', requiresArticleContext);
  console.log('data:', data);
  
  if (requiresArticleContext) {
    console.log(`   📚 Task requires article context - loading processed article`);
    
    // Ładowanie kontekstu z pliku (nie przekazujemy URL-i do LLM!)
    const articleContext = loadAdditionalContext();
    console.log(`   ✅ Article context loaded (${articleContext.length} characters)`);
    
    if (!articleContext) {
      throw new Error('Could not load required article context');
    }
    
         // Przekazujemy dane i dodatkowy kontekst artykułu
     console.log(`   🤖 Sending task with original data + article context to LLM (no URLs)`);
     return await openaiService.executeTask(task, data, articleContext);
  } else {
    // Dla innych zadań używamy oryginalnych danych
    return await openaiService.executeTask(task, data);
  }
}

// Główny endpoint do wykonania całego procesu
app.post('/api/process', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting the complete process...');
    console.log('═══════════════════════════════════════════════════════════');
    
    const baseUrl = 'https://rafal.ag3nts.org/b46c3';
    
    // Krok 1: Pierwszym zapytaniem z hasłem
    console.log('📤 Step 1: Sending password...');
    const step1Response = await makeRequest(baseUrl, {
      password: "NONOMNISMORIAR"
    });
    
    console.log('✅ Step 1 completed, received message:', step1Response.message);
    
    if (!step1Response.message) {
      throw new Error('No message received in step 1');
    }
    
    // Krok 2: Drugie zapytanie z hash-em
    console.log('📤 Step 2: Sending signature...');
    const step2Response = await makeRequest(baseUrl, {
      sign: step1Response.message
    });
    
    console.log('✅ Step 2 completed, received response:');
    
    // Type guard dla message object
    const messageData = typeof step2Response.message === 'object' ? step2Response.message : null;
    
    console.log('   timestamp:', messageData?.timestamp);
    console.log('   signature:', messageData?.signature);
    console.log('   challenges:', messageData?.challenges);
    
    // Pobieranie URL-i z tablicy challenges
    const source0 = messageData?.challenges?.[0];
    const source1 = messageData?.challenges?.[1];
    
    console.log('   source0:', source0);
    console.log('   source1:', source1);
    
    if (!source0 || !source1) {
      throw new Error('Missing source URLs in step 2 response challenges array');
    }
    
    // Aktualizujemy step2Response aby zawierał prawidłowe pola dla dalszego przetwarzania
    step2Response.source0 = source0;
    step2Response.source1 = source1;
    step2Response.timestamp = messageData?.timestamp?.toString();
    step2Response.signature = messageData?.signature;
    
    // Krok 3: Pobieranie danych z obu źródeł współbieżnie
    console.log('📥 Step 3: Fetching data from both sources concurrently...');
    console.log('step2Response.source0 ', step2Response.source0)
    
    const [source0Data, source1Data] = await Promise.all([
      fetchSourceData(step2Response.source0!),
      fetchSourceData(step2Response.source1!)
    ]);
    
    console.log('✅ Data fetched from both sources');
    console.log('   source0 task:', source0Data.task);
    console.log('   source1 task:', source1Data.task);
    
    // Krok 4: Wykonanie zadań z pomocą LLM współbieżnie
    console.log('🤖 Step 4: Processing tasks with LLM concurrently...');
    const [result0, result1] = await Promise.all([
      processTaskWithLLM(source0Data, openaiService),
      processTaskWithLLM(source1Data, openaiService)
    ]);
    
    console.log('✅ LLM tasks completed');
    console.log('   source0 result:', result0);
    console.log('   source1 result:', result1);
    
    // Krok 5: Scalenie wyników i wysłanie odpowiedzi
    console.log('📤 Step 5: Merging results and sending final answer...');
    
    // Scalenie wyników w jedną tablicę
    const mergedAnswerArray = [...result0, ...result1];
    
    console.log('📋 Merged answer array to send:');
    console.log(JSON.stringify(mergedAnswerArray, null, 2));
    


    console.log('🚀 Step 5: Sending final request...');
    const finalResponse = await makeRequest(baseUrl, {
      answer: mergedAnswerArray,
      signature: step2Response.signature,
      timestamp: step2Response.timestamp,
      apikey: "97ad060a-008e-40cc-8012-f8cbaaa3968e"
    });
    
    const elapsedTime = Date.now() - startTime;
    console.log('✅ Process completed successfully!');
    console.log(`⏱️ Total time: ${elapsedTime}ms (${(elapsedTime/1000).toFixed(2)}s)`);
    console.log('📋 Final response structure:');
    console.log('   code:', finalResponse.code);
    console.log('   message:', finalResponse.message);
    console.log('   Full response:', JSON.stringify(finalResponse, null, 2));
    console.log('═══════════════════════════════════════════════════════════');
    
    res.json({
      success: true,
      elapsedTimeMs: elapsedTime,
      elapsedTimeSeconds: elapsedTime / 1000,
      steps: {
        step1: { message: step1Response.message },
        step2: { 
          timestamp: step2Response.timestamp,
          signature: step2Response.signature,
          source0: step2Response.source0,
          source1: step2Response.source1
        },
        step3: {
          source0Data: source0Data,
          source1Data: source1Data
        },
        step4: {
          source0Result: result0,
          source1Result: result1
        },
        step5: {
          mergedAnswerArray: mergedAnswerArray,
          finalResponse: finalResponse
        }
      }
    });
    
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error('❌ Error in process:', error);
    console.error(`⏱️ Failed after: ${elapsedTime}ms (${(elapsedTime/1000).toFixed(2)}s)`);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      elapsedTimeMs: elapsedTime,
      elapsedTimeSeconds: elapsedTime / 1000
    });
  }
});

// Endpoint testowy
app.get('/api/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Agent Challenge API is running',
    endpoints: {
      'POST /api/process': 'Execute the complete challenge process',
      'GET /api/status': 'Service status'
    }
  });
});

// Endpoint do sprawdzenia statusu
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    service: 'Agent Challenge API',
    version: '1.0.0',
    description: 'Executes the multi-step challenge with LLM processing',
    timeLimit: '6 seconds',
    steps: [
      '1. Send password to get message hash',
      '2. Send hash to get source URLs',
      '3. Fetch data from both sources concurrently',
      '4. Process tasks with LLM concurrently',
      '5. Merge results and submit answer'
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Agent Challenge API',
    version: '1.0.0',
    documentation: {
      'POST /api/process': {
        description: 'Execute the complete multi-step challenge',
        response: 'Complete process results with timing information'
      }
    }
  });
});

// Auto-run process on startup (opcjonalnie)
const runProcessOnStartup = async () => {
  console.log('\n🚀 Auto-running process on startup...');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    const startTime = Date.now();
    const baseUrl = 'https://rafal.ag3nts.org/b46c3';
    
    // Wykonanie całego procesu
    const step1Response = await makeRequest(baseUrl, {
      password: "NONOMNISMORIAR"
    });
    
    const step2Response = await makeRequest(baseUrl, {
      sign: step1Response.message
    });
    
    // Obsługa struktury odpowiedzi z message object
    const messageData = typeof step2Response.message === 'object' ? step2Response.message : null;
    const source0 = messageData?.challenges?.[0];
    const source1 = messageData?.challenges?.[1];
    const signature = messageData?.signature;
    const timestamp = messageData?.timestamp?.toString();
    
    if (!source0 || !source1) {
      throw new Error('Missing source URLs in startup step 2 response challenges array');
    }
    
    const [source0Data, source1Data] = await Promise.all([
      fetchSourceData(source0),
      fetchSourceData(source1)
    ]);
    
    const [result0, result1] = await Promise.all([
      processTaskWithLLM(source0Data, openaiService),
      processTaskWithLLM(source1Data, openaiService)
    ]);
    
    const mergedAnswerArray = [...result0, ...result1];
    
    const finalResponse = await makeRequest(baseUrl, {
      answer: mergedAnswerArray,
      signature: signature,
      timestamp: timestamp,
      apikey: "97ad060a-008e-40cc-8012-f8cbaaa3968e"
    });
    
    const elapsedTime = Date.now() - startTime;
    
    console.log('\n✅ Startup process completed successfully:');
    console.log(`   Time: ${(elapsedTime/1000).toFixed(2)}s`);
    console.log('📋 Startup Final response structure:');
    console.log('   code:', finalResponse.code);
    console.log('   message:', finalResponse.message);
    console.log(`   Full response: ${JSON.stringify(finalResponse)}`);
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error in startup process:', error);
  }
};

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log('🤖 Agent Challenge API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 Server running on port ${port}`);
  console.log('📡 Available endpoints:');
  console.log('   POST /api/process - Execute complete challenge');
  console.log('   GET  /api/test    - Test endpoint');
  console.log('   GET  /api/status  - Service status');
  console.log('   GET  /health      - Health check');
  console.log('');
  console.log('⚡ Challenge Configuration:');
  console.log('   Time limit: 6 seconds');
  console.log('   Steps: 5 (password → hash → sources → LLM → answer)');
  console.log('   Concurrency: Sources and LLM tasks run in parallel');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Auto-run process after a short delay (opcjonalnie - odkomentuj jeśli potrzebne)
  // setTimeout(runProcessOnStartup, 3000);
});

export default app; 
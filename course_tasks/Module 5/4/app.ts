import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { OpenAIService } from './OpenAIService';
import { Agent } from './AgentService';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

const state: State = {
  tools: [
    {
      name: "simple_llm_question",
      description: "Use this tool when you need to ask LLM. No external tools and informations are needed to answer the question.",
      instruction: "...",
      parameters: JSON.stringify({
        query: 'Question asked to LLM.'
      }),
    },
    //{
    //  name: "external_file_analysis",
    //  description: "Use this tool when user asks you to analyze external file. File can be audio or image.",
    //  instruction: "...",
    //  parameters: JSON.stringify({
    //    query: 'URL of the file to analyze.'
    //  }),
    //}
    {
      name: "analyze_image",
      description: "Use this tool when user asks you to analyze image.",
      instruction: "...",
      parameters: JSON.stringify({
        query: 'URL of the file to analyze.'
      }),
    },
    {
      name: "analyze_audio",
      description: "Use this tool when user asks you to analyze audio.",
      instruction: "...",
      parameters: JSON.stringify({
        query: 'URL of the file to analyze.'
      }),
    }

  ],
  history: []
};
// Inicjalizacja serwisów
const openaiService = new OpenAIService();
const agentService = new Agent(state);

export type State = {
  tools: Tool[];
  history: Interaction[];
}

type Interaction = {
  question: string;
  answer: string;
}

type Tool = {
  name: string;
  description: string;
  instruction: string;
  parameters: string;
}



// Endpoint do obsługi pytań
app.post('/api/chat', async (req, res) => {
  try {
    console.log('🤖 Otrzymano pytanie:', req.body);
    
    const { question } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Brak pytania lub nieprawidłowy format',
        description: 'błąd'
      });
    }

    console.log('📍 Przetwarzam pytanie:', question);
    
    let result;
    let tool;
    try {
      // Przetwarzanie pytania przez OpenAI
      // result = await openaiService.processQuestion(question);
      // console.log('✅ Odpowiedź OpenAI:', result);


      tool = await agentService.plan(question);
      console.log('✅ Tool:', tool);

      result = await agentService.useTool(tool.tool, question);  
      console.log('✅ Result:', result);

    } catch (error) {
      console.error('⚠️ Błąd OpenAI:', error);
      throw error;
    }

    state.history.push({ question: question, answer: result });

    const response = {
      answer: result,
      // Dodatkowe pola do debugowania (nie są oceniane)
      debug: {
        question: question,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Błąd w przetwarzaniu pytania:', error);
    
    res.status(500).json({
      description: 'błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd',
      debug: {
        question: req.body.question,
        timestamp: new Date().toISOString()
      }
    });
  }
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
  console.log('🤖 Question Processing API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 Server running on port ${port}`);
  console.log('📡 Available endpoints:');
  console.log('   POST /api/chat - Process questions');
  console.log('═══════════════════════════════════════════════════════════');
});

export default app; 
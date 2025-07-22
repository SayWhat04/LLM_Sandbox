import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam, ChatCompletion, ChatCompletionChunk } from "openai/resources/chat/completions";
import { createByModelName } from '@microsoft/tiktokenizer';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { Readable } from "stream";
import Groq from "groq-sdk";

export class OpenAIService {
  private openai: OpenAI;
  private tokenizers: Map<string, Awaited<ReturnType<typeof createByModelName>>> = new Map();
  private readonly IM_START = "<|im_start|>";
  private readonly IM_END = "<|im_end|>";
  private readonly IM_SEP = "<|im_sep|>";
  private groq: Groq;
  private lastRequestTime: number = 0;
  private minDelayBetweenRequests: number = 500; // 500ms między requestami

  constructor() {
    this.openai = new OpenAI();
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  private async getTokenizer(modelName: string) {
    if (!this.tokenizers.has(modelName)) {
      const specialTokens: ReadonlyMap<string, number> = new Map([
        [this.IM_START, 100264],
        [this.IM_END, 100265],
        [this.IM_SEP, 100266],
      ]);
      const tokenizer = await createByModelName(modelName, specialTokens);
      this.tokenizers.set(modelName, tokenizer);
    }
    return this.tokenizers.get(modelName)!;
  }

  async countTokens(messages: ChatCompletionMessageParam[], model: string = 'gpt-4o'): Promise<number> {
    const tokenizer = await this.getTokenizer(model);

    let formattedContent = '';
    messages.forEach((message) => {
      formattedContent += `${this.IM_START}${message.role}${this.IM_SEP}${message.content || ''}${this.IM_END}`;
    });
    formattedContent += `${this.IM_START}assistant${this.IM_SEP}`;

    const tokens = tokenizer.encode(formattedContent, [this.IM_START, this.IM_END, this.IM_SEP]);
    return tokens.length;
  }

  async completion(config: {
    messages: ChatCompletionMessageParam[],
    model?: string,
    stream?: boolean,
    temperature?: number,
    jsonMode?: boolean,
    maxTokens?: number
  }): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const { messages, model = "gpt-4o", stream = false, jsonMode = false, maxTokens = 4096, temperature = 0 } = config;
    
    // Rate limiting - czekaj minimalny czas między requestami
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const delay = this.minDelayBetweenRequests - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: czekam ${delay}ms...`);
      await this.sleep(delay);
    }
    this.lastRequestTime = Date.now();

    const maxRetries = 5;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestConfig: any = {
          messages,
          model,
          stream,
          response_format: jsonMode ? { type: "json_object" } : { type: "text" }
        };

        // Modele o1 używają max_completion_tokens i nie obsługują temperature
        if (model === 'o1-preview' || model === 'o1-mini') {
          requestConfig.max_completion_tokens = maxTokens;
        } else {
          requestConfig.max_tokens = maxTokens;
          requestConfig.temperature = temperature;
        }

        const chatCompletion = await this.openai.chat.completions.create(requestConfig);
        
        return chatCompletion;
      } catch (error: any) {
        lastError = error;
        
        // Sprawdź czy to rate limit error (429)
        if (error?.status === 429 || error?.message?.includes('Rate limit')) {
          // Exponential backoff: 2^attempt sekund (+ losowy offset)
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`🔄 Rate limit osiągnięty. Próba ${attempt}/${maxRetries}. Czekam ${Math.round(delay/1000)}s...`);
          
          if (attempt < maxRetries) {
            await this.sleep(delay);
            continue;
          }
        }
        
        // Inne błędy - nie retry
        console.error("Error in OpenAI completion:", error);
        throw error;
      }
    }

    console.error("Wyczerpano wszystkie próby:", lastError);
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isStreamResponse(response: ChatCompletion | AsyncIterable<ChatCompletionChunk>): response is AsyncIterable<ChatCompletionChunk> {
    return Symbol.asyncIterator in response;
  }

  parseJsonResponse<IResponseFormat>(response: ChatCompletion): IResponseFormat | { error: string, result: boolean } {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid response structure');
      }
      const parsedContent = JSON.parse(content);
      return parsedContent;
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return { error: 'Failed to process response', result: false };
    }
  }

  async transcribeGroq(audioBuffer: Buffer): Promise<string> {
    console.log("Transcribing audio with Groq...");
    const transcription = await this.groq.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'speech.mp3'),
      language: 'pl',
      model: 'whisper-large-v3',
    });
    return transcription.text;
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    console.log("Transcribing audio with OpenAI...");
    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'speech.mp3'),
      language: 'pl',
      model: 'whisper-1',
    });
    return transcription.text;
  }

  async analyzeImage(imageBuffer: Buffer, prompt: string, useFallback: boolean = false): Promise<string> {
    console.log("Analyzing image...");
    const base64Image = imageBuffer.toString('base64');
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: useFallback ? "low" : "high"
            }
          }
        ]
      }
    ];

    const model = useFallback ? "gpt-4o-mini" : "gpt-4o";
    console.log(`📸 Używam modelu: ${model}`);

    const response = await this.completion({
      messages,
      model,
      maxTokens: useFallback ? 2048 : 4096
    }) as ChatCompletion;

    return response.choices[0]?.message?.content || "";
  }

  async answerQuestion(question: string, context: string, modelTier: 'premium' | 'standard' | 'fallback' = 'premium'): Promise<string> {
    console.log(`Answering question: ${question.substring(0, 100)}...`);
    
    // Wybierz model i konfigurację na podstawie tier
    let model: string;
    let maxTokens: number;
    let contextLimit: number;
    let useSystemMessage: boolean = true;

    switch (modelTier) {
      case 'premium':
        model = "o1-preview";
        maxTokens = 32768; // o1-preview ma większy limit
        contextLimit = 32000; // Większy kontekst dla o1
        useSystemMessage = false; // o1 nie wspiera system messages
        break;
      case 'standard':
        model = "gpt-4o";
        maxTokens = 2000;
        contextLimit = 16000;
        useSystemMessage = true;
        break;
      case 'fallback':
        model = "gpt-4o-mini";
        maxTokens = 1000;
        contextLimit = 8000;
        useSystemMessage = true;
        break;
    }

    console.log(`💭 Używam modelu: ${model} (tier: ${modelTier})`);

    // Przygotuj messages w zależności od modelu
    let messages: ChatCompletionMessageParam[];
    
    if (useSystemMessage) {
      messages = [
        {
          role: "system", 
          content: `Jesteś ekspertem w analizie tekstów naukowych. 

ZASADY ODPOWIADANIA:
1. Odpowiedzi MUSZĄ być KRÓTKIE i ZWIĘZŁE (maksymalnie 1-2 zdania lub pojedyncze słowo/fraza)
2. Odpowiadaj WYŁĄCZNIE na podstawie dostarczonego kontekstu
3. PRZED udzieleniem odpowiedzi, przeszukaj CAŁY kontekst pod kątem skrótowców i akronimów
4. Jeśli w swojej odpowiedzi używasz skrótowca, ZAWSZE zastąp go pełnym rozwinięciem znajdującym się w tekście
5. Nie dodawaj wyjaśnień ani kontekstu - podaj tylko bezpośrednią odpowiedź z rozwiniętymi skrótami
6. Jeśli nie ma informacji, odpowiedz "Brak informacji w artykule"`
        },
        {
          role: "user",
          content: `KONTEKST:
${context}

PYTANIE: ${question}

INSTRUKCJA: Przeanalizuj pytanie. Jeśli odpowiedź zawierałaby jakiekolwiek skrótowce lub akronimy, znajdź ich pełne rozwinięcia w powyższym kontekście i użyj pełnych nazw zamiast skrótów.

ODPOWIEDŹ (krótka, zwięzła, z rozwiniętymi skrótami):`
        }
      ];
    } else {
      // o1 models - jeden message bez system
      messages = [
        {
          role: "user",
          content: `Przeanalizuj poniższy artykuł naukowy i odpowiedz na pytanie.

ZASADY:
- Odpowiedź MUSI być KRÓTKA i ZWIĘZŁA (maksymalnie 1-2 zdania lub pojedyncze słowo)
- Odpowiadaj WYŁĄCZNIE na podstawie artykułu
- PRZEDE WSZYSTKIM przeszukaj CAŁY artykuł pod kątem skrótowców i ich znaczeń
- Nie dodawaj dodatkowych wyjaśnień - podaj tylko bezpośrednią odpowiedź z rozwiniętymi skrótami
- Jeśli nie ma informacji, napisz "Brak informacji"

ARTYKUŁ:
${context.substring(0, contextLimit)}

PYTANIE: ${question}

KROK 1: Znajdź odpowiedź w artykule
KROK 2: Sprawdź czy odpowiedź zawiera skrótowce i znajdź ich rozwinięcia w artykule
KROK 3: Podaj odpowiedź z rozwiniętymi skrótami

ODPOWIEDŹ (krótka, z pełnymi nazwami zamiast skrótów):`
        }
      ];
    }

    try {
      const config: any = {
        messages,
        model
      };

      // o1 models używają max_completion_tokens zamiast max_tokens
      if (useSystemMessage) {
        config.max_tokens = maxTokens;
        config.temperature = 0;
      } else {
        // o1 models (o1-preview, o1-mini)
        config.max_completion_tokens = maxTokens;
      }

      const response = await this.completion(config) as ChatCompletion;
      const answer = response.choices[0]?.message?.content?.trim() || "";
      
      if (!answer) {
        throw new Error(`Empty response from ${model}`);
      }

      console.log(`✅ ${model} odpowiedział (${answer.length} znaków)`);
      return answer;

    } catch (error: any) {
      console.error(`❌ Błąd dla modelu ${model}:`, error?.message || error);
      
      // Cascade fallback: premium -> standard -> fallback  
      if (modelTier === 'premium' && (error?.status === 429 || error?.message?.includes('Rate limit') || error?.message?.includes('model'))) {
        console.warn(`🔄 ${model} nieudany, próbuję gpt-4o...`);
        await this.sleep(1000); // Krótka przerwa
        return this.answerQuestion(question, context, 'standard');
      }
      
      if (modelTier === 'standard' && (error?.status === 429 || error?.message?.includes('Rate limit'))) {
        console.warn(`🔄 ${model} nieudany, próbuję gpt-4o-mini...`);
        await this.sleep(2000); // Dłuższa przerwa
        return this.answerQuestion(question, context, 'fallback');
      }

      // Jeśli wszystko zawiedzie, zwróć informację o błędzie
      if (modelTier === 'fallback') {
        console.error(`💥 Wszystkie modele zawiodły dla pytania: ${question.substring(0, 50)}...`);
        return `Błąd: Nie udało się wygenerować odpowiedzi z powodu problemów technicznych (${error?.message || 'unknown error'})`;
      }

      throw error;
    }
  }
} 
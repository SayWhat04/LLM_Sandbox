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

  async extractNamesAndCities(text: string): Promise<{names: string[], cities: string[]}> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Jesteś ekspertem w analizie tekstów. Wyodrębnij z tekstu wszystkie imiona osób i nazwy miast.

ZASADY:
1. Imiona zwróć w mianowniku, bez polskich znaków, WIELKIMI LITERAMI (np. BARBARA, ALEKSANDER)
2. Miasta zwróć bez polskich znaków, WIELKIMI LITERAMI (np. KRAKOW, WARSZAWA)
3. Odpowiedź w formacie JSON: {"names": ["IMIE1", "IMIE2"], "cities": ["MIASTO1", "MIASTO2"]}
4. Nie duplikuj imion i miast`
      },
      {
        role: "user", 
        content: `Wyodrębnij imiona i miasta z tego tekstu:\n\n${text}`
      }
    ];

    const response = await this.completion({
      messages,
      model: "gpt-4o",
      jsonMode: true,
      maxTokens: 1000
    }) as ChatCompletion;

    return this.parseJsonResponse<{names: string[], cities: string[]}>(response) as {names: string[], cities: string[]};
  }
} 
import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam, ChatCompletion, ChatCompletionChunk } from "openai/resources/chat/completions";
import { createByModelName } from '@microsoft/tiktokenizer';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { Readable } from "stream";

export class OpenAIService {
  private openai: OpenAI;
  private tokenizers: Map<string, Awaited<ReturnType<typeof createByModelName>>> = new Map();
  private readonly IM_START = "<|im_start|>";
  private readonly IM_END = "<|im_end|>";
  private readonly IM_SEP = "<|im_sep|>";
  private lastRequestTime: number = 0;
  private minDelayBetweenRequests: number = 500; // 500ms między requestami

  constructor() {
    this.openai = new OpenAI();
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

  async analyzeDocumentsForKeywords(reportContent: string, reportFilename: string, factsContent: string): Promise<string> {
    console.log(`📋 Analizuję dokument: ${reportFilename}`);
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system", 
        content: `Jesteś ekspertem w analizie dokumentów bezpieczeństwa i generowaniu słów kluczowych.

ZADANIE:
Przeanalizuj raport bezpieczeństwa i powiązane fakty, a następnie wygeneruj listę słów kluczowych w języku polskim.

ZASADY GENEROWANIA SŁÓW KLUCZOWYCH:
1. Słowa kluczowe MUSZĄ być w języku polskim
2. Słowa MUSZĄ być w mianowniku (np. "nauczyciel", "programista", a nie "nauczyciela", "programistów")
3. Słowa oddzielone przecinkami bez spacji (np. słowo1,słowo2,słowo3)

4. KLUCZOWA ZASADA - GRUPOWANIE INFORMACJI O OSOBACH:
   - Jeśli w raporcie lub faktach pojawia się osoba, połącz wszystkie jej informacje w jedno słowo kluczowe
   - Przykład: jeśli raport wspomina "Aleksander Ragowski" a fakty mówią "nauczyciel języka angielskiego"
   → SŁOWO KLUCZOWE: "Aleksander Ragowski nauczyciel język angielski"
   - Grupuj: imię + nazwisko + zawód + umiejętności + cechy + działania tej osoby

5. Uwzględnij:
   - Kluczowe informacje z raportu (co się stało, gdzie, kto)
   - Informacje z nazwy pliku (sektor, data)
   - Powiązane informacje o osobach (grupowane jak wyżej)
   - Technologie/przedmioty wspomniane w raporcie i faktach (jako oddzielne słowa)
6. Bądź precyzyjny - słowa kluczowe mają dokładnie opisywać raport i powiązane informacje
7. Używaj ogólniejszych terminów gdy to zasadne (np. "zwierzęta" dla "dzikiej fauny")

WAŻNE UWAGI O ŁĄCZENIU Z FAKTAMI:
- Jeśli w raporcie pojawia się osoba, sprawdź czy w słowach kluczowych faktów są informacje o tej osobie
- Uwaga na możliwe literówki w nazwiskach (np. "Ragorski" vs "Ragowski") 
- Wykorzystaj wszystkie istotne słowa kluczowe z faktów powiązanych z raportem
- Słowa kluczowe faktów to skondensowana forma - rozwiń je jeśli potrzebne dla kontekstu raportu`
      },
      {
        role: "user",
        content: `NAZWA PLIKU RAPORTU: ${reportFilename}

TREŚĆ RAPORTU:
${reportContent}

DOSTĘPNE SŁOWA KLUCZOWE FAKTÓW (skondensowane informacje o osobach, miejscach, technologiach):
${factsContent}

ZADANIE: 
1. Przeanalizuj raport i zidentyfikuj kluczowe elementy
2. Znajdź powiązania między raportem a słowami kluczowymi faktów (osoby, miejsca, technologie)
3. WAŻNE: Jeśli w raporcie występuje osoba, znajdź wszystkie jej informacje w faktach i zgrupuj je w jedno słowo kluczowe
4. Wygeneruj słowa kluczowe uwzględniając treść raportu, nazwę pliku i powiązane słowa kluczowe faktów
5. Zwróć TYLKO listę słów kluczowych oddzielonych przecinkami (bez spacji po przecinkach)

ODPOWIEDŹ (tylko słowa kluczowe):`
      }
    ];

    try {
      const response = await this.completion({
        messages,
        model: "gpt-4o",
        maxTokens: 1000,
        temperature: 0
      }) as ChatCompletion;

      const keywords = response.choices[0]?.message?.content?.trim() || "";
      console.log(`✅ Wygenerowano słowa kluczowe dla ${reportFilename}: ${keywords.substring(0, 100)}...`);
      return keywords;

    } catch (error: any) {
      console.error(`❌ Błąd analizy dla ${reportFilename}:`, error?.message || error);
      throw error;
    }
  }


} 